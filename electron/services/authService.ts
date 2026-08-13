import axios from 'axios'
import type { MicrosoftTokenResponse, MinecraftAuthToken, XboxAuthToken } from '../types/auth'


/*
*       Agradecimento especial a comunidade de launchers 
*       open-source por mapear o ClientID oficial do launcher
*       vanilla do minecraft/mojang.
*       
*       Créditos: https://github.com/Hanro50/MSMC
*/

const CLIENT_ID = '00000000402b5328'

const AUTHORIZE_URL = 'https://login.live.com/oauth20_authorize.srf'
const TOKEN_URL = 'https://login.live.com/oauth20_token.srf'
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox'

const SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL'

export const REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf'

export interface AuthService {
    buildAuthorizationUrl(): string
    exchangeAuthorizationCode(code: string): Promise<MicrosoftTokenResponse>
    refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokenResponse>
    loginToMinecraft(microsoftAccessToken: string): Promise<MinecraftAuthToken>
}

async function requestMicrosoftToken(form: Record<string, string>): Promise<MicrosoftTokenResponse> {
    const { data } = await axios.post<MicrosoftTokenResponse>(TOKEN_URL, new URLSearchParams(form), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
}

async function authenticateXboxLive(microsoftAccessToken: string): Promise<XboxAuthToken> {
    const { data } = await axios.post<XboxAuthToken>(XBL_URL, {
        Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: `d=${microsoftAccessToken}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
    })
    return data
}

async function authorizeXsts(xboxLiveToken: XboxAuthToken): Promise<XboxAuthToken> {
    const { data } = await axios.post<XboxAuthToken>(XSTS_URL, {
        Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [xboxLiveToken.Token],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
    })
    return data
}

async function authenticateMinecraft(xstsToken: XboxAuthToken): Promise<MinecraftAuthToken> {
    const userHash = xstsToken.DisplayClaims.xui[0].uhs
    const { data } = await axios.post<MinecraftAuthToken>(MC_LOGIN_URL, {
        identityToken: `XBL3.0 x=${userHash};${xstsToken.Token}`,
    })
    return data
}

export function createAuthService(): AuthService {
    return {
        buildAuthorizationUrl() {
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                response_type: 'code',
                redirect_uri: REDIRECT_URI,
                scope: SCOPE,
                prompt: 'select_account',
            })
            return `${AUTHORIZE_URL}?${params.toString()}`
        },

        exchangeAuthorizationCode(code) {
            return requestMicrosoftToken({
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            })
        },

        refreshMicrosoftToken(refreshToken) {
            return requestMicrosoftToken({
                client_id: CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            })
        },

        async loginToMinecraft(microsoftAccessToken) {
            const xboxLiveToken = await authenticateXboxLive(microsoftAccessToken)
            const xstsToken = await authorizeXsts(xboxLiveToken)
            return authenticateMinecraft(xstsToken)
        },
    }
}
