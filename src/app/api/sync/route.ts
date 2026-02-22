import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import r2 from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Album } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

/**
 * Prefixes to exclude from sync — these are generated data, not user photos.
 */
const EXCLUDED_PREFIXES = ["thumbs/"];

export async function POST() {
    const session = await getServerSession(authOptions);

    if (!isOwner(session)) {
        console.warn(`Sync denied for user: ${session?.user?.email}. Owner configured via OWNER_EMAIL / OWNER_USERNAME env vars.`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting R2 Sync...");

        // ── Step 1: Paginated R2 listing (handles >1000 objects) ─────
        const allObjects: { Key: string; Size: number }[] = [];
        let continuationToken: string | undefined;

        do {
            const command = new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME,
                ContinuationToken: continuationToken,
            });

            const response = await r2.send(command);
            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (!obj.Key || obj.Key.endsWith("/")) continue;

                    // Skip excluded prefixes (thumbs/, etc.)
                    const isExcluded = EXCLUDED_PREFIXES.some(p => obj.Key!.startsWith(p));
                    if (isExcluded) continue;

                    allObjects.push({ Key: obj.Key, Size: obj.Size || 0 });
                }
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        console.log(`Found ${allObjects.length} photo objects in R2 (excluded thumbs).`);

        if (allObjects.length === 0) {
            return NextResponse.json({ success: true, message: "No photos found in bucket." });
        }

        // ── Step 2: Pre-load all existing photos in one query ────────
        const existingPhotos = await prisma.photo.findMany({
            where: {
                r2Key: { in: allObjects.map(o => o.Key) },
            },
            select: { id: true, r2Key: true, albumId: true },
        });
        const existingMap = new Map(existingPhotos.map(p => [p.r2Key, p]));

        // ── Step 3: Pre-load all existing albums in one query ────────
        const existingAlbums = await prisma.album.findMany({
            select: { id: true, slug: true, parentId: true },
        });
        // Build a lookup: "parentId|slug" → Album
        const albumLookup = new Map<string, Album>();
        for (const album of existingAlbums) {
            albumLookup.set(`${album.parentId || "null"}|${album.slug}`, album as Album);
        }

        // ── Step 4: Process objects ─────────────────────────────────
        const photosToCreate: {
            albumId: string;
            filename: string;
            r2Key: string;
            fileSize: number;
            visibility: string;
        }[] = [];

        const photosToUpdate: {
            id: string;
            fileSize: number;
        }[] = [];

        let albumsCreated = 0;

        for (const obj of allObjects) {
            const parts = obj.Key.split("/");
            const filename = parts.pop() || "";
            const albumPath = parts;

            // Resolve or create album hierarchy
            let lastAlbumId: string | null = null;
            for (const albumName of albumPath) {
                const slug = albumName.toLowerCase().replace(/\s+/g, '-');
                const lookupKey = `${lastAlbumId || "null"}|${slug}`;

                let album = albumLookup.get(lookupKey);
                if (!album) {
                    // Create album and add to lookup
                    album = await prisma.album.create({
                        data: {
                            name: albumName,
                            slug,
                            parentId: lastAlbumId ?? null,
                            visibility: "private",
                        },
                    }) as Album;
                    albumLookup.set(lookupKey, album);
                    albumsCreated++;
                }

                lastAlbumId = album.id;
            }

            const existing = existingMap.get(obj.Key);
            if (existing) {
                // Photo already exists — only update file size, NOT albumId.
                // The website is the source of truth for album assignments.
                if (existing.albumId !== lastAlbumId) {
                    // Photo exists but in a different album — keep the website assignment.
                    // Only update fileSize if it changed.
                    photosToUpdate.push({ id: existing.id, fileSize: obj.Size });
                } else {
                    photosToUpdate.push({ id: existing.id, fileSize: obj.Size });
                }
            } else {
                // New photo — assign to the album from R2 path
                photosToCreate.push({
                    albumId: lastAlbumId || "",
                    filename,
                    r2Key: obj.Key,
                    fileSize: obj.Size,
                    visibility: "visible",
                });
            }
        }

        // ── Step 5: Batch create new photos ─────────────────────────
        let createdCount = 0;
        if (photosToCreate.length > 0) {
            const result = await prisma.photo.createMany({
                data: photosToCreate,
                skipDuplicates: true,
            });
            createdCount = result.count;
        }

        // ── Step 6: Batch update existing photos (file size only) ────
        // Prisma doesn't support batch updates with different values,
        // so we batch them in groups to limit DB roundtrips
        const BATCH_SIZE = 50;
        for (let i = 0; i < photosToUpdate.length; i += BATCH_SIZE) {
            const batch = photosToUpdate.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(p =>
                    prisma.photo.update({
                        where: { id: p.id },
                        data: { fileSize: p.fileSize },
                    })
                )
            );
        }

        const message = `Sync complete. ${createdCount} new photos imported, ${photosToUpdate.length} existing updated, ${albumsCreated} albums created.`;
        console.log(message);

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        console.error("Critical Sync error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync" }, { status: 500 });
    }
}
