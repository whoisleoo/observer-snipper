export interface MicrosoftTokenResponse {
    token_type: string
    scope: string
    expires_in: number
    access_token: string
    refresh_token: string
}

export interface XboxAuthToken {
    Token: string
    DisplayClaims: {
        xui: Array<{ uhs: string }>
    }
}

export interface MinecraftAuthToken {
    access_token: string
    token_type: string
    expires_in: number
}
