// Custom installer wizard for Observer. Kept as plain CommonJS with no
// bundler/build step — see installer/renderer for the UI.
"use strict";

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const { execFile, spawn } = require("node:child_process");

const APP_DISPLAY_NAME = "Observer";
// Must match the "name" field in the root package.json — Electron derives
// app.getName() (and therefore the real app's userData path) from it, and
// this installer needs that same value to offer "also remove my data".
const APP_PACKAGE_NAME = "observer";
const APP_EXE_NAME = "Observer.exe";
const UNINSTALLER_EXE_NAME = "Uninstall Observer.exe";
const UNINSTALL_REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Observer";

const isUninstallMode = process.argv.includes("--uninstall");

let mainWindow = null;

function getPayloadDir() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "payload");
    }
    // Dev fallback: point at the unpacked app produced by `npm run pack:app`.
    const devPayload = path.resolve(__dirname, "..", "dist", "app", "win-unpacked");
    return fssync.existsSync(devPayload) ? devPayload : null;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 720,
        height: 480,
        resizable: false,
        maximizable: false,
        frame: false,
        icon: path.join(__dirname, "renderer", "assets", "icon.png"),
        backgroundColor: "#000000",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function send(channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function reportProgress(percent, label) {
    send("installer:progress", { percent: Math.max(0, Math.min(100, Math.round(percent))), label });
}

async function collectEntries(sourceDir) {
    const dirs = [];
    const files = [];

    async function walk(rel) {
        const abs = path.join(sourceDir, rel);
        const entries = await fs.readdir(abs, { withFileTypes: true });
        for (const entry of entries) {
            const entryRel = path.join(rel, entry.name);
            if (entry.isDirectory()) {
                dirs.push(entryRel);
                await walk(entryRel);
            } else if (entry.isFile()) {
                const { size } = await fs.stat(path.join(sourceDir, entryRel));
                files.push({ rel: entryRel, size });
            }
        }
    }

    await walk(".");
    return { dirs, files };
}

async function copyPayload(sourceDir, destDir, onProgress) {
    await fs.mkdir(destDir, { recursive: true });
    const { dirs, files } = await collectEntries(sourceDir);

    for (const dir of dirs) {
        await fs.mkdir(path.join(destDir, dir), { recursive: true });
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
    let copiedBytes = 0;

    for (const file of files) {
        await fs.copyFile(path.join(sourceDir, file.rel), path.join(destDir, file.rel));
        copiedBytes += file.size;
        onProgress(copiedBytes / totalBytes);
    }

    return totalBytes;
}

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`${command} ${args.join(" ")} failed: ${stderr || error.message}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

function psEscape(value) {
    return String(value).replace(/'/g, "''");
}

async function createShortcut(lnkPath, targetPath, workingDir) {
    await fs.mkdir(path.dirname(lnkPath), { recursive: true });
    const script = [
        "$ws = New-Object -ComObject WScript.Shell",
        `$s = $ws.CreateShortcut('${psEscape(lnkPath)}')`,
        `$s.TargetPath = '${psEscape(targetPath)}'`,
        `$s.WorkingDirectory = '${psEscape(workingDir)}'`,
        `$s.IconLocation = '${psEscape(targetPath)},0'`,
        "$s.Save()",
    ].join("; ");

    await runCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
}

async function removeShortcutIfExists(lnkPath) {
    if (fssync.existsSync(lnkPath)) {
        await fs.rm(lnkPath, { force: true });
    }
}

function startMenuShortcutPath() {
    return path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", `${APP_DISPLAY_NAME}.lnk`);
}

function desktopShortcutPath() {
    return path.join(app.getPath("desktop"), `${APP_DISPLAY_NAME}.lnk`);
}

function userDataDir() {
    return path.join(app.getPath("appData"), APP_PACKAGE_NAME);
}

async function writeUninstallRegistryEntry(installDir, uninstallerPath, sizeBytes) {
    const entries = [
        ["DisplayName", "REG_SZ", APP_DISPLAY_NAME],
        ["DisplayVersion", "REG_SZ", app.getVersion()],
        ["Publisher", "REG_SZ", APP_DISPLAY_NAME],
        ["InstallLocation", "REG_SZ", installDir],
        ["DisplayIcon", "REG_SZ", path.join(installDir, APP_EXE_NAME)],
        ["UninstallString", "REG_SZ", `"${uninstallerPath}" --uninstall`],
        ["NoModify", "REG_DWORD", "1"],
        ["NoRepair", "REG_DWORD", "1"],
        ["EstimatedSize", "REG_DWORD", String(Math.max(1, Math.round(sizeBytes / 1024)))],
    ];

    for (const [name, type, value] of entries) {
        await runCommand("reg", ["add", UNINSTALL_REG_KEY, "/v", name, "/t", type, "/d", value, "/f"]);
    }
}

async function deleteUninstallRegistryEntry() {
    try {
        await runCommand("reg", ["delete", UNINSTALL_REG_KEY, "/f"]);
    } catch {
        // Key may already be gone — not fatal.
    }
}

ipcMain.handle("installer:get-info", async () => {
    // Electron's app.getPath() has no "localAppData" key — %LOCALAPPDATA%
    // has to be read directly from the environment on Windows.
    const localAppData = process.env.LOCALAPPDATA || app.getPath("appData");
    const defaultInstallDir = path.join(localAppData, APP_DISPLAY_NAME);
    return {
        mode: isUninstallMode ? "uninstall" : "install",
        appName: APP_DISPLAY_NAME,
        appVersion: app.getVersion(),
        defaultInstallDir,
        // In uninstall mode the wizard runs from "Uninstall Observer.exe",
        // which install placed directly inside the install directory.
        installDir: isUninstallMode ? path.dirname(process.execPath) : null,
        payloadAvailable: getPayloadDir() !== null,
    };
});

ipcMain.handle("installer:pick-directory", async (_event, currentDir) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Escolher pasta de instalação",
        defaultPath: currentDir,
        properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.on("installer:minimize", () => mainWindow?.minimize());
ipcMain.on("installer:close", () => mainWindow?.close());

ipcMain.on("installer:open-app", (_event, installDir) => {
    const exePath = path.join(installDir, APP_EXE_NAME);
    spawn(exePath, [], { detached: true, stdio: "ignore", cwd: installDir }).unref();
    mainWindow?.close();
});

ipcMain.on("installer:start-install", async (_event, options) => {
    const { installDir, desktopShortcut, startMenuShortcut } = options;

    try {
        const payloadDir = getPayloadDir();
        if (!payloadDir) {
            throw new Error("Payload do app não encontrado. Rode \"npm run pack:app\" antes de gerar o instalador.");
        }

        reportProgress(2, "Preparando instalação…");
        await fs.mkdir(installDir, { recursive: true });

        reportProgress(5, "Copiando arquivos…");
        const payloadBytes = await copyPayload(payloadDir, installDir, (fraction) => {
            reportProgress(5 + fraction * 65, "Copiando arquivos…");
        });

        const exePath = path.join(installDir, APP_EXE_NAME);

        if (startMenuShortcut) {
            reportProgress(72, "Criando atalho no menu Iniciar…");
            await createShortcut(startMenuShortcutPath(), exePath, installDir);
        }

        if (desktopShortcut) {
            reportProgress(78, "Criando atalho na área de trabalho…");
            await createShortcut(desktopShortcutPath(), exePath, installDir);
        }

        reportProgress(85, "Registrando desinstalador…");
        const uninstallerSource = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
        const uninstallerDest = path.join(installDir, UNINSTALLER_EXE_NAME);
        await fs.copyFile(uninstallerSource, uninstallerDest);

        reportProgress(93, "Atualizando registro do Windows…");
        const uninstallerStat = await fs.stat(uninstallerDest);
        await writeUninstallRegistryEntry(installDir, uninstallerDest, payloadBytes + uninstallerStat.size);

        reportProgress(100, "Concluído.");
        send("installer:complete", { mode: "install", installDir });
    } catch (error) {
        send("installer:failed", { message: error instanceof Error ? error.message : String(error) });
    }
});

ipcMain.on("installer:start-uninstall", async (_event, options) => {
    const { installDir, removeUserData } = options;

    try {
        reportProgress(10, "Removendo atalhos…");
        await removeShortcutIfExists(startMenuShortcutPath());
        await removeShortcutIfExists(desktopShortcutPath());

        reportProgress(35, "Removendo entrada do Windows…");
        await deleteUninstallRegistryEntry();

        if (removeUserData) {
            reportProgress(55, "Removendo dados salvos…");
            await fs.rm(userDataDir(), { recursive: true, force: true });
        }

        reportProgress(70, "Removendo arquivos do programa…");
        if (fssync.existsSync(installDir)) {
            const entries = await fs.readdir(installDir);
            for (const entry of entries) {
                if (entry === UNINSTALLER_EXE_NAME) continue;
                await fs.rm(path.join(installDir, entry), { recursive: true, force: true });
            }
        }

        reportProgress(100, "Concluído.");
        send("installer:complete", { mode: "uninstall", installDir });
    } catch (error) {
        send("installer:failed", { message: error instanceof Error ? error.message : String(error) });
    }
});

// The running "Uninstall Observer.exe" cannot delete itself or its parent
// folder while it's still executing. This schedules that final cleanup in a
// detached process and then exits, freeing the file lock.
ipcMain.on("installer:finish-uninstall-and-quit", (_event, installDir) => {
    // "ping" is used instead of "timeout" for the delay — timeout.exe fails
    // with "Input redirection is not supported" when stdin isn't a console,
    // which is exactly the case for a detached child of a GUI app.
    const script = `ping -n 3 127.0.0.1 >nul & rmdir /s /q "${installDir}"`;
    spawn("cmd.exe", ["/c", script], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    app.quit();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});
