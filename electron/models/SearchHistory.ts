import type { NickStatus } from "./Nick";

export interface SearchHistoryEntry {
    id: number;
    nick: string;
    status: NickStatus;
    checkedAt: string;
}
