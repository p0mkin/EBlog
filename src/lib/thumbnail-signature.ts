import { randomBytes } from "crypto";

declare global {
    // eslint-disable-next-line no-var
    var __thumbnailSignatureSecret: string | undefined;
}

export function getThumbnailSignatureSecret(): string {
    const envSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (envSecret) return envSecret;

    if (!globalThis.__thumbnailSignatureSecret) {
        globalThis.__thumbnailSignatureSecret = randomBytes(32).toString("hex");
    }
    return globalThis.__thumbnailSignatureSecret;
}

