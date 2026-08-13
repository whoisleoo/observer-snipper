export interface AppConfig {
    mojang: {
        bulkServicesUrl: string;
        bulkMojangUrl: string;
        bulkLegacyUrl: string;
        availableUrl: string;
    };
    rateLimit: {
        maxRequests: number;
        windowMs: number;
    };
    databasePath: string;
}

export function loadConfig(): AppConfig {
    throw new Error("TODO: read and validate process.env (see .env.example)");
}
