import type { AuthService } from './authService'
import type { TokenStore } from '../store/tokenStore'
import { getMinecraftProfile } from './minecraftService'

const EXPIRY_MARGIN_MS = 60_000

export interface SessionInfo {
    username: string | null
    active: boolean
}

/**
 * Restaura a sessao salva sem pedir login de novo. Se o token do Minecraft
 * ainda e valido, devolve na hora. Se expirou, usa o refresh_token da
 * Microsoft pra renovar em silencio (refaz Xbox -> XSTS -> MC). Se nem isso
 * funcionar (refresh_token revogado/expirado), a sessao ativa e apagada mas
 * o ultimo username continua lembrado, pra UI oferecer login rapido.
 */
export async function restoreSession(authService: AuthService, tokenStore: TokenStore): Promise<SessionInfo> {
    const stored = tokenStore.load()

    if (stored && Date.now() < stored.minecraftExpiresAt - EXPIRY_MARGIN_MS) {
        return { username: stored.username, active: true }
    }

    if (stored) {
        try {
            const microsoftToken = await authService.refreshMicrosoftToken(stored.microsoftRefreshToken)
            const minecraftToken = await authService.loginToMinecraft(microsoftToken.access_token)
            const profile = await getMinecraftProfile(minecraftToken.access_token)

            tokenStore.save({
                username: profile.name,
                minecraftAccessToken: minecraftToken.access_token,
                minecraftExpiresAt: Date.now() + minecraftToken.expires_in * 1000,
                microsoftRefreshToken: microsoftToken.refresh_token,
            })

            return { username: profile.name, active: true }
        } catch {
            tokenStore.clear()
        }
    }

    return { username: tokenStore.getLastUsername(), active: false }
}