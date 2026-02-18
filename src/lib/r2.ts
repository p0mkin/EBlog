import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export const getDownloadUrl = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(r2, command, { expiresIn: 3600 });
};

export const getUploadUrl = async (key: string, contentType: string) => {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(r2, command, { expiresIn: 600 });
};

export default r2;
