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

// PATCH /api/photos/[id]/order  — update sortOrder
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { sortOrder } = await req.json();

    const photo = await prisma.photo.update({
        where: { id },
        data: { sortOrder },
    });
    return NextResponse.json(photo);
}
