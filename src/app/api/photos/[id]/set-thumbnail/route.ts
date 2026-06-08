/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import r2 from "@/lib/r2";
import { putOracleObject } from "@/lib/oracle";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";
import sharp from "sharp";

export const maxDuration = 30;

/**
 * POST /api/photos/[id]/set-thumbnail
 * Owner uploads a captured video frame (base64 JPEG) to use as the thumbnail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const { frameData } = await req.json();
        if (!frameData) {
            return NextResponse.json({ error: "Missing frameData" }, { status: 400 });
        }

        // Find the photo record
        const photo = await prisma.photo.findUnique({
            where: { id },
            select: { id: true, r2Key: true, storageProvider: true },
        });
        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        // Decode the base64 frame data
        const base64Data = frameData.replace(/^data:image\/\w+;base64,/, "");
        const frameBuffer = Buffer.from(base64Data, "base64");

        // Resize with Sharp to create a proper thumbnail
        const thumbnailBuffer = await sharp(frameBuffer, {
            limitInputPixels: false,
            failOn: "none",
        })
            .resize({ width: 600, withoutEnlargement: true })
            .jpeg({ quality: 92, progressive: true, mozjpeg: true })
            .toBuffer();

        // Store the thumbnail
        const thumbKey = `thumbs/600/${photo.r2Key}.jpg`;

        if (photo.storageProvider === "oracle") {
            await putOracleObject(thumbKey, new Uint8Array(thumbnailBuffer), "image/jpeg");
        } else {
            await r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: thumbKey,
                Body: thumbnailBuffer,
                ContentType: "image/jpeg",
            }));
        }

        // Update the DB record
        await prisma.photo.update({
            where: { id },
            data: { r2Thumbnail: thumbKey },
        });

        revalidateTag("photos", { expire: 0 } as any);
        return NextResponse.json({ success: true, thumbnailKey: thumbKey });
    } catch (error: any) {
        console.error("Set thumbnail error:", error);
        return NextResponse.json({ error: error.message || "Failed to set thumbnail" }, { status: 500 });
    }
}
