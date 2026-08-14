export type WaitCallback = (waitUntil: number) => void;

export interface RateLimiter {
    schedule<T>(task: () => Promise<T>, onWaiting?: WaitCallback): Promise<T>;
    pause(ms: number): void;
}

function wait(ms: number): Promise<void>{
    return new Promise((resolve) => setTimeout(resolve, ms));
}



export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
    const hits: number[] = [];
    let pausedUntil = 0;
    let chain: Promise<void> = Promise.resolve();

    async function acquire(onWaiting?: WaitCallback): Promise<void> {
        while(true){
            const now = Date.now();

            if(now <pausedUntil){
                onWaiting?.(pausedUntil);
                await wait(pausedUntil - now);
                continue;
            }

            while(hits.length && now - hits[0] >= windowMs){
                hits.shift();
            }

            if(hits.length < maxRequests){
                hits.push(now);
                return;
            }

            const waitUntil = hits[0] + windowMs + 10;
            onWaiting?.(waitUntil);
            await wait(waitUntil - now);
        }
    }

    return {
        async schedule<T>(task: () => Promise<T>, onWaiting?: WaitCallback): Promise<T>{
            const previous = chain;
            let release!: () => void;
            chain = new Promise((resolve) => {
                release = resolve;
            });

            await previous;
            try{
                await acquire(onWaiting);
            }finally{
                release()
            }
            return task();
        },
        pause(ms: number) {
            pausedUntil = Math.max(pausedUntil, Date.now() + ms);
            hits.length = 0;
        },
    };
}
