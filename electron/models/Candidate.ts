export type BulkStatus = "taken" | "free";

export type VerifyStatus = "AVAILABLE" | "NOT_ALLOWED" | "DUPLICATE";

export interface Candidate {
    name: string;
    length: number;
    origin: string;
    bulkStatus: BulkStatus | null;
    verifyStatus: VerifyStatus | null;
    qualityScore: number | null;
    checkedAt: number | null;
    verifiedAt: number | null;
    createdAt: number;
}

export interface NewCandidate {
    name: string;
    origin: string;
    qualityScore?: number | null;
}
