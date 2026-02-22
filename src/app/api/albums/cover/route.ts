import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

// POST set cover photo for an album
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { albumId, coverPhotoId } = await req.json();
    if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });

    const album = await prisma.album.update({
        where: { id: albumId },
        data: { coverPhotoId: coverPhotoId || null },
    });

    revalidateTag('albums', { expire: 0 });
    return NextResponse.json(album);
}
