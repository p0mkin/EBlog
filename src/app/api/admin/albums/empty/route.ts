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

/**
 * Recursively collects IDs of albums that are entirely empty
 * (no photos in themselves AND none in any descendant).
 */
async function collectEmptyAlbumIds(parentId: string | null, allAlbums: { id: string; parentId: string | null }[]): Promise<string[]> {
    const children = allAlbums.filter(a => a.parentId === parentId);
    const emptyIds: string[] = [];

    for (const child of children) {
        const descendantEmpty = await collectEmptyAlbumIds(child.id, allAlbums);
        // Count direct photos in this album
        const photoCount = await prisma.photo.count({ where: { albumId: child.id } });
        // If no direct photos AND all children are empty (i.e., all children are in emptyIds)
        const childIds = allAlbums.filter(a => a.parentId === child.id).map(a => a.id);
        const allChildrenEmpty = childIds.every(id => descendantEmpty.includes(id));

        if (photoCount === 0 && allChildrenEmpty) {
            // Collect this subtree bottom-up
            emptyIds.push(...descendantEmpty.filter(id => !emptyIds.includes(id)));
            emptyIds.push(child.id);
        }
    }

    return emptyIds;
}

// DELETE /api/admin/albums/empty — remove all recursively empty albums
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const allAlbums = await prisma.album.findMany({ select: { id: true, parentId: true } });
        const emptyIds = await collectEmptyAlbumIds(null, allAlbums);

        if (emptyIds.length === 0) {
            return NextResponse.json({ deleted: 0, message: "No empty albums found" });
        }

        // Delete permissions rows first (FK constraint), then albums
        await prisma.albumPermission.deleteMany({ where: { albumId: { in: emptyIds } } });
        const { count } = await prisma.album.deleteMany({ where: { id: { in: emptyIds } } });

        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ deleted: count, ids: emptyIds });
    } catch (err: any) {
        console.error("Delete empty albums error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
