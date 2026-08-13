import Store from 'electron-store'

export interface StoredAuthToken {
    minecraftAccessToken: string
    minecraftExpiresAt: number
    microsoftRefreshToken: string
}

interface TokenStoreSchema {
    auth: StoredAuthToken | null
}

export interface TokenStore {
    save(token: StoredAuthToken): void
    load(): StoredAuthToken | null
    clear(): void
}

export function createTokenStore(): TokenStore {
    const store = new Store<TokenStoreSchema>({
        name: 'auth',
        defaults: { auth: null },
    })

    return {
        save(token) {
            store.set('auth', token)
        },
        load() {
            return store.get('auth')
        },
        clear() {
            store.delete('auth')
        },
    }
}
