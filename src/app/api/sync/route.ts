import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import r2 from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Album } from "@prisma/client";
import { revalidateTag } from "next/cache";

export async function POST() {
    const session = await getServerSession(authOptions);
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();

    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = (session?.user as any)?.name?.toLowerCase().trim();

    const isOwner = (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) {
        console.warn(`Sync denied for user: ${userEmail || userUsername || userName}. Owner set as: ${ownerEmail} / ${ownerUsername}`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting Recursive R2 Sync...");
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
        });

        const { Contents: objects } = await r2.send(command).catch(err => {
            console.error("R2 Connection failed:", err);
            throw new Error(`R2 connection failed: ${err.message}`);
        });

        console.log(`Found ${objects?.length || 0} objects in bucket: ${process.env.R2_BUCKET_NAME}`);

        if (!objects) {
            return NextResponse.json({ success: true, message: "Bucket is empty" });
        }

        let syncCount = 0;
        for (const obj of objects) {
            if (!obj.Key || obj.Key.endsWith("/")) continue;

            const parts = obj.Key.split("/");
            const filename = parts.pop() || "";
            const albumPath = parts;

            // 1. Recursive Album Creation
            let lastAlbumId: string | null = null;
            for (const albumName of albumPath) {
                const slug = albumName.toLowerCase().replace(/\s+/g, '-');

                // Explicitly type to satisfy TS7022
                let found: Album | null = await prisma.album.findFirst({
                    where: { parentId: lastAlbumId ?? null, slug }
                });

                if (!found) {
                    found = await prisma.album.create({
                        data: {
                            name: albumName,
                            slug,
                            parentId: lastAlbumId ?? null,
                            visibility: "private",
                        },
                    });
                }
                // If album already exists, keep its current name (user may have renamed it)

                lastAlbumId = found.id;
            }

            // 2. Photo Upsert
            // Verify if photo already exists by KEY to avoid duplicates (since ID might differ)
            const existingPhoto = await prisma.photo.findFirst({
                where: { r2Key: obj.Key },
                select: { id: true }
            });

            const photoData = {
                albumId: lastAlbumId || undefined, // undefined keeps it if not set, but we set it above
                filename,
                r2Key: obj.Key,
                fileSize: obj.Size || 0,
                // Only set visibility if creating new
            };

            if (existingPhoto) {
                // Update existing photo (e.g. file size or album if moved in R2)
                await prisma.photo.update({
                    where: { id: existingPhoto.id },
                    data: {
                        fileSize: obj.Size || 0,
                        // Optional: update albumId if we want R2 structure to dictate album?
                        // Yes, Sync usually implies R2 is source of truth.
                        albumId: lastAlbumId || undefined,
                    }
                });
            } else {
                // Create new photo with deterministic ID from key (for future imports) 
                // OR let it be random CUID. 
                // Using `r2-` prefix for ID helps identify imported photos but caused issues with slashes.
                // Better to use a hash or just let Prisma make a CUID.
                // BUT if we run Sync again, we need to find it by key. We just added that check above.
                // So using CUID is fine now!
                await prisma.photo.create({
                    data: {
                        albumId: lastAlbumId || "", // Must have album
                        filename,
                        r2Key: obj.Key,
                        fileSize: obj.Size || 0,
                        visibility: "visible",
                    }
                });
            }
            syncCount++;
        }

        console.log(`Sync completed. Processed ${syncCount} photos.`);
        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, message: `Sync successful. Processed ${syncCount} photos.` });
    } catch (error: any) {
        console.error("Critical Sync error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync" }, { status: 500 });
    }
}
