export function stripAccents(raw: string): string {
    return raw.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}

/** "fuuuck" -> "fuck" — colapsa letra repetida em sequencia. */
export function collapseRepeats(word: string): string {
    return word.replace(/(.)\1+/g, "$1");
}
