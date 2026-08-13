import { z } from 'zod';

export const appConfigSchema = z.object({
    mojang: z.object({
        bulkServicesUrl: z.string().url(),
        bulkMojangUrl: z.string().url(),
        bulkLegacyUrl: z.string().url(),
        availableUrl: z.string().url(),
    }),
    rateLimit: z.object({
        bulk: z.object({
            maxRequests: z.coerce.number().default(150),
            windowMs: z.coerce.number().default(120000),
        }),
        verify: z.object({
            maxRequests: z.coerce.number().default(18),
            windowMs: z.coerce.number().default(300000),
        }),
    }),
    databasePath: z.string().default('./database.sqlite'),
})


export type AppConfig = z.infer<typeof appConfigSchema>;

export function loadConfig(): AppConfig {
    const rawConfig = {
        mojang: {
            bulkServicesUrl: process.env.MOJANG_BULK_SERVICES_URL,
            bulkMojangUrl: process.env.MOJANG_BULK_MOJANG_URL,
            bulkLegacyUrl: process.env.MOJANG_BULK_LEGACY_URL,
            availableUrl: process.env.MOJANG_AVAILABLE_URL,
        },
        rateLimit: {
            bulk: {
                maxRequests: process.env.RATE_LIMIT_BULK_MAX_REQUESTS,
                windowMs: process.env.RATE_LIMIT_BULK_WINDOW_MS,
            },
            verify: {
                maxRequests: process.env.RATE_LIMIT_VERIFY_MAX_REQUESTS,
                windowMs: process.env.RATE_LIMIT_VERIFY_WINDOW_MS,
            },
        },
        databasePath: process.env.DATABASE_PATH,
    };



    return appConfigSchema.parse(rawConfig);
}
