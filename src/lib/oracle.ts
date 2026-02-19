import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const oracle = new S3Client({
    region: process.env.ORACLE_REGION || "us-ashburn-1",
    endpoint: process.env.ORACLE_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.ORACLE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY || '',
    },
    // Required for Oracle OCI S3-compatible API
    forcePathStyle: true,
});

/**
 * Upload a file to Oracle Object Storage (public bucket).
 */
export const putOracleObject = async (
    key: string,
    body: Uint8Array,
    contentType: string
) => {
    const command = new PutObjectCommand({
        Bucket: process.env.ORACLE_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    });
    return oracle.send(command);
};

/**
 * Build the public URL for an Oracle Object Storage object.
 * Works for public buckets — no signing needed.
 */
export const getOraclePublicUrl = (key: string): string => {
    const endpoint = (process.env.ORACLE_ENDPOINT || '').replace(/\/$/, '');
    const bucket = process.env.ORACLE_BUCKET_NAME || '';
    return `${endpoint}/${bucket}/${key}`;
};

/**
 * Calculate total bytes stored in the Oracle bucket.
 */
export const getOracleBucketSize = async (): Promise<number> => {
    let totalBytes = 0;
    let continuationToken: string | undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: process.env.ORACLE_BUCKET_NAME,
            ContinuationToken: continuationToken,
        });
        const response = await oracle.send(command);
        for (const obj of response.Contents || []) {
            totalBytes += obj.Size || 0;
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return totalBytes;
};

export default oracle;
