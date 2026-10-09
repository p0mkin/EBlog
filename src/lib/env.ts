import { z } from "zod";

/**
 * Validates ALL required environment variables at module load time.
 * Fails LOUDLY with a readable message instead of letting a missing
 * var surface later as a cryptic AWS SDK / Prisma connection error.
 *
 * Import this once in a top-level file (e.g. instrumentation.ts or
 * the root layout) to force validation on cold start.
 */
const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 chars"),

    GITHUB_ID: z.string().min(1),
    GITHUB_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    OWNER_EMAIL: z.string().optional(),
    OWNER_USERNAME: z.string().optional(),

    R2_ENDPOINT: z.string().url(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),

    ORACLE_ENDPOINT: z.string().url().optional(),
    ORACLE_ACCESS_KEY_ID: z.string().optional(),
    ORACLE_SECRET_ACCESS_KEY: z.string().optional(),
    ORACLE_BUCKET_NAME: z.string().optional(),
    ORACLE_REGION: z.string().optional(),
}).refine(
    (data) => !!data.OWNER_EMAIL || !!data.OWNER_USERNAME,
    { message: "At least one of OWNER_EMAIL or OWNER_USERNAME must be set" }
);

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error(`❌ Invalid environment configuration:\n${issues}`);
    }
    return parsed.data;
}

// Validated once per cold start, cached on the module.
export const env = validateEnv();
