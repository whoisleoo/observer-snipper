import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: resolve("electron/main.ts"),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: resolve("electron/preload.ts"),
                formats: ["cjs"],
                fileName: () => "preload.cjs",
            },
        },
    },
    renderer: {
        root: ".",
        // Packaged app is loaded via loadFile() (file:// protocol), where
        // the default absolute base ("/") resolves against the filesystem
        // root instead of the app's own out/renderer/ folder.
        base: "./",
        build: {
            rollupOptions: {
                input: resolve("index.html"),
            },
        },
        plugins: [
            react(),
            tailwindcss(),
        ],
    },
});