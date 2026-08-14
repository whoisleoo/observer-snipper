import axios, { isAxiosError } from "axios";
import type { AppConfig } from "../config/env";
import type { BulkStatus } from "../models/Candidate";
import type { MojangProfile, NameAvailabilityStatus } from "../types/mojang";
import type { RateLimiter } from "./rateLimiter";

const BULK_BATCH_SIZE = 10;
const MAX_BULK_RETRIES = 6;

export interface BulkLookupResult {
    name: string;
    status: BulkStatus;
}

export class TokenInvalidError extends Error {}
export class AccountSuspendedError extends Error {}

export interface BulkProgressEvent {
    checked: number;
    total: number;
    free: number;
    taken: number;
    paused: boolean;
    pausedUntil?: number;
}

export type BulkProgressCallback = (event: BulkProgressEvent) => void;
export type PauseCallback = (pausedUntil: number) => void;

export interface MojangService {
    /** Divide em lotes de 10*/
    lookupBulk(names: string[], onProgress?: BulkProgressCallback): Promise<BulkLookupResult[]>;

    /**Lanca TokenInvalidError (401) / AccountSuspendedError (403). onPause avisa tanto de auto-throttle
     * (janela do rate limiter cheia) quanto de 429 real da Mojang, antes de esperar/lancar. */
    checkAvailability(name: string, token: string, onPause?: PauseCallback): Promise<NameAvailabilityStatus>;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
    return Math.min(30_000 * 2 ** (attempt - 1), 300_000);
}

export function createMojangService(
    endpoints: AppConfig["mojang"],
    bulkRateLimiter: RateLimiter,
    verifyRateLimiter: RateLimiter,
): MojangService {
    async function lookupBatch(names: string[], attempt = 1, onPause?: PauseCallback): Promise<BulkLookupResult[]> {
        if (names.length === 0) return [];

        try {
            // onPause aqui cobre DOIS casos: a janela do rate limiter esta
            // cheia (auto-throttle normal, sem erro nenhum) ou um 429 real
            // — pro usuario os dois sao a mesma coisa: "esta esperando".
            const response = await bulkRateLimiter.schedule(
                () => axios.post<MojangProfile[]>(endpoints.bulkServicesUrl, names),
                onPause,
            );

            const taken = new Set(response.data.map((profile) => profile.name.toLowerCase()));
            return names.map((name) => ({
                name,
                status: taken.has(name.toLowerCase()) ? ("taken" as const) : ("free" as const),
            }));
        } catch (error) {
            if (!isAxiosError(error) || !error.response) {
                if (attempt >= MAX_BULK_RETRIES) throw error;
                await wait(backoffMs(attempt));
                return lookupBatch(names, attempt + 1, onPause);
            }

            const { status, headers } = error.response;

            if (status === 429) {
                const retryAfter = Number(headers["retry-after"]);
                // Sem header, escala 30s -> 60s -> 120s... em vez de pausar
                // sempre 30s fixos — 429 repetido com pausa curta demais
                // martela a API mais do que o esperado (mesmo risco que o
                // Mcnames.py evita com o backoff exponencial dele).
                const pauseMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : backoffMs(attempt);
                bulkRateLimiter.pause(pauseMs);
                onPause?.(Date.now() + pauseMs);
                if (attempt >= MAX_BULK_RETRIES) throw error;
                return lookupBatch(names, attempt + 1, onPause);
            }

            if (status === 400 && names.length > 1) {
                const mid = Math.floor(names.length / 2);
                const [a, b] = await Promise.all([
                    lookupBatch(names.slice(0, mid), 1, onPause),
                    lookupBatch(names.slice(mid), 1, onPause),
                ]);
                return [...a, ...b];
            }

            if (status >= 500 || status === 403) {
                if (attempt >= MAX_BULK_RETRIES) throw error;
                await wait(backoffMs(attempt));
                return lookupBatch(names, attempt + 1, onPause);
            }

            throw error;
        }
    }

    return {
        async lookupBulk(names, onProgress) {
            const batches: string[][] = [];
            for (let i = 0; i < names.length; i += BULK_BATCH_SIZE) {
                batches.push(names.slice(i, i + BULK_BATCH_SIZE));
            }

            const total = names.length;
            let checked = 0;
            let free = 0;
            let taken = 0;

            const results = await Promise.all(
                batches.map(async (batch) => {
                    const batchResults = await lookupBatch(batch, 1, (pausedUntil) => {
                        onProgress?.({ checked, total, free, taken, paused: true, pausedUntil });
                    });

                    checked += batchResults.length;
                    for (const result of batchResults) {
                        if (result.status === "free") free++;
                        else taken++;
                    }
                    onProgress?.({ checked, total, free, taken, paused: false });

                    return batchResults;
                }),
            );
            return results.flat();
        },

        async checkAvailability(name, token, onPause) {
            const url = endpoints.availableUrl.replace("{name}", encodeURIComponent(name));

            try {
                const response = await verifyRateLimiter.schedule(
                    () =>
                        axios.get<{ status: NameAvailabilityStatus }>(url, {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                    onPause,
                );
                return response.data.status;
            } catch (error) {
                if (!isAxiosError(error) || !error.response) throw error;

                const { status, headers } = error.response;

                if (status === 401) throw new TokenInvalidError("Token invalido ou expirado.");
                if (status === 403) throw new AccountSuspendedError("Conta possivelmente suspensa (403).");
                if (status === 429) {
                    const retryAfter = Number(headers["retry-after"]);
                    const pauseMs = (Number.isFinite(retryAfter) ? retryAfter : 300) * 1000;
                    verifyRateLimiter.pause(pauseMs);
                    onPause?.(Date.now() + pauseMs);
                }
                throw error;
            }
        },
    };
}

