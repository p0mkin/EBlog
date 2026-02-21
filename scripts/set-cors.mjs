import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env
dotenv.config({ path: resolve(process.cwd(), ".env") });

const provider = process.argv[2] || "oracle"; // Can be oracle or r2

const config = {
    oracle: {
        region: process.env.ORACLE_REGION,
        endpoint: process.env.ORACLE_ENDPOINT,
        credentials: {
            accessKeyId: process.env.ORACLE_ACCESS_KEY_ID,
            secretAccessKey: process.env.ORACLE_SECRET_ACCESS_KEY,
        },
        bucket: process.env.ORACLE_BUCKET_NAME,
        origin: "https://e-blog-nine.vercel.app" // Main Vercel URL
    },
    r2: {
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        bucket: process.env.R2_BUCKET_NAME,
        origin: "https://e-blog-nine.vercel.app"
    }
};

async function setCors(type) {
    const settings = config[type];
    if (!settings.credentials.accessKeyId || !settings.bucket) {
        console.error(`Error: Missing env variables for ${type}`);
        return;
    }

    const client = new S3Client({
        region: settings.region || "us-ashburn-1",
        endpoint: settings.endpoint,
        credentials: settings.credentials,
        forcePathStyle: type === "oracle",
    });

    const command = new PutBucketCorsCommand({
        Bucket: settings.bucket,
        CORSConfiguration: {
            CORSRules: [
                {
                    ID: "VercelUpload",
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "PUT", "DELETE", "HEAD", "POST"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag", "Content-Type"],
                    MaxAgeSeconds: 3600,
                },
            ],
        },
    });

    try {
        await client.send(command);
        console.log(`✅ Successfully set CORS policy for ${type} bucket: ${settings.bucket}`);
        console.log(`📡 Allowed origin: ${settings.origin}`);
    } catch (err) {
        console.error(`❌ Failed to set CORS for ${type}:`, err.message);
    }
}

setCors(provider);
