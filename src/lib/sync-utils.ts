import r2 from "@/lib/r2";
import oracle from "@/lib/oracle";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export type StorageObject = { Key: string; Size: number; provider: "r2" | "oracle" };

const EXCLUDED_PREFIXES = ["thumbs/"];

/**
 * Fetches all valid objects from a given S3-compatible client.
 */
async function fetchProviderObjects(
    client: any,
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
 */
export async function getAllStorageObjects(): Promise<StorageObject[]> {
    const [r2Objects, oracleObjects] = await Promise.all([
        fetchProviderObjects(r2, process.env.R2_BUCKET_NAME, "r2"),
        fetchProviderObjects(oracle, process.env.ORACLE_BUCKET_NAME, "oracle"),
    ]);

    console.log(`Found ${r2Objects.length} objects in R2 (excluded thumbs).`);
    console.log(`Found ${oracleObjects.length} objects in Oracle (excluded thumbs).`);

    return [...r2Objects, ...oracleObjects];
}
