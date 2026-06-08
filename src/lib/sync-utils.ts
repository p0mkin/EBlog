import r2 from "@/lib/r2";
import oracle from "@/lib/oracle";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export type StorageObject = { Key: string; Size: number; provider: "r2" | "oracle" };

const EXCLUDED_PREFIXES = ["thumbs/"];

/**
 * Fetches all valid objects from a given S3-compatible client.
 */
async function fetchProviderObjects(
    client: S3Client,
    bucketName: string | undefined,
    providerName: "r2" | "oracle"
): Promise<StorageObject[]> {
    if (!bucketName) return [];

    const objects: StorageObject[] = [];
    let continuationToken: string | undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
        });

        const response = await client.send(command);
        if (response.Contents) {
            for (const obj of response.Contents) {
                if (!obj.Key || obj.Key.endsWith("/")) continue;
                const isExcluded = EXCLUDED_PREFIXES.some(p => obj.Key!.startsWith(p));
                if (isExcluded) continue;
                objects.push({ Key: obj.Key, Size: obj.Size || 0, provider: providerName });
            }
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return objects;
}

/**
 * Retrieves objects from both R2 and Oracle storage providers handling pagination.
 * Each provider is independent — failures in one don't block the other.
 */
export async function getAllStorageObjects(): Promise<StorageObject[]> {
    const [r2Result, oracleResult] = await Promise.allSettled([
        fetchProviderObjects(r2, process.env.R2_BUCKET_NAME, "r2"),
        fetchProviderObjects(oracle, process.env.ORACLE_BUCKET_NAME, "oracle"),
    ]);

    const r2Objects = r2Result.status === 'fulfilled' ? r2Result.value : [];
    const oracleObjects = oracleResult.status === 'fulfilled' ? oracleResult.value : [];

    if (r2Result.status === 'rejected') {
        console.error("R2 sync failed:", r2Result.reason);
    }
    if (oracleResult.status === 'rejected') {
        console.error("Oracle sync failed:", oracleResult.reason);
    }

    console.log(`Found ${r2Objects.length} objects in R2 (excluded thumbs).`);
    console.log(`Found ${oracleObjects.length} objects in Oracle (excluded thumbs).`);

    return [...r2Objects, ...oracleObjects];
}
