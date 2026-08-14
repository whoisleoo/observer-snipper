"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installer", {
    getInfo: () => ipcRenderer.invoke("installer:get-info"),
    pickDirectory: (currentDir) => ipcRenderer.invoke("installer:pick-directory", currentDir),

    startInstall: (options) => ipcRenderer.send("installer:start-install", options),
    startUninstall: (options) => ipcRenderer.send("installer:start-uninstall", options),
    finishUninstallAndQuit: (installDir) => ipcRenderer.send("installer:finish-uninstall-and-quit", installDir),
    openApp: (installDir) => ipcRenderer.send("installer:open-app", installDir),

    minimize: () => ipcRenderer.send("installer:minimize"),
    close: () => ipcRenderer.send("installer:close"),

    onProgress: (callback) => {
        const listener = (_event, data) => callback(data);
        ipcRenderer.on("installer:progress", listener);
        return () => ipcRenderer.removeListener("installer:progress", listener);
    },
    onComplete: (callback) => {
        const listener = (_event, data) => callback(data);
        ipcRenderer.on("installer:complete", listener);
        return () => ipcRenderer.removeListener("installer:complete", listener);
    },
    onFailed: (callback) => {
        const listener = (_event, data) => callback(data);
        ipcRenderer.on("installer:failed", listener);
        return () => ipcRenderer.removeListener("installer:failed", listener);
    },
});
