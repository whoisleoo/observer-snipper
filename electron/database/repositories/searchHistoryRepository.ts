import type Database from "better-sqlite3";
import type { SearchHistoryEntry } from "../../models/SearchHistory";

export interface SearchHistoryRepository {
    add(entry: Omit<SearchHistoryEntry, "id">): void;
    list(): SearchHistoryEntry[];
}

export function createSearchHistoryRepository(db: Database.Database): SearchHistoryRepository {
    throw new Error("TODO: implement CRUD over the search_history table");
}
