import { z } from 'zod';

export const appConfigSchema = z.object({
    mojang: z.object({
        bulkServicesUrl: z.string().url(),
        bulkMojangUrl: z.string().url(),
        bulkLegacyUrl: z.string().url(),
        availableUrl: z.string().url(),
    }),
    rateLimit: z.object({
        maxRequests: z.coerce.number().default(100),
        windowMs: z.coerce.number().default(60000),
    }),
    auth: z.object({
        clientId: z.string(),
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
            maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
            windowMs: process.env.RATE_LIMIT_WINDOW_MS,
        },
        auth: {
            clientId: process.env.MSA_CLIENT_ID,
        },
        databasePath: process.env.DATABASE_PATH,
    };



    return appConfigSchema.parse(rawConfig);
}
