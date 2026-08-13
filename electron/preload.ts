import { contextBridge, ipcRenderer } from "electron";
import type { MinecraftAuthToken } from "./types/auth";

contextBridge.exposeInMainWorld("electron", {
    auth: {
        loginWithMicrosoft: () => ipcRenderer.invoke("auth:login-microsoft") as Promise<MinecraftAuthToken>,
    },
    window: {
        minimize: () => ipcRenderer.send("window:minimize"),
        toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
        close: () => ipcRenderer.send("window:close"),
        isMaximized: () => ipcRenderer.invoke("window:is-maximized") as Promise<boolean>,
        onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
            const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
            ipcRenderer.on("window:maximized-changed", listener);
            return () => ipcRenderer.removeListener("window:maximized-changed", listener);
        },
    },
});