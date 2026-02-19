import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

function isOwnerCheck(session: any) {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    return (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));
}

// PATCH /api/photos/[id]/move  — move photo to a different album
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { albumId } = await req.json();

    if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

    const photo = await prisma.photo.update({
        where: { id },
        data: { albumId },
    });
    return NextResponse.json(photo);
}
