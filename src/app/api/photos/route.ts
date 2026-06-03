import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";
import { getDownloadUrl } from "@/lib/r2";
import { processImageMetadata } from "@/lib/photo-processor";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { albumId, filename, r2Key, fileSize, width, height, storageProvider, mediaType, duration } = await req.json();

        if (!albumId || !filename || !r2Key || !fileSize) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let lat = null;
        let lng = null;
        let takenAt = null;
        let takenAtRaw = null;
        let phash = null;
        let duplicateWarning = false;

        if (mediaType === "image") {
            try {
                const url = await getDownloadUrl(r2Key);
                const r2Res = await fetch(url);
                if (r2Res.ok) {
                    const buffer = Buffer.from(await r2Res.arrayBuffer());
                    const meta = await processImageMetadata(buffer, albumId);
                    lat = meta.lat;
                    lng = meta.lng;
                    takenAt = meta.takenAt;
                    takenAtRaw = meta.takenAtRaw;
                    phash = meta.phash;
                    duplicateWarning = meta.isDuplicate;
                }
            } catch (r2Err) {
                console.error("Failed to process R2 image metadata:", r2Err);
            }
        }

        const photo = await prisma.photo.create({
            data: {
                albumId,
                filename,
                r2Key,
                fileSize,
                width,
                height,
                storageProvider: storageProvider || "r2",
                mediaType: mediaType || "image",
                duration: duration || null,
                visibility: 'visible',
                lat,
                lng,
                takenAt,
                takenAtRaw,
                phash
            },
        });

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ photo, duplicateWarning });
    } catch (error) {
        console.error("Save photo error:", error);
        return NextResponse.json({ error: "Failed to save photo metadata" }, { status: 500 });
    }
}
