// Modelo de ordem N (default 2): aprende quais sequencias de caracteres
// existem no corpus (en/pt) e gera nomes novos com a mesma sonoridade —
// "kova", "brine", "salta", "nerix"... 

const END = "$";
const PAD_CHAR = "^";

export interface MarkovModel {
    generate(length: number, rng?: () => number, tries?: number): string | null;

    score(name: string): number;
    sample(count: number, lengths: number[], options?: { rng?: () => number; keep?: (name: string) => boolean }): string[];

    readonly trainedOn: number;
}

export function createMarkovModel(words: string[], order = 2): MarkovModel {
    const model = new Map<string, Map<string, number>>();
    const pad = PAD_CHAR.repeat(order);

    for (const word of words) {
        const seq = pad + word + END;
        for (let i = order; i < seq.length; i++) {
            const state = seq.slice(i - order, i);
            const ch = seq[i];
            let dist = model.get(state);
            if (!dist) {
                dist = new Map<string, number>();
                model.set(state, dist);
            }
            dist.set(ch, (dist.get(ch) ?? 0) + 1);
        }
    }

    function pick(dist: Map<string, number>, rng: () => number, exclude?: string): string | null {
        const items = [...dist.entries()].filter(([c]) => c !== exclude);
        if (items.length === 0) return null;

        const total = items.reduce((acc, [, weight]) => acc + weight, 0);
        const r = rng() * total;
        let upto = 0;
        for (const [c, weight] of items) {
            upto += weight;
            if (upto >= r) return c;
        }
        return items[items.length - 1][0];
    }

    function generate(length: number, rng: () => number = Math.random, tries = 400): string | null {
        for (let attempt = 0; attempt < tries; attempt++) {
            let state = pad;
            const out: string[] = [];
            let ok = true;

            for (let i = 0; i < length; i++) {
                const dist = model.get(state);
                if (!dist) {
                    ok = false;
                    break;
                }
                const ch = pick(dist, rng, END);
                if (ch === null) {
                    ok = false;
                    break;
                }
                out.push(ch);
                state = (state + ch).slice(-order);
            }

            if (ok && model.get(state)?.has(END)) {
                return out.join("");
            }
        }
        return null;
    }

    function score(name: string): number {
        let state = pad;
        let total = 0;
        let n = 0;

        for (const ch of name + END) {
            const dist = model.get(state);
            const s = dist ? [...dist.values()].reduce((a, b) => a + b, 0) : 0;
            const p = dist?.get(ch) ?? 0;
            total += Math.log((p + 0.1) / (s + 0.1 * 30));
            n++;
            state = (state + ch).slice(-order);
        }

        return total / Math.max(n, 1);
    }

    function sample(
        count: number,
        lengths: number[],
        options: { rng?: () => number; keep?: (name: string) => boolean } = {},
    ): string[] {
        const rng = options.rng ?? Math.random;
        const out = new Set<string>();
        const per = Math.max(1, Math.floor(count / lengths.length));

        for (let li = 0; li < lengths.length; li++) {
            const length = lengths[li];
            const isLast = li === lengths.length - 1;
            const target = isLast ? count - out.size : Math.min(count - out.size, per);

            let local = 0;
            let stall = 0;
            while (local < target && stall < target * 60 + 2000) {
                const candidate = generate(length, rng);
                stall++;
                if (!candidate || out.has(candidate)) continue;
                if (options.keep && !options.keep(candidate)) continue;
                out.add(candidate);
                local++;
            }
        }

        return [...out].sort();
    }

    return { generate, score, sample, trainedOn: words.length };
}
