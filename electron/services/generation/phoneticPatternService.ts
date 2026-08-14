
/*      Templates foneticos tipo "cvcv"/"ccvc": c=consoante v=vogal l=letra
*       d=digito x=qualquer caractere de nick, ou um literal a-z/0-9/_.
*/

const VOWELS = "aeiou";
const DIGITS = "0123456789";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const CONSONANTS = [...LOWERCASE].filter((c) => !VOWELS.includes(c)).join("");
const NAME_CHARS = LOWERCASE + DIGITS + "_";

const PATTERN_CLASSES: Record<string, string> = {
    c: CONSONANTS,
    v: VOWELS,
    l: LOWERCASE,
    d: DIGITS,
    x: NAME_CHARS,
};

function patternSlots(pattern: string): string[] {
    const slots: string[] = [];
    for (const ch of pattern.trim().toLowerCase()) {
        if (PATTERN_CLASSES[ch]) {
            slots.push(PATTERN_CLASSES[ch]);
        } else if (NAME_CHARS.includes(ch)) {
            slots.push(ch); // literal
        } else {
            throw new Error(`Caractere de padrao desconhecido: "${ch}". Use c/v/l/d/x ou um literal a-z 0-9 _`);
        }
    }
    return slots;
}

export function patternSpace(pattern: string): number {
    return patternSlots(pattern).reduce((acc, slot) => acc * slot.length, 1);
}

function* cartesianProduct(slots: string[]): Generator<string> {
    if (slots.length === 0) {
        yield "";
        return;
    }
    const [first, ...rest] = slots;
    for (const ch of first) {
        for (const suffix of cartesianProduct(rest)) {
            yield ch + suffix;
        }
    }
}

export function iterPattern(pattern: string): Generator<string> {
    return cartesianProduct(patternSlots(pattern));
}

export function samplePattern(pattern: string, count: number, rng: () => number = Math.random): string[] {
    const slots = patternSlots(pattern);
    const space = slots.reduce((acc, slot) => acc * slot.length, 1);

    if (count >= space) {
        return [...cartesianProduct(slots)].sort();
    }

    const out = new Set<string>();
    let tries = 0;
    while (out.size < count && tries < count * 500) {
        out.add(slots.map((slot) => slot[Math.floor(rng() * slot.length)]).join(""));
        tries++;
    }
    return [...out].sort();
}

export function matchPattern(name: string, pattern: string): boolean {
    const slots = patternSlots(pattern);
    if (name.length !== slots.length) return false;
    const low = name.toLowerCase();
    return [...low].every((ch, i) => slots[i].includes(ch));
}
