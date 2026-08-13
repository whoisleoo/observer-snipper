export interface RateLimiter {
    schedule<T>(task: () => Promise<T>): Promise<T>;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
    throw new Error("TODO: implement sliding window / token bucket limiter");
}
