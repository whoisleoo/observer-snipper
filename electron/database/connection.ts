import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { up } from "./migrations/001_init";

export function connect(databasePath: string): Database.Database {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    const db = new Database(databasePath);
    db.pragma("journal_mode = WAL");
    up(db);

    return db;
}
