import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

function isOwnerCheck(session: any) {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    return (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));
}

// POST grant a role access to an album
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, albumId } = await req.json();
    if (!roleId || !albumId) {
        return NextResponse.json({ error: "roleId and albumId required" }, { status: 400 });
    }

    const access = await prisma.roleAlbumAccess.upsert({
        where: { roleId_albumId: { roleId, albumId } },
        update: {},
        create: { roleId, albumId },
    });

    revalidateTag('roles', { expire: 0 });
    return NextResponse.json(access);
}

// DELETE revoke a role's access to an album
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    await prisma.roleAlbumAccess.delete({ where: { id } });

    revalidateTag('roles', { expire: 0 });
    return NextResponse.json({ success: true });
}
