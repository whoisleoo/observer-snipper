import { BrowserWindow } from "electron";
import { createAuthService, REDIRECT_URI } from "../services/authService";
import { loadConfig } from "../config/env";
import { set } from "zod";

export function openMicrosoftLoginWindow(authorizationUrl: string, redirectUri: string): Promise<string>{
    return new Promise((resolve, reject) => {
        const win = new BrowserWindow({
            width: 500,
            height: 650,
            show: true,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        })

        let settled = false;
        const handleRedirect = (url: string) =>{
            if(!url.startsWith(redirectUri)) return;

            const code = new URL(url).searchParams.get('code');
            settled = true

            win.close();

            if(code){
                resolve(code)
            }else{
                reject(new Error('Login cancelled by Microsoft.'));
            }
        }

        win.webContents.on('will-redirect', (_event, url) => handleRedirect(url));
        win.webContents.on('will-navigate', (_event, url) => handleRedirect(url));

        win.on('closed', () => {
            if(!settled) reject(new Error('Window closed before completion.'))
        })

        win.loadURL(authorizationUrl);
    })
}

