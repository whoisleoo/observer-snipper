import { downloadAndCache } from "./httpCache";
import { stripAccents } from "./textUtils";

export type WordlistLang = "en" | "pt";

const EN_WORDS_URL = "https://huggingface.co/datasets/Maximax67/English-Valid-Words/resolve/main/valid_words.txt";
const PT_ICF_URL = "https://raw.githubusercontent.com/fserb/pt-br/master/icf";


const PT_MAX_ICF_SCORE = 16;

const NAME_CHARS = /^[a-z0-9_]+$/;

async function rawEnglishWords(cacheDir: string): Promise<string[]> {
    const raw = await downloadAndCache(EN_WORDS_URL, cacheDir, "words_en.txt");
    return raw.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function rawPortugueseWords(cacheDir: string, commonOnly = true): Promise<string[]> {
    const raw = await downloadAndCache(PT_ICF_URL, cacheDir, "words_pt.csv");
    const out: string[] = [];

    for (const line of raw.split("\n")) {
        const comma = line.lastIndexOf(",");
        if (comma === -1) continue;

        const word = line.slice(0, comma).trim();
        const score = Number(line.slice(comma + 1));
        if (!word || !Number.isFinite(score)) continue;
        if (commonOnly && score > PT_MAX_ICF_SCORE) continue;

        out.push(word);
    }

    return out;
}

async function rawWords(lang: WordlistLang, cacheDir: string, commonOnly = true): Promise<string[]> {
    return lang === "en" ? rawEnglishWords(cacheDir) : rawPortugueseWords(cacheDir, commonOnly);
}

async function normalizedWordSet(lang: WordlistLang, cacheDir: string, commonOnly = true): Promise<Set<string>> {
    const words = await rawWords(lang, cacheDir, commonOnly);
    const out = new Set<string>();

    for (const token of words) {
        const w = stripAccents(token.toLowerCase());
        if (NAME_CHARS.test(w)) out.add(w);
    }

    return out;
}


export async function loadWordSet(lang: WordlistLang, cacheDir: string): Promise<Set<string>> {
    return normalizedWordSet(lang, cacheDir, false);
}

export interface WordlistService {
    loadWords(lang: WordlistLang, lengths: number[]): Promise<string[]>;

    loadCorpus(langs: WordlistLang[]): Promise<string[]>;
}

export function createWordlistService(cacheDir: string): WordlistService {
    return {
        async loadWords(lang, lengths) {
            const lengthSet = new Set(lengths);
            const all = await normalizedWordSet(lang, cacheDir);
            return [...all].filter((w) => lengthSet.has(w.length)).sort();
        },

        async loadCorpus(langs) {
            const out = new Set<string>();

            for (const lang of langs) {
                const all = await normalizedWordSet(lang, cacheDir);
                for (const w of all) {
                    if (w.length >= 3 && w.length <= 12 && /^[a-z]+$/.test(w)) out.add(w);
                }
            }

            return [...out].sort();
        },
    };
}
