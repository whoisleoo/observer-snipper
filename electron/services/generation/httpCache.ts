import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";

async function readCached(cacheDir: string, filename: string): Promise<string | null> {
    try {
        return await fs.readFile(path.join(cacheDir, filename), "utf-8");
    } catch {
        return null;
    }
}

export async function downloadAndCache(url: string, cacheDir: string, filename: string): Promise<string> {
    const cached = await readCached(cacheDir, filename);
    if (cached !== null) return cached;

    const { data } = await axios.get<string>(url, { responseType: "text" });
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(path.join(cacheDir, filename), data, "utf-8");
    return data;
}
