// Custom installer wizard for Observer.
"use strict";

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const { execFile, spawn } = require("node:child_process");

const APP_DISPLAY_NAME = "Observer";
const APP_PACKAGE_NAME = "observer";
const APP_EXE_NAME = "Observer.exe";
const UNINSTALLER_EXE_NAME = "Uninstall Observer.exe";
const UNINSTALL_REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Observer";

const isUninstallMode = process.argv.includes("--uninstall");

let mainWindow = null;

function getPayloadZipPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "payload.zip");
    }
    const devZip = path.resolve(__dirname, "..", "dist", "app", "payload.zip");
    return fssync.existsSync(devZip) ? devZip : null;
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

async function dirSizeBytes(dir) {
    let total = 0;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            total += await dirSizeBytes(abs);
        } else if (entry.isFile()) {
            total += (await fs.stat(abs)).size;
        }
    }
    return total;
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


async function extractZip(zipPath, destDir) {
    await fs.mkdir(destDir, { recursive: true });
    const script = `Expand-Archive -LiteralPath '${psEscape(zipPath)}' -DestinationPath '${psEscape(destDir)}' -Force`;
    await runCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
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

async function closeRunningApp(installDir) {
    const exePath = path.join(installDir, APP_EXE_NAME);
    
    const script = `Get-CimInstance Win32_Process -Filter "Name='${APP_EXE_NAME}'" | Where-Object { $_.ExecutablePath -eq '${psEscape(exePath)}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
    await runCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    }
}

ipcMain.handle("installer:get-info", async () => {
  
    const localAppData = process.env.LOCALAPPDATA || app.getPath("appData");
    const defaultInstallDir = path.join(localAppData, APP_DISPLAY_NAME);
    return {
        mode: isUninstallMode ? "uninstall" : "install",
        appName: APP_DISPLAY_NAME,
        appVersion: app.getVersion(),
        defaultInstallDir,
      
        installDir: isUninstallMode
            ? path.dirname(process.env.PORTABLE_EXECUTABLE_FILE || process.execPath)
            : null,
        payloadAvailable: getPayloadZipPath() !== null,
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
        const payloadZip = getPayloadZipPath();
        if (!payloadZip) {
            throw new Error("Payload not found.");
        }

        reportProgress(2, "Brewing…");
        await fs.mkdir(installDir, { recursive: true });

        reportProgress(10, "Processing…");
        await extractZip(payloadZip, installDir);
        reportProgress(65, "Cooking...");
        const payloadBytes = await dirSizeBytes(installDir);

        const exePath = path.join(installDir, APP_EXE_NAME);

        if (startMenuShortcut) {
            reportProgress(72, "Architecting…");
            await createShortcut(startMenuShortcutPath(), exePath, installDir);
        }

        if (desktopShortcut) {
            reportProgress(78, "Debugging…");
            await createShortcut(desktopShortcutPath(), exePath, installDir);
        }

        reportProgress(85, "Deploying…");
        const uninstallerSource = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
        const uninstallerDest = path.join(installDir, UNINSTALLER_EXE_NAME);
        await fs.copyFile(uninstallerSource, uninstallerDest);

        reportProgress(93, "Bootstrapping…");
        const uninstallerStat = await fs.stat(uninstallerDest);
        await writeUninstallRegistryEntry(installDir, uninstallerDest, payloadBytes + uninstallerStat.size);

        reportProgress(100, "Done!.");
        send("installer:complete", { mode: "install", installDir });
    } catch (error) {
        send("installer:failed", { message: error instanceof Error ? error.message : String(error) });
    }
});

ipcMain.on("installer:start-uninstall", async (_event, options) => {
    const { installDir, removeUserData } = options;

    try {
        reportProgress(5, "Closing Observer…");
        await closeRunningApp(installDir);

        reportProgress(10, "Deleting shortcuts…");
        await removeShortcutIfExists(startMenuShortcutPath());
        await removeShortcutIfExists(desktopShortcutPath());

        reportProgress(35, "Deleting System32…");
        await deleteUninstallRegistryEntry();

        if (removeUserData) {
            reportProgress(55, "Deleting saved data…");
            await fs.rm(userDataDir(), { recursive: true, force: true });
        }

        reportProgress(70, "Removing file…");
        if (fssync.existsSync(installDir)) {
            const entries = await fs.readdir(installDir);
            for (const entry of entries) {
                if (entry === UNINSTALLER_EXE_NAME) continue;
                await fs.rm(path.join(installDir, entry), { recursive: true, force: true });
            }
        }

        reportProgress(100, "Done!.");
        send("installer:complete", { mode: "uninstall", installDir });
    } catch (error) {
        send("installer:failed", { message: error instanceof Error ? error.message : String(error) });
    }
});


ipcMain.on("installer:finish-uninstall-and-quit", (_event, installDir) => {
    const script = `ping -n 3 127.0.0.1 >nul & rmdir /s /q "${installDir}"`;
    spawn("cmd.exe", ["/c", script], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    app.quit();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});
