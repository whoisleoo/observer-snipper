import type Database from "better-sqlite3";

export function connect(databasePath: string): Database.Database {
    throw new Error("TODO: open better-sqlite3 connection and run migrations");
}
