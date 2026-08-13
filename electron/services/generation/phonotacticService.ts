import { randomChoice, shuffled } from "./rngUtils";

const VOWELS = "aeiou";
const VOWELS_SOFT = VOWELS + "y";

// Podem ABRIR uma palavra.
const ONSETS_2 = new Set([
    "bl", "br", "ch", "cl", "cr", "dr", "dw", "fl", "fr", "gl", "gn", "gr",
    "kl", "kn", "kr", "kw", "ph", "pl", "pr", "ps", "qu", "rh", "sc", "sh",
    "sk", "sl", "sm", "sn", "sp", "st", "sv", "sw", "th", "tr", "ts", "tw",
    "vl", "vr", "wh", "wr", "zh",
]);
const ONSETS_3 = new Set(["chr", "phr", "sch", "scr", "shr", "spl", "spr", "str", "thr"]);

// Podem FECHAR uma palavra.
const CODAS_2 = new Set([
    "ch", "ck", "ct", "ff", "ft", "gs", "ks", "ld", "lf", "lk", "ll", "lm",
    "lp", "ls", "lt", "mb", "mp", "ms", "nc", "nd", "ng", "nk", "ns", "nt",
    "ph", "ps", "pt", "rb", "rc", "rd", "rf", "rg", "rk", "rl", "rm", "rn",
    "rp", "rs", "rt", "rv", "sh", "sk", "sm", "sp", "ss", "st", "th", "ts",
    "tt", "xt", "zz", "ds", "bs", "nh", "lh", "nx", "rx", "lx", "gh", "gn",
]);
const CODAS_3 = new Set([
    "cks", "cts", "lds", "lks", "lts", "mps", "nch", "nds", "ngs", "nks",
    "nts", "rch", "rds", "rks", "rms", "rns", "rps", "rst", "rth", "rts",
    "sks", "sps", "sts", "pts", "lms", "lps",
]);

const MEDIAL_ONLY_2 = new Set([
    "bb", "cc", "dd", "gg", "mm", "nn", "pp", "rr", "tt", "ff", "ll", "ss",
    "zz", "mn", "tl", "dl", "gm", "bt", "pn", "km", "sb", "sd", "sg", "sq",
    "rq", "lc", "lg", "lv", "lb", "nf", "nv", "nz", "rz", "lz", "sn", "sm",
]);
const MEDIAL_2 = new Set([...ONSETS_2, ...CODAS_2, ...MEDIAL_ONLY_2]);
const MEDIAL_3 = new Set([
    ...ONSETS_3,
    ...CODAS_3,
    "ldr", "mbr", "mpl", "mpr", "ncr", "ndr", "ngr", "nkl", "nst", "ntr",
    "rbl", "rgr", "rpr", "rtr", "ktr", "str", "mbl", "ngl", "rfl", "rkl",
]);

const BAD_VOWEL_2 = new Set(["aa", "ii", "uu", "yy", "iy", "yi", "uy", "yu"]);
const VOWEL_RUNS_3 = new Set([
    "eau", "iou", "eou", "aia", "eia", "oia", "uia", "aio", "eio", "uai",
    "uei", "iei", "oai", "aiu", "eua",
]);

interface Run {
    text: string;
    isVowel: boolean;
}

function splitRuns(name: string): Run[] {
    const runs: Run[] = [];
    for (const ch of name) {
        const isVowel = VOWELS_SOFT.includes(ch);
        const last = runs[runs.length - 1];
        if (last && last.isVowel === isVowel) {
            last.text += ch;
        } else {
            runs.push({ text: ch, isVowel });
        }
    }
    return runs;
}

/*
 * Heuristica: da pra falar isso em voz alta sem soletrar?
 * Checa cada bloco de consoantes contra a lista certa pra POSICAO em que
 * ele aparece: inicio, meio ou fim da palavra. 
 */
export function isPronounceable(name: string): boolean {
    const n = name.toLowerCase();
    if (!/^[a-z]+$/.test(n)) return false;
    if (![...n].some((c) => VOWELS_SOFT.includes(c))) return false;

    const runs = splitRuns(n);
    const last = runs.length - 1;

    for (let i = 0; i < runs.length; i++) {
        const { text: run, isVowel } = runs[i];

        if (isVowel) {
            if (run.length === 2 && BAD_VOWEL_2.has(run)) return false;
            if (run.length === 3 && !VOWEL_RUNS_3.has(run)) return false;
            if (run.length > 3) return false;
            continue;
        }

        if (run.length === 1) continue;
        if (run.length > 3) return false;

        const inicio = i === 0;
        const fim = i === last;
        if (inicio && fim) return false; // nome so de consoante

        let allowed: Set<string>;
        if (inicio) allowed = run.length === 2 ? ONSETS_2 : ONSETS_3;
        else if (fim) allowed = run.length === 2 ? CODAS_2 : CODAS_3;
        else allowed = run.length === 2 ? MEDIAL_2 : MEDIAL_3;

        if (!allowed.has(run)) return false;
    }

    return true;
}

// --------------------------------------------------------------------- //
// Gerador deterministico: monta a palavra direto a partir das tabelas
// acima em vez de gerar aleatorio e filtrar depois (como o markov faz).
// --------------------------------------------------------------------- //

const CONSONANT_LETTERS = [..."abcdefghijklmnopqrstuvwxyz"].filter((c) => !VOWELS_SOFT.includes(c));

const VOWEL_RUNS_2 = new Set(
    [...VOWELS_SOFT].flatMap((a) => [...VOWELS_SOFT].map((b) => a + b)).filter((pair) => !BAD_VOWEL_2.has(pair)),
);

type Position = "start" | "middle" | "end";
type RunKind = "consonant" | "vowel";


function consonantsOnly(cluster: string): boolean {
    return ![...cluster].some((c) => VOWELS_SOFT.includes(c));
}

function legalConsonantRuns(length: number, position: Position): string[] {
    if (length === 1) return CONSONANT_LETTERS;
    if (position === "start") return [...(length === 2 ? ONSETS_2 : ONSETS_3)].filter(consonantsOnly);
    if (position === "end") return [...(length === 2 ? CODAS_2 : CODAS_3)].filter(consonantsOnly);
    return [...(length === 2 ? MEDIAL_2 : MEDIAL_3)].filter(consonantsOnly);
}

function legalVowelRuns(length: number): string[] {
    if (length === 1) return [...VOWELS_SOFT];
    if (length === 2) return [...VOWEL_RUNS_2];
    if (length === 3) return [...VOWEL_RUNS_3];
    return [];
}

function tryBuild(length: number, rng: () => number): string | null {
    const parts: string[] = [];
    let remaining = length;
    let kind: RunKind = rng() < 0.5 ? "consonant" : "vowel";
    let isFirst = true;

    while (remaining > 0) {
        const candidateLengths = shuffled([1, 2, 3].filter((n) => n <= remaining), rng);
        let placed = false;

        for (const runLength of candidateLengths) {
            const isLast = runLength === remaining;
            if (isFirst && isLast && kind === "consonant") continue; // nome so de consoante

            const position: Position = isFirst ? "start" : isLast ? "end" : "middle";
            const options = kind === "consonant" ? legalConsonantRuns(runLength, position) : legalVowelRuns(runLength);
            if (options.length === 0) continue;

            parts.push(randomChoice(options, rng));
            remaining -= runLength;
            isFirst = false;
            kind = kind === "consonant" ? "vowel" : "consonant";
            placed = true;
            break;
        }

        if (!placed) return null;
    }

    return parts.join("");
}

export function generatePronounceableName(length: number, rng: () => number = Math.random): string | null {
    for (let attempt = 0; attempt < 50; attempt++) {
        const word = tryBuild(length, rng);
        if (word) return word;
    }
    return null;
}

export function samplePronounceableNames(
    count: number,
    lengths: number[],
    rng: () => number = Math.random,
): string[] {
    const out = new Set<string>();
    let stall = 0;

    while (out.size < count && stall < count * 50 + 500) {
        const length = randomChoice(lengths, rng);
        const word = generatePronounceableName(length, rng);
        stall++;
        if (word && !out.has(word)) out.add(word);
    }

    return [...out].sort();
}
