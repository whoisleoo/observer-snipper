import Store from 'electron-store'

export interface StoredAuthToken {
    username: string
    minecraftAccessToken: string
    minecraftExpiresAt: number
    microsoftRefreshToken: string
}

interface TokenStoreSchema {
    auth: StoredAuthToken | null
    lastUsername: string | null
}

export interface TokenStore {
    save(token: StoredAuthToken): void
    load(): StoredAuthToken | null

    /** Apaga a sessao ativa mas MANTEM o ultimo usuario lembrado (usado quando o refresh silencioso falha). */
    clear(): void

    /** Apaga tudo, inclusive o usuario lembrado — so no Sign out explicito. */
    forget(): void

    getLastUsername(): string | null
}

export function createTokenStore(): TokenStore {
    const store = new Store<TokenStoreSchema>({
        name: 'auth',
        defaults: { auth: null, lastUsername: null },
    })

    return {
        save(token) {
            store.set('auth', token)
            store.set('lastUsername', token.username)
        },
        load() {
            return store.get('auth')
        },
        clear() {
            store.delete('auth')
        },
        forget() {
            store.delete('auth')
            store.delete('lastUsername')
        },
        getLastUsername() {
            return store.get('lastUsername')
        },
    }
}
