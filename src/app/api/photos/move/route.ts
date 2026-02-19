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

// POST /api/photos/move — move photo to a different album
// Accepts { photoId, albumId } in body to avoid path-segment issues with slashes in IDs
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { photoId, albumId } = await req.json();

    if (!photoId || !albumId) {
        return NextResponse.json({ error: "Missing photoId or albumId" }, { status: 400 });
    }

    try {
        const photo = await prisma.photo.update({
            where: { id: photoId },
            data: { albumId },
        });
        return NextResponse.json(photo);
    } catch (err: any) {
        console.error("Move photo error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
