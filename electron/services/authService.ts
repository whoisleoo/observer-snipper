import axios from 'axios'
import type { AppConfig } from '../config/env'
import type { MicrosoftTokenResponse, MinecraftAuthToken, XboxAuthToken } from '../types/auth'

const AUTHORIZE_URL =
const TOKEN_URL =
const XBL_URL = 
const XSTS_URL =
const MC_LOGIN_URL = 

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