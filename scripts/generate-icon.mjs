// public/favicon.png IS the app icon — a small (16x16) pixel-art mark, used
// as-is by the app itself (browser tab, electron/main.ts +
// microsoftLoginWindow.ts window icon, the custom titlebar in
// src/layout/TitleBar.tsx). It is never regenerated.
//
// This script only derives the two things that need a bigger version:
//   - build/icon.png (1024x1024) — source electron-builder derives the exe/
//     taskbar .ico from. Upscaled by manually replicating each source pixel
//     into an NxN block (pure nearest-neighbor, no interpolation) so the
//     pixel art stays crisp with zero edge artifacts.
//   - installer/renderer/assets/icon.png — a byte-for-byte copy of
//     favicon.png (same 16x16 size it's displayed at in the installer's own
//     titlebar, matching the real app exactly).
//
// Earlier version rendered favicon.png in a hidden BrowserWindow and used
// capturePage() to rasterize it — that pipeline captures at the display's
// DPI scale (not necessarily 1024x1024), which then needed a corrective
// resize that introduced a soft/misaligned edge on the right and bottom.
// Working directly on the source pixel buffer sidesteps DPI scaling,
// window rendering and interpolation entirely.
// Run with: npx electron scripts/generate-icon.mjs
import { app, nativeImage } from "electron";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "public", "favicon.png");
const iconOut = path.join(root, "build", "icon.png");
const installerIconOut = path.join(root, "installer", "renderer", "assets", "icon.png");
const SIZE = 1024;

async function run() {
    await app.whenReady();

    const source = nativeImage.createFromPath(sourcePath);
    if (source.isEmpty()) {
        throw new Error(`Failed to decode ${sourcePath}`);
    }

    const { width, height } = source.getSize();
    if (width !== height) {
        throw new Error(`Expected a square source image, got ${width}x${height}`);
    }
    if (SIZE % width !== 0) {
        throw new Error(`${SIZE} must be an integer multiple of the source size (${width})`);
    }

    const scale = SIZE / width;
    const srcBuffer = source.toBitmap(); // BGRA, width*height*4 bytes
    const outBuffer = Buffer.alloc(SIZE * SIZE * 4);

    for (let y = 0; y < SIZE; y++) {
        const sy = Math.floor(y / scale);
        for (let x = 0; x < SIZE; x++) {
            const sx = Math.floor(x / scale);
            const srcIdx = (sy * width + sx) * 4;
            const dstIdx = (y * SIZE + x) * 4;
            srcBuffer.copy(outBuffer, dstIdx, srcIdx, srcIdx + 4);
        }
    }

    const result = nativeImage.createFromBitmap(outBuffer, { width: SIZE, height: SIZE });
    mkdirSync(path.dirname(iconOut), { recursive: true });
    writeFileSync(iconOut, result.toPNG());
    console.log(`Icon written to ${path.relative(root, iconOut)} (${SIZE}x${SIZE})`);

    mkdirSync(path.dirname(installerIconOut), { recursive: true });
    copyFileSync(sourcePath, installerIconOut);
    console.log(`Icon copied to ${path.relative(root, installerIconOut)} (unchanged, same as public/favicon.png)`);

    app.quit();
}

run().catch((err) => {
    console.error(err);
    app.exit(1);
});
