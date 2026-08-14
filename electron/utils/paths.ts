import { app } from "electron";
import path from "node:path";

// electron-vite bundles the whole main process (main.ts + every module it
// imports) into a single out/main/main.js, so __dirname here always
// resolves to out/main regardless of which source file this runs from.
//
// In dev, that means the raw public/ folder is a sibling of out/. Once
// packaged, only out/**/* ships (see electron-builder.app.yml) — public/
// isn't included, but Vite already copies its contents into out/renderer/
// as part of the build.
export function getFaviconPath(): string {
    return app.isPackaged
        ? path.join(__dirname, "../renderer/favicon.png")
        : path.join(__dirname, "../../public/favicon.png");
}
