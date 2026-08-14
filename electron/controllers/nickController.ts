import type { CandidateRepository } from "../database/repositories/candidateRepository";
import type { Candidate, NewCandidate } from "../models/Candidate";
import {
    AccountSuspendedError,
    TokenInvalidError,
    type BulkProgressCallback,
    type BulkProgressEvent,
    type MojangService,
} from "../services/mojangService";
import { createWordlistService, type WordlistLang } from "../services/generation/wordlistService";
import { loadBadwords, type BadwordsLang, type BadwordsMode } from "../services/generation/badwordsService";
import { buildLeetVariants } from "../services/generation/leetspeakService";
import { isPronounceable, samplePronounceableNames } from "../services/generation/phonotacticService";
import { patternSpace, samplePattern } from "../services/generation/phoneticPatternService";
import { createMarkovModel } from "../services/generation/markovService";

const RANDOM_NAME_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_";

const PATTERN_SPACE_CAP = 200_000;

function randomNames(count: number, lengths: number[], exclude: Set<string>, rng: () => number): string[] {
    const out = new Set<string>();
    let tries = 0;
    while (out.size < count && tries < count * 500 + 1000) {
        const length = lengths[Math.floor(rng() * lengths.length)];
        let name = "";
        for (let i = 0; i < length; i++) name += RANDOM_NAME_CHARS[Math.floor(rng() * RANDOM_NAME_CHARS.length)];
        tries++;
        if (!exclude.has(name) && !out.has(name)) out.add(name);
    }
    return [...out];
}

export interface SearchOptions {
    lengths: number[];
    wordLangs?: WordlistLang[];
    leetMaxPerWord?: number;
    patterns?: Array<{ pattern: string; max?: number }>;
    markov?: { count: number; order?: number; langs?: WordlistLang[] };
    deterministic?: number;
    random?: number;
    badwords?: { langs: BadwordsLang[]; mode?: BadwordsMode };
    clean?: boolean;
    pronounceable?: boolean;
    rng?: () => number;
}

export interface SearchResult {
    generated: number;
    persisted: number;
}

export interface PreviewResult {
    total: number;
    bySource: Record<string, number>;
}

export interface BulkCheckResult {
    checked: number;
    free: number;
    taken: number;
}

export interface VerifyResult {
    verified: number;
    available: string[];
}

export interface VerifyProgressEvent {
    checked: number;
    total: number;
    available: number;
    paused: boolean;
    pausedUntil?: number;
}

export type VerifyProgressCallback = (event: VerifyProgressEvent) => void;

export type { BulkProgressEvent, BulkProgressCallback };

export interface NickController {
    search(options: SearchOptions): Promise<SearchResult>;
    preview(options: SearchOptions): Promise<PreviewResult>;

    runBulkCheck(length?: number, onProgress?: BulkProgressCallback): Promise<BulkCheckResult>;
    runVerify(
        token: string,
        options?: { length?: number; limit?: number },
        onProgress?: VerifyProgressCallback,
    ): Promise<VerifyResult>;
    list(): Candidate[];

    clearDatabase(): void;
}


async function generateCandidates(options: SearchOptions, cacheDir: string): Promise<Map<string, NewCandidate>> {
    const rng = options.rng ?? Math.random;

    const badwordsService = options.badwords
        ? await loadBadwords(options.badwords.langs, cacheDir, options.badwords.mode)
        : null;

    const keep = (name: string): boolean => {
        if (options.clean && !/^[a-z]+$/.test(name)) return false;
        if (options.pronounceable && !isPronounceable(name)) return false;
        if (badwordsService?.hit(name)) return false;
        return true;
    };

    const found = new Map<string, NewCandidate>();
    const addCandidate = (name: string, origin: string, qualityScore: number | null = null) => {
        if (!found.has(name) && keep(name)) {
            found.set(name, { name, origin, qualityScore });
        }
    };

    let words: string[] = [];
    if (options.wordLangs?.length) {
        const wordlistService = createWordlistService(cacheDir);
        for (const lang of options.wordLangs) {
            const langWords = await wordlistService.loadWords(lang, options.lengths);
            words = words.concat(langWords);
            for (const word of langWords) addCandidate(word, `word:${lang}`);
        }
    }

    if (options.leetMaxPerWord && words.length > 0) {
        for (const variant of buildLeetVariants(words, options.leetMaxPerWord, { keep, rng })) {
            addCandidate(variant.name, variant.origin);
        }
    }

    for (const { pattern, max } of options.patterns ?? []) {
        const space = patternSpace(pattern);
        const effectiveMax = max ?? Math.min(space, PATTERN_SPACE_CAP);
        for (const name of samplePattern(pattern, effectiveMax, rng)) {
            addCandidate(name, `pattern:${pattern}`);
        }
    }

    if (options.deterministic) {
        for (const name of samplePronounceableNames(options.deterministic, options.lengths, rng)) {
            addCandidate(name, "deterministic");
        }
    }

    if (options.markov) {
        const wordlistService = createWordlistService(cacheDir);
        const corpus = await wordlistService.loadCorpus(options.markov.langs ?? ["en", "pt"]);
        const model = createMarkovModel(corpus, options.markov.order ?? 2);
        for (const name of model.sample(options.markov.count, options.lengths, { rng, keep })) {
            addCandidate(name, "markov", model.score(name));
        }
    }

    if (options.random) {
        const existing = new Set(found.keys());
        for (const name of randomNames(options.random, options.lengths, existing, rng)) {
            addCandidate(name, "random");
        }
    }

    return found;
}

export function createNickController(
    mojangService: MojangService,
    candidateRepository: CandidateRepository,
    cacheDir: string,
): NickController {
    return {
        async search(options) {
            const found = await generateCandidates(options, cacheDir);
            const candidates = [...found.values()];
            const persisted = candidateRepository.add(candidates);

            return { generated: candidates.length, persisted };
        },

        async preview(options) {
            const found = await generateCandidates(options, cacheDir);
            const bySource: Record<string, number> = {};
            for (const candidate of found.values()) {
                const key = candidate.origin.split(":")[0];
                bySource[key] = (bySource[key] ?? 0) + 1;
            }
            return { total: found.size, bySource };
        },

        async runBulkCheck(length, onProgress) {
            const pending = candidateRepository.pendingBulkCheck(length);
            if (pending.length === 0) return { checked: 0, free: 0, taken: 0 };

            const results = await mojangService.lookupBulk(
                pending.map((c) => c.name),
                onProgress,
            );

            let free = 0;
            let taken = 0;
            for (const result of results) {
                candidateRepository.markBulkChecked(result.name, result.status);
                if (result.status === "free") free++;
                else taken++;
            }

            return { checked: results.length, free, taken };
        },

        async runVerify(token, options = {}, onProgress) {
            const pending = candidateRepository.pendingVerify(options.length);
            const limited = options.limit ? pending.slice(0, options.limit) : pending;
            const total = limited.length;

            const available: string[] = [];
            let verified = 0;
            let attempted = 0;

            for (const candidate of limited) {
                try {
                    const status = await mojangService.checkAvailability(candidate.name, token, (pausedUntil) => {
                        onProgress?.({ checked: attempted, total, available: available.length, paused: true, pausedUntil });
                    });
                    candidateRepository.markVerified(candidate.name, status);
                    verified++;
                    if (status === "AVAILABLE") available.push(candidate.name);
                } catch (error) {
                    if (error instanceof TokenInvalidError || error instanceof AccountSuspendedError) {
                        throw error;
                    }
                } finally {
                    attempted++;
                    onProgress?.({ checked: attempted, total, available: available.length, paused: false });
                }
            }

            return { verified, available };
        },

        list() {
            return candidateRepository.list();
        },

        clearDatabase() {
            candidateRepository.clear();
        },
    };
}
