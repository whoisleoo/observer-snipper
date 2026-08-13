export type NickStatus = "available" | "taken" | "unknown";

export interface Nick {
    name: string;
    status: NickStatus;
    checkedAt: Date;
}
