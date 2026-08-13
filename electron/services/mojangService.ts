import type { AppConfig } from "../config/env";
import type { MojangProfile, NameAvailability } from "../types/mojang";
import type { RateLimiter } from "./rateLimiter";

export interface MojangService {
    checkAvailability(nick: string): Promise<NameAvailability>;
    lookupBulk(nicks: string[]): Promise<MojangProfile[]>;
}

export function createMojangService(
    endpoints: AppConfig["mojang"],
    rateLimiter: RateLimiter,
): MojangService {
    throw new Error("TODO: implement Mojang HTTP calls via axios, scheduled through rateLimiter");
}
