/**
 * One-shot script to move the misplaced New Guernsey R2 file
 * back to the correct album's key prefix, and update the DB.
 *
 * Run with: node --env-file=.env scripts/move-r2-file.mjs
 */

import { S3Client, CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const prisma = new PrismaClient();
const BUCKET = process.env.R2_BUCKET_NAME;

async function main() {
    // 1. Find the "New Guernsey" album
    const guernsey = await prisma.album.findFirst({ where: { name: { contains: "Guernsey" } } });
    if (!guernsey) {
        console.error("Could not find a 'New Guernsey' album in DB. Check the name.");
        return;
    }
    console.log(`Found album: "${guernsey.name}" (id: ${guernsey.id})`);

    // 2. Find photos in the DB whose r2Key doesn't contain the Guernsey album id
    //    but are linked to the Guernsey album
    const photosInAlbum = await prisma.photo.findMany({ where: { albumId: guernsey.id } });
    console.log(`Photos in this album: ${photosInAlbum.length}`);

    // 3. Find photos whose r2Key contains a DIFFERENT album id (i.e. misplaced)
    const misplaced = photosInAlbum.filter(p => !p.r2Key.includes(guernsey.id));

    if (misplaced.length === 0) {
        console.log("No misplaced files found — keys already look correct.");
        await prisma.$disconnect();
        return;
    }

    console.log(`Found ${misplaced.length} misplaced photo(s):`, misplaced.map(p => p.r2Key));

    for (const photo of misplaced) {
        const oldKey = photo.r2Key;
        const filename = oldKey.split("/").pop();
        const newKey = `photos/${guernsey.id}/${filename}`;

        console.log(`\nMoving: ${oldKey} → ${newKey}`);

        // Copy to correct location
        await r2.send(new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${oldKey}`,
            Key: newKey,
        }));
        console.log("✓ Copied to new location");

        // Delete old key
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }));
        console.log("✓ Deleted original");

        // Update DB
        await prisma.photo.update({
            where: { id: photo.id },
            data: { r2Key: newKey },
        });
        console.log("✓ Updated DB record");
    }

    console.log("\n✅ Done!");
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
