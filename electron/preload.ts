import { contextBridge, ipcRenderer } from "electron";
import type {
    BulkCheckResult,
    BulkProgressEvent,
    PreviewResult,
    SearchOptions,
    SearchResult,
    VerifyProgressEvent,
    VerifyResult,
} from "./controllers/nickController";
import type { Candidate } from "./models/Candidate";
import type { AppConfig } from "./config/env";

interface LoginResult {
    username: string;
}

interface SessionInfo {
    username: string | null;
    active: boolean;
}

contextBridge.exposeInMainWorld("electron", {
    auth: {
        loginWithMicrosoft: () => ipcRenderer.invoke("auth:login-microsoft") as Promise<LoginResult>,
        getSession: () => ipcRenderer.invoke("auth:get-session") as Promise<SessionInfo>,
        logout: () => ipcRenderer.invoke("auth:logout") as Promise<void>,
    },
    nick: {
        search: (options: SearchOptions) => ipcRenderer.invoke("nick:search", options) as Promise<SearchResult>,
        preview: (options: SearchOptions) => ipcRenderer.invoke("nick:preview", options) as Promise<PreviewResult>,
        runBulkCheck: (length?: number) => ipcRenderer.invoke("nick:run-bulk-check", length) as Promise<BulkCheckResult>,
        runVerify: (options?: { length?: number; limit?: number }) =>
            ipcRenderer.invoke("nick:run-verify", options) as Promise<VerifyResult>,
        list: () => ipcRenderer.invoke("nick:list") as Promise<Candidate[]>,
        clear: () => ipcRenderer.invoke("nick:clear") as Promise<void>,
        openNameMc: (name: string) => ipcRenderer.invoke("nick:open-namemc", name) as Promise<void>,
        onBulkProgress: (callback: (event: BulkProgressEvent) => void) => {
            const listener = (_event: Electron.IpcRendererEvent, progress: BulkProgressEvent) => callback(progress);
            ipcRenderer.on("nick:bulk-progress", listener);
            return () => ipcRenderer.removeListener("nick:bulk-progress", listener);
        },
        onVerifyProgress: (callback: (event: VerifyProgressEvent) => void) => {
            const listener = (_event: Electron.IpcRendererEvent, progress: VerifyProgressEvent) => callback(progress);
            ipcRenderer.on("nick:verify-progress", listener);
            return () => ipcRenderer.removeListener("nick:verify-progress", listener);
        },
    },
    config: {
        getRateLimits: () => ipcRenderer.invoke("config:get-rate-limits") as Promise<AppConfig["rateLimit"]>,
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