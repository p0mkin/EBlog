import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import r2 from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Album } from "@prisma/client";

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
                } else if (found.name !== albumName) {
                    found = await prisma.album.update({
                        where: { id: found.id },
                        data: { name: albumName }
                    });
                }

                lastAlbumId = found.id;
            }

            // 2. Photo Upsert (Default to a "Root" album if no folders exist)
            // But usually we want them in the folder they were found in.
            if (!lastAlbumId) {
                // If there's no folder, create a "General" album or skip?
                // For now, let's create a "General" album for root photos
                let rootAlbum = await prisma.album.findFirst({ where: { slug: 'general', parentId: null } });
                if (!rootAlbum) {
                    rootAlbum = await prisma.album.create({
                        data: { name: 'General', slug: 'general', visibility: 'private' }
                    });
                }
                lastAlbumId = rootAlbum.id;
            }

            await prisma.photo.upsert({
                where: { id: `r2-${obj.Key}` },
                update: { filename, fileSize: obj.Size || 0, r2Key: obj.Key },
                create: {
                    id: `r2-${obj.Key}`,
                    albumId: lastAlbumId,
                    filename,
                    r2Key: obj.Key,
                    fileSize: obj.Size || 0,
                    visibility: "visible",
                },
            });
            syncCount++;
        }

        console.log(`Sync completed. Processed ${syncCount} photos.`);
        return NextResponse.json({ success: true, message: `Sync successful. Processed ${syncCount} photos.` });
    } catch (error: any) {
        console.error("Critical Sync error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync" }, { status: 500 });
    }
}
