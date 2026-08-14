import { app, ipcMain, shell } from "electron";
import path from "node:path";
import { loadConfig } from "../config/env";
import { createAuthService, REDIRECT_URI } from "../services/authService";
import { openMicrosoftLoginWindow } from "../controllers/microsoftLoginWindow";
import { createTokenStore } from "../store/tokenStore";
import { getMinecraftProfile } from "../services/minecraftService";
import { restoreSession } from "../services/sessionService";
import { createMojangService } from "../services/mojangService";
import { createRateLimiter } from "../services/rateLimiter";
import { buildNameMcSearchUrl } from "../services/namemcService";
import { connect } from "../database/connection";
import { createCandidateRepository } from "../database/repositories/candidateRepository";
import { createNickController, type SearchOptions } from "../controllers/nickController";

export function registerIpcHandlers() {
    const config = loadConfig();
    const authService = createAuthService();
    const tokenStore = createTokenStore();

    const databasePath = path.isAbsolute(config.databasePath)
        ? config.databasePath
        : path.join(app.getPath("userData"), config.databasePath);
    const db = connect(databasePath);
    const candidateRepository = createCandidateRepository(db);

    const bulkRateLimiter = createRateLimiter(config.rateLimit.bulk.maxRequests, config.rateLimit.bulk.windowMs);
    const verifyRateLimiter = createRateLimiter(config.rateLimit.verify.maxRequests, config.rateLimit.verify.windowMs);
    const mojangService = createMojangService(config.mojang, bulkRateLimiter, verifyRateLimiter);

    const cacheDir = path.join(app.getPath("userData"), "wordcache");
    const nickController = createNickController(mojangService, candidateRepository, cacheDir);

    ipcMain.handle('auth:login-microsoft', async () => {
        const code = await openMicrosoftLoginWindow(authService.buildAuthorizationUrl(), REDIRECT_URI);
        const microsoftToken = await authService.exchangeAuthorizationCode(code);
        const minecraftToken = await authService.loginToMinecraft(microsoftToken.access_token);
        const profile = await getMinecraftProfile(minecraftToken.access_token);

        tokenStore.save({
            username: profile.name,
            minecraftAccessToken: minecraftToken.access_token,
            minecraftExpiresAt: Date.now() + minecraftToken.expires_in * 1000,
            microsoftRefreshToken: microsoftToken.refresh_token,
        });

        return { username: profile.name };
    })

    ipcMain.handle('auth:get-session', () => {
        return restoreSession(authService, tokenStore);
    })

    ipcMain.handle('auth:logout', () => {
        tokenStore.forget();
    })

    ipcMain.handle('nick:search', (_event, options: SearchOptions) => {
        return nickController.search(options);
    })

    ipcMain.handle('nick:preview', (_event, options: SearchOptions) => {
        return nickController.preview(options);
    })

    ipcMain.handle('nick:run-bulk-check', (event, length?: number) => {
        return nickController.runBulkCheck(length, (progress) => {
            event.sender.send('nick:bulk-progress', progress);
        });
    })

    ipcMain.handle('nick:run-verify', (event, options?: { length?: number; limit?: number }) => {
        const session = tokenStore.load();
        if (!session) {
            throw new Error('Not signed in.');
        }
        return nickController.runVerify(session.minecraftAccessToken, options, (progress) => {
            event.sender.send('nick:verify-progress', progress);
        });
    })

    ipcMain.handle('nick:list', () => {
        return nickController.list();
    })

    ipcMain.handle('nick:clear', () => {
        return nickController.clearDatabase();
    })

    ipcMain.handle('nick:open-namemc', (_event, name: string) => {
        shell.openExternal(buildNameMcSearchUrl(name));
    })

    ipcMain.handle('config:get-rate-limits', () => {
        return config.rateLimit;
    })
}
