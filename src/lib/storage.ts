/**
 * Storage Provider Abstraction Layer
 *
 * Supports: r2 | oracle | s3 | backblaze
 * Set STORAGE_PROVIDER env var to switch providers.
 * All providers must expose the same StorageProvider interface.
 */
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type Provider = "r2" | "oracle" | "s3" | "backblaze";

export interface StorageProvider {
    getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    getUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
    putObject(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void>;
    deleteObject(key: string): Promise<void>;
    getPublicUrl(key: string): string | null;
}

function buildS3Client(config: {
    region: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
}): S3Client {
    return new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: config.forcePathStyle ?? false,
    });
}

class S3CompatibleProvider implements StorageProvider {
    private client: S3Client;
    private bucket: string;
    private publicBase: string | null;

    constructor(client: S3Client, bucket: string, publicBase?: string) {
        this.client = client;
        this.bucket = bucket;
        this.publicBase = publicBase ?? null;
    }

    async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
        return getSignedUrl(
            this.client,
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            { expiresIn }
        );
    }

    async getUploadUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
        return getSignedUrl(
            this.client,
            new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
            { expiresIn }
        );
    }

    async putObject(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
        await this.client.send(
            new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType })
        );
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }

    getPublicUrl(key: string): string | null {
        if (!this.publicBase) return null;
        return `${this.publicBase.replace(/\/$/, "")}/${key}`;
    }
}

function createR2Provider(): StorageProvider {
    const client = buildS3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT!,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    });
    return new S3CompatibleProvider(client, process.env.R2_BUCKET_NAME!, process.env.R2_PUBLIC_URL);
}

function createOracleProvider(): StorageProvider {
    const client = buildS3Client({
        region: process.env.ORACLE_REGION ?? "us-ashburn-1",
        endpoint: process.env.ORACLE_ENDPOINT!,
        accessKeyId: process.env.ORACLE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY!,
        forcePathStyle: true,
    });
    return new S3CompatibleProvider(client, process.env.ORACLE_BUCKET_NAME!, process.env.ORACLE_PUBLIC_URL);
}

function createS3Provider(): StorageProvider {
    const client = buildS3Client({
        region: process.env.AWS_REGION ?? "us-east-1",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    });
    const publicBase = process.env.AWS_CLOUDFRONT_URL
        ?? (process.env.AWS_S3_PUBLIC === "true"
            ? `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`
            : undefined);
    return new S3CompatibleProvider(client, process.env.AWS_S3_BUCKET!, publicBase);
}

function createBackblazeProvider(): StorageProvider {
    const client = buildS3Client({
        region: process.env.B2_REGION ?? "us-west-004",
        endpoint: process.env.B2_ENDPOINT!,
        accessKeyId: process.env.B2_APPLICATION_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
    });
    return new S3CompatibleProvider(client, process.env.B2_BUCKET_NAME!, process.env.B2_PUBLIC_URL);
}

const providerMap: Record<Provider, () => StorageProvider> = {
    r2: createR2Provider,
    oracle: createOracleProvider,
    s3: createS3Provider,
    backblaze: createBackblazeProvider,
};

// Singleton per provider — cached at module level (survives warm invocations)
const _cache: Partial<Record<Provider, StorageProvider>> = {};

export function getStorage(providerName?: Provider): StorageProvider {
    const name: Provider = providerName
        ?? (process.env.STORAGE_PROVIDER as Provider | undefined)
        ?? "r2";

    if (!_cache[name]) {
        const factory = providerMap[name];
        if (!factory) throw new Error(`Unknown STORAGE_PROVIDER: "${name}"`);
        _cache[name] = factory();
    }
    return _cache[name]!;
}

export default getStorage;
