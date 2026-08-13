import { ipcMain } from "electron";
import { createAuthService, REDIRECT_URI } from "../services/authService";
import { openMicrosoftLoginWindow } from "../controllers/microsoftLoginWindow";
import { createTokenStore } from "../store/tokenStore";

export function registerIpcHandlers() {
    const authService = createAuthService();
    const tokenStore = createTokenStore();

    ipcMain.handle('auth:login-microsoft', async () => {
        const code = await openMicrosoftLoginWindow(authService.buildAuthorizationUrl(), REDIRECT_URI);
        const microsoftToken = await authService.exchangeAuthorizationCode(code);
        const minecraftToken = await authService.loginToMinecraft(microsoftToken.access_token);

        tokenStore.save({
            minecraftAccessToken: minecraftToken.access_token,
            minecraftExpiresAt: Date.now() + minecraftToken.expires_in * 1000,
            microsoftRefreshToken: microsoftToken.refresh_token,
        });

        return minecraftToken;
    })
}
