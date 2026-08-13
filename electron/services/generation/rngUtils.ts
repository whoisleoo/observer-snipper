export function randomChoice<T>(items: T[], rng: () => number): T {
    return items[Math.floor(rng() * items.length)];
}

export function shuffled<T>(items: T[], rng: () => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
