const NAMEMC_SEARCH_URL = "https://namemc.com/search?q=";

/* URL de busca por perfil com redirecionamento ao namemc.com */
export function buildNameMcSearchUrl(name: string): string {
    return NAMEMC_SEARCH_URL + encodeURIComponent(name);
}
