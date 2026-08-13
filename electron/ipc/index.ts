import { ipcMain } from "electron";
import { createAuthService, REDIRECT_URI } from "../services/authService";
import { openMicrosoftLoginWindow } from "../controllers/microsoftLoginWindow";

export function registerIpcHandlers() {
    const authService = createAuthService();

    ipcMain.handle('auth:login-microsoft', async () => {
        const code = await openMicrosoftLoginWindow(authService.buildAuthorizationUrl(), REDIRECT_URI);
        const microsoftToken = await authService.exchangeAuthorizationCode(code);
        return authService.loginToMinecraft(microsoftToken.access_token)
    })
}
