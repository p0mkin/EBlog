import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { albumId, filename, r2Key, fileSize, width, height, storageProvider } = await req.json();

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
