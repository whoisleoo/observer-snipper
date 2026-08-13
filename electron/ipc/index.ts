import { ipcMain, type IpcMain } from "electron";
import { loadConfig } from "../config/env";
import { createAuthService, REDIRECT_URI } from "../services/authService";
import { openMicrosoftLoginWindow } from "../controllers/microsoftLoginWindow";
import type { NickController } from "../controllers/nickController";

export function registerIpcHandlers() {
    const config = loadConfig()
    const authService = createAuthService(config.auth);

    ipcMain.handle('auth:login-microsoft', async() => {
        const code = await openMicrosoftLoginWindow(authService.buildAuthorizationUrl(), REDIRECT_URI);
        const microsoftToken = await authService.exchangeAuthorizationCode(code);
        return authService.loginToMinecraft(microsoftToken.access_token)
    })
}
