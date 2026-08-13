import { shuffled } from "./rngUtils";

// Heuristica pra inserir números no lugar de palavras, exemplo: Leonardo -> 130n4rd0
const LEET_MAP: Record<string, string> = {
    o: "0",
    i: "1",
    l: "1",
    e: "3",
    a: "4",
    s: "5",
    t: "7",
    b: "8",
    g: "9",
    z: "2",
};


const MAX_LEET_POSITIONS = 12;

export function leetVariants(word: string, maxPerWord = 0, rng: () => number = Math.random): string[] {
    let positions: number[] = [];
    for (let i = 0; i < word.length; i++) {
        if (LEET_MAP[word[i]]) positions.push(i);
    }
    if (positions.length === 0) return [];
    if (positions.length > MAX_LEET_POSITIONS) positions = positions.slice(0, MAX_LEET_POSITIONS);

    const out: string[] = [];
    const totalMasks = 2 ** positions.length;

    for (let mask = 1; mask < totalMasks; mask++) {
        const chars = [...word];
        positions.forEach((pos, bit) => {
            if ((mask >> bit) & 1) chars[pos] = LEET_MAP[word[pos]];
        });
        out.push(chars.join(""));
    }

    if (maxPerWord && out.length > maxPerWord) {
        return shuffled(out, rng).slice(0, maxPerWord).sort();
    }
    return out;
}

export interface LeetVariant {
    name: string;
    origin: string;
}
export function buildLeetVariants(
    words: string[],
    maxPerWord: number,
    options: { keep?: (name: string) => boolean; rng?: () => number } = {},
): LeetVariant[] {
    const rng = options.rng ?? Math.random;
    const seen = new Set(words);
    const out: LeetVariant[] = [];

    for (const word of words) {
        for (const variant of leetVariants(word, maxPerWord, rng)) {
            if (seen.has(variant)) continue;
            seen.add(variant);
            if (options.keep && !options.keep(variant)) continue;
            out.push({ name: variant, origin: `leet:${word}` });
        }
    }

    return out;
}
