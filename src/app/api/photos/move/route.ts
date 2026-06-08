/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

// POST /api/photos/move — move photo to a different album
// Accepts { photoId, albumId } in body to avoid path-segment issues with slashes in IDs
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { photoId, albumId } = await req.json();

    if (!photoId || !albumId) {
        return NextResponse.json({ error: "Missing photoId or albumId" }, { status: 400 });
    }

    try {
        const photo = await prisma.photo.update({
            where: { id: photoId },
            data: { albumId },
        });
        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json(photo);
    } catch (err: any) {
        console.error("Move photo error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
