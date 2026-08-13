import type { IpcMain } from "electron";
import type { NickController } from "../controllers/nickController";

export function registerIpcHandlers(ipcMain: IpcMain, nickController: NickController): void {
    throw new Error('TODO: ipcMain.handle("nick:check", ...) etc.');
}
