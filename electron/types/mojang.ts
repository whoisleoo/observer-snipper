export interface MojangProfile {
    id: string;
    name: string;
}

export type NameAvailabilityStatus = "AVAILABLE" | "DUPLICATE" | "NOT_ALLOWED";

export interface NameAvailability {
    status: NameAvailabilityStatus;
}
