import axios from 'axios'
import type { AppConfig } from '../config/env'
import type { MicrosoftTokenResponse, MinecraftAuthToken, XboxAuthToken } from '../types/auth'

const AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox'

const SCOPE = 'XboxLive.signin offline_access';

/*
* Microsoft não reserva URI para apps nativos.
* A ideia é que o servidor intercepte a janela de login.
*/
export const REDIRECT_URI = 'https://login.microsoftonline.com/common/oauth2/nativeclient'

export interface AuthService {
     buildAuthorizationUrl(): string
    exchangeAuthorizationCode(code: string): Promise<MicrosoftTokenResponse>
    refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokenResponse>
    loginToMinecraft(microsoftAccessToken: string): Promise<MinecraftAuthToken>
}

// Formatação correta de chave-valor pra string
async function requestMicrosoftToken(form: Record<string, string>): Promise<MicrosoftTokenResponse> {
    const { data } = await axios.post<MicrosoftTokenResponse>(TOKEN_URL, new URLSearchParams(form), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
    })
    return data;
}

async function authenticateXboxLive(microsoftAccessToken: string): Promise<XboxAuthToken> {
    const { data } = await axios.post<XboxAuthToken>(XBL_URL, {
        Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${microsoftAccessToken}`,
    },
        RelayingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
    })
    return data;
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
    return data;
}

async function authenticateMinecraft(xstsToken: XboxAuthToken): Promise<MinecraftAuthToken> {
    const userHash = xstsToken.DisplayClaims.xui[0].uhs
    const { data } = await axios.post<MinecraftAuthToken>(MC_LOGIN_URL, {
    identityToken: `XBL3.0 x=${userHash};${xstsToken.Token}`,
    })
return data
}


export function createAuthService(config: AppConfig['auth']): AuthService{
    return{
        buildAuthorizationUrl() {
        const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPE,
        prompt: 'select_account',
    })
    return `${AUTHORIZE_URL}?${params.toString()}`;
    },

    exchangeAuthorizationCode(code){
        return requestMicrosoftToken({
        client_id: config.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
    })
    },

    refreshMicrosoftToken(refreshToken){
    return requestMicrosoftToken({
    client_id: config.clientId,
     grand_type: 'refresh_token',
     refresh_token: refreshToken,
     })
 },

    async loginToMinecraft(microsoftAccessToken){
        const xboxLiveToken = await authenticateXboxLive(microsoftAccessToken);
        const xstsToken = await authorizeXsts(xboxLiveToken);
        return authenticateMinecraft(xstsToken);

    },
 }
}