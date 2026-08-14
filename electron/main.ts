import dotenv from "dotenv";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { registerIpcHandlers } from "./ipc";
import path from "node:path";


dotenv.config();

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 960,
        minHeight: 640,
        frame: false,
        icon: path.join(__dirname, "../../public/favicon.png"),

        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.on("maximize", () => win.webContents.send("window:maximized-changed", true));
    win.on("unmaximize", () => win.webContents.send("window:maximized-changed", false));

   
    win.webContents.on("will-navigate", (event, url) => {
        if (url !== win.webContents.getURL()) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    if (!app.isPackaged) {
        win.loadURL(process.env.ELECTRON_RENDERER_URL ?? "http://localhost:5173");
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

ipcMain.on("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window:toggle-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("window:is-maximized", (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

app.whenReady().then(() => {
    createWindow();
    registerIpcHandlers();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});