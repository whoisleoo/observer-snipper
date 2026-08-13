import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
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