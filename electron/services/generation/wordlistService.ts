import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";

export type WordlistLang = "en" | "pt";

const EN_WORDS_URL = "https://huggingface.co/datasets/Maximax67/English-Valid-Words/resolve/main/valid_words.txt";
const PT_ICF_URL = "https://raw.githubusercontent.com/fserb/pt-br/master/icf";

// fserb/pt-br usa ICF (frequencia inversa): quanto menor, mais comum a
// palavra ("de" = 3.02).
const PT_MAX_ICF_SCORE = 16;

const NAME_CHARS = /^[a-z0-9_]+$/;

function stripAccents(raw: string): string {
    return raw.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}

async function readCached(cacheDir: string, filename: string): Promise<string | null> {
    try {
        return await fs.readFile(path.join(cacheDir, filename), "utf-8");
    } catch {
        return null;
    }
}

async function downloadAndCache(url: string, cacheDir: string, filename: string): Promise<string> {
    const cached = await readCached(cacheDir, filename);
    if (cached !== null) return cached;

    const { data } = await axios.get<string>(url, { responseType: "text" });
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(path.join(cacheDir, filename), data, "utf-8");
    return data;
}

async function rawEnglishWords(cacheDir: string): Promise<string[]> {
    const raw = await downloadAndCache(EN_WORDS_URL, cacheDir, "words_en.txt");
    return raw.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function rawPortugueseWords(cacheDir: string): Promise<string[]> {
    const raw = await downloadAndCache(PT_ICF_URL, cacheDir, "words_pt.csv");
    const out: string[] = [];

    for (const line of raw.split("\n")) {
        const comma = line.lastIndexOf(",");
        if (comma === -1) continue;

        const word = line.slice(0, comma).trim();
        const score = Number(line.slice(comma + 1));
        if (!word || !Number.isFinite(score) || score > PT_MAX_ICF_SCORE) continue;

        out.push(word);
    }

    return out;
}

async function rawWords(lang: WordlistLang, cacheDir: string): Promise<string[]> {
    return lang === "en" ? rawEnglishWords(cacheDir) : rawPortugueseWords(cacheDir);
}

export interface WordlistService {
    loadWords(lang: WordlistLang, lengths: number[]): Promise<string[]>;
    loadCorpus(langs: WordlistLang[]): Promise<string[]>;
}

export function createWordlistService(cacheDir: string): WordlistService {
    return {
        async loadWords(lang, lengths) {
            const lengthSet = new Set(lengths);
            const words = await rawWords(lang, cacheDir);
            const out = new Set<string>();

            for (const token of words) {
                const w = stripAccents(token.toLowerCase());
                if (lengthSet.has(w.length) && NAME_CHARS.test(w)) out.add(w);
            }

            return [...out].sort();
        },

        async loadCorpus(langs) {
            const out = new Set<string>();

            for (const lang of langs) {
                const words = await rawWords(lang, cacheDir);
                for (const token of words) {
                    const w = stripAccents(token.toLowerCase());
                    if (w.length >= 3 && w.length <= 12 && /^[a-z]+$/.test(w)) out.add(w);
                }
            }

            return [...out].sort();
        },
    };
}
