import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";

// PATCH /api/photos/[id]/move  — move photo to a different album
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { albumId } = await req.json();

    if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

    const photo = await prisma.photo.update({
        where: { id },
        data: { albumId },
    });
    revalidateTag('photos', { expire: 0 });
    revalidateTag('albums', { expire: 0 });
    return NextResponse.json(photo);
}
