import { downloadAndCache } from "./httpCache";
import { collapseRepeats, stripAccents } from "./textUtils";
import { loadWordSet, type WordlistLang } from "./wordlistService";

export type BadwordsMode = "smart" | "strict" | "off";
export type BadwordsLang = WordlistLang;

const BADWORDS_URLS: Record<BadwordsLang, string> = {
    en: "https://raw.githubusercontent.com/LDNOOBWV2/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words_V2/main/data/en.txt",
    pt: "https://raw.githubusercontent.com/LDNOOBWV2/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words_V2/main/data/pt.txt",
};


const BUILTIN_BADWORDS = [
    "anal", "anus", "arse", "ass", "bitch", "boob", "butt", "clit", "cock",
    "crap", "cum", "cunt", "dick", "dildo", "fuck", "jizz", "nazi", "penis",
    "piss", "poop", "porn", "pube", "pussy", "rape", "scat", "semen", "sex",
    "shit", "slut", "suck", "tit", "turd", "twat", "vagin", "wank", "whore",
    "xxx", "nigga", "nigger", "pedo", "faggot",
    
    // Portugues:
    "boceta", "bosta", "buceta", "cacete", "caralho", "chupa", "corno",
    "foda", "foder", "merda", "pinto", "piroca", "porra", "punheta", "puta",
    "puto", "rola", "tesao", "viado", "xoxota", "penis"
];

// Falso positivo
const BUILTIN_ALLOWLIST = [
    "pass", "bass", "mass", "lass", "sass", "cass", "tass", "wass", "hass",
    "bras", "brass", "class", "grass", "glass", "asset", "assai",
    "tito", "tita", "titi", "titan", "paus", "pauta", "cuia", "cume",
    "cura", "cuca", "curo", "cuco", "suco", "sucr", "asso", "assa",
];

const DELEET: Record<string, string[]> = {
    "0": ["o"],
    "1": ["i", "l"],
    "2": ["z"],
    "3": ["e"],
    "4": ["a"],
    "5": ["s"],
    "6": ["g"],
    "7": ["t"],
    "8": ["b"],
    "9": ["g"],
    _: [""],
};
const MAX_DELEET_VARIANTS = 96;

function cartesianProduct(slots: string[][]): string[] {
    return slots.reduce<string[]>((acc, slot) => acc.flatMap((prefix) => slot.map((s) => prefix + s)), [""]);
}

export function deleetVariants(name: string): Set<string> {
    const variants = new Set<string>([name]);
    const slots = [...name].map((ch) => DELEET[ch] ?? [ch]);
    const spaceSize = slots.reduce((acc, s) => acc * s.length, 1);

    if (spaceSize > 0 && spaceSize <= MAX_DELEET_VARIANTS) {
        for (const combo of cartesianProduct(slots)) variants.add(combo);
    } else {
        variants.add(slots.map((s) => s[0]).join(""));
    }

    for (const v of [...variants]) variants.add(collapseRepeats(v));
    variants.delete("");
    return variants;
}

export interface BadwordsService {
    hit(name: string): string | null;
    size(): number;
}

function normalizeTerm(raw: string): string {
    const stripped = stripAccents(raw.trim().toLowerCase());
    return [...stripped].filter((c) => /[a-z0-9]/.test(c)).join("");
}


export function createBadwordsService(
    terms: Iterable<string>,
    options: { mode?: BadwordsMode; allow?: Iterable<string>; escalate?: Iterable<string> } = {},
): BadwordsService {
    const mode = options.mode ?? "smart";
    const allow = new Set([...(options.allow ?? [])].map((a) => a.toLowerCase()));
    const termsList = [...terms];
    const short = new Set<string>();
    const long = new Set<string>();

    for (const raw of options.escalate ?? termsList) {
        const t = normalizeTerm(raw);
        if (t.length < 3) continue;
        (t.length === 3 ? short : long).add(t);
    }

    return {
        size() {
            return termsList.length;
        },

        hit(name) {
            if (mode === "off") return null;
            const low = name.toLowerCase();
            if (allow.has(low)) return null;

            for (const variant of deleetVariants(low)) {
                if (allow.has(variant)) continue;

                for (const term of long) {
                    if (variant.includes(term)) return term;
                }

                for (const term of short) {
                    if (variant === term) return term;
                    if (mode === "strict") {
                        if (variant.includes(term)) return term;
                    } else if (variant.length <= 4 && (variant.startsWith(term) || variant.endsWith(term))) {
                        return term;
                    }
                }
            }

            return null;
        },
    };
}

function termsSafeAgainstDictionary(candidates: Map<string, string>, dictionary: Set<string>): string[] {
    const byLength = new Map<number, Set<string>>();
    for (const normalized of candidates.keys()) {
        const set = byLength.get(normalized.length) ?? new Set<string>();
        set.add(normalized);
        byLength.set(normalized.length, set);
    }

    const collided = new Set<string>();
    for (const word of dictionary) {
        for (const [len, set] of byLength) {
            if (len > word.length) continue;
            for (let i = 0; i + len <= word.length; i++) {
                const sub = word.slice(i, i + len);
                if (set.has(sub)) collided.add(sub);
            }
        }
    }

    const safe: string[] = [];
    for (const [normalized, raw] of candidates) {
        if (!collided.has(normalized)) safe.push(raw);
    }
    return safe;
}

export async function loadBadwords(
    langs: BadwordsLang[],
    cacheDir: string,
    mode: BadwordsMode = "smart",
): Promise<BadwordsService> {
    if (mode === "off" || langs.length === 0) {
        return createBadwordsService(BUILTIN_BADWORDS, { mode: mode === "off" ? "off" : mode, allow: BUILTIN_ALLOWLIST });
    }

    const terms = new Set(BUILTIN_BADWORDS);
    const dictionary = new Set<string>();
    const candidates = new Map<string, string>();

    for (const lang of langs) {
        const [raw, words] = await Promise.all([
            downloadAndCache(BADWORDS_URLS[lang], cacheDir, `badwords_${lang}.txt`),
            loadWordSet(lang, cacheDir),
        ]);

        for (const w of words) dictionary.add(w);

        for (const line of raw.split("\n")) {
            const t = line.trim();
            if (!t) continue;
            terms.add(t);

            const normalized = normalizeTerm(t);
            if (normalized.length >= 4) candidates.set(normalized, t);
        }
    }

    const escalate = new Set(BUILTIN_BADWORDS.map(normalizeTerm));
    for (const raw of termsSafeAgainstDictionary(candidates, dictionary)) escalate.add(raw);

    return createBadwordsService(terms, { mode, allow: BUILTIN_ALLOWLIST, escalate });
}
