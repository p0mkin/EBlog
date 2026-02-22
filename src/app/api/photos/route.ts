import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

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
            },
        });

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json(photo);
    } catch (error) {
        console.error("Save photo error:", error);
        return NextResponse.json({ error: "Failed to save photo metadata" }, { status: 500 });
    }
}
