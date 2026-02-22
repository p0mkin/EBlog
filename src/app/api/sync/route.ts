import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Album } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";
import { getAllStorageObjects } from "@/lib/sync-utils";

/** File extensions recognized as video media */
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi", "mkv", "ogg", "m4v", "wmv"]);

export async function POST() {
    const session = await getServerSession(authOptions);

    if (!isOwner(session)) {
        console.warn(`Sync denied for user: ${session?.user?.email}. Owner configured via OWNER_EMAIL / OWNER_USERNAME env vars.`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting Sync (R2 + Oracle)...");

        // ── Step 1: Fetch objects from all providers ─────────────────────────
        const allObjects = await getAllStorageObjects();

        if (allObjects.length === 0) {
            return NextResponse.json({ success: true, message: "No media found in any bucket." });
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
        const albumLookup = new Map<string, Album>();
        for (const album of existingAlbums) {
            albumLookup.set(`${album.parentId || "null"}|${album.slug}`, album as Album);
        }

        // ── Step 3b: Resolve a fallback album for root-level files ──
        let uncategorizedAlbumId: string | null = null;
        const getUncategorizedAlbum = async () => {
            if (uncategorizedAlbumId) return uncategorizedAlbumId;
            const slug = "uncategorized";
            const lookupKey = `null|${slug}`;
            let album = albumLookup.get(lookupKey);
            if (!album) {
                album = await prisma.album.create({
                    data: { name: "Uncategorized", slug, parentId: null, visibility: "private" },
                }) as Album;
                albumLookup.set(lookupKey, album);
            }
            uncategorizedAlbumId = album.id;
            return uncategorizedAlbumId;
        };

        // ── Step 4: Process objects ─────────────────────────────────
        const photosToCreate: {
            albumId: string;
            filename: string;
            r2Key: string;
            fileSize: number;
            visibility: string;
            mediaType: string;
            storageProvider: string;
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
                photosToUpdate.push({ id: existing.id, fileSize: obj.Size });
            } else {
                const ext = filename.split('.').pop()?.toLowerCase() || '';
                const mediaType = VIDEO_EXTENSIONS.has(ext) ? 'video' : 'image';
                photosToCreate.push({
                    albumId: lastAlbumId || await getUncategorizedAlbum(),
                    filename,
                    r2Key: obj.Key,
                    fileSize: obj.Size,
                    visibility: "visible",
                    mediaType,
                    storageProvider: obj.provider,
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

        // ── Step 7: Clean up empty albums ───────────────────────────
        // Remove albums that have zero photos AND zero child albums.
        // Repeat until no more empty leaves (handles nested empty dirs).
        let totalEmptyDeleted = 0;
        let emptyDeleted: number;
        do {
            const emptyAlbums = await prisma.album.findMany({
                where: {
                    photos: { none: {} },
                    children: { none: {} },
                },
                select: { id: true },
            });
            emptyDeleted = emptyAlbums.length;
            if (emptyDeleted > 0) {
                // Clean up related records first, then delete albums
                const emptyIds = emptyAlbums.map(a => a.id);
                await prisma.albumPermission.deleteMany({ where: { albumId: { in: emptyIds } } });
                await prisma.roleAlbumAccess.deleteMany({ where: { albumId: { in: emptyIds } } });
                await prisma.album.deleteMany({ where: { id: { in: emptyIds } } });
                totalEmptyDeleted += emptyDeleted;
            }
        } while (emptyDeleted > 0);

        if (totalEmptyDeleted > 0) {
            console.log(`Cleaned up ${totalEmptyDeleted} empty albums.`);
        }

        const message = `Sync complete. ${createdCount} new imported, ${photosToUpdate.length} existing updated, ${albumsCreated} albums created, ${totalEmptyDeleted} empty albums removed.`;
        console.log(message);

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, message });
    } catch (error: unknown) {
        console.error("Critical Sync error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to sync" }, { status: 500 });
    }
}

