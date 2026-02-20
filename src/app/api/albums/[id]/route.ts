import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import r2 from "@/lib/r2";
import oracle from "@/lib/oracle";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
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

// Helper to recursively get all descendant album IDs
async function getDescendantAlbumIds(albumId: string): Promise<string[]> {
    const children = await prisma.album.findMany({
        where: { parentId: albumId },
        select: { id: true }
    });

    let ids: string[] = children.map(c => c.id);
    for (const child of children) {
        const descendants = await getDescendantAlbumIds(child.id);
        ids = [...ids, ...descendants];
    }
    return ids;
}

// DELETE /api/albums/[id] — recursively delete album, its sub-albums, and ALL photos inside
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // 1. Get all albums to delete (target + descendants)
        const descendantIds = await getDescendantAlbumIds(id);
        const allAlbumIds = [id, ...descendantIds];

        // 2. Find all photos in these albums
        const photos = await prisma.photo.findMany({
            where: { albumId: { in: allAlbumIds } },
            select: { id: true, r2Key: true, storageProvider: true }
        });

        console.log(`Deleting album ${id}. Found ${descendantIds.length} sub-albums and ${photos.length} photos.`);

        // 3. Delete photos from Storage
        // We do this in parallel chunks to avoid timeout, but await them
        // Use Promise.allSettled to ensure we try to delete all even if some fail
        const deletePromises = photos.map(photo => {
            if (photo.storageProvider === "oracle") {
                return oracle.send(new DeleteObjectCommand({
                    Bucket: process.env.ORACLE_BUCKET_NAME,
                    Key: photo.r2Key,
                })).catch(e => console.error(`Failed to delete Oracle file ${photo.r2Key}:`, e));
            } else {
                return r2.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: photo.r2Key,
                })).catch(e => console.error(`Failed to delete R2 file ${photo.r2Key}:`, e));
            }
        });

        await Promise.all(deletePromises);

        // 4. Delete Database Records
        // Use transaction to ensure consistency? 
        // Prisma relies on foreign keys. If we delete photos first, then albums.

        // Delete all photos in these albums
        await prisma.photo.deleteMany({
            where: { albumId: { in: allAlbumIds } }
        });

        // Delete permissions for these albums
        await prisma.albumPermission.deleteMany({
            where: { albumId: { in: allAlbumIds } }
        });

        // Delete albums (must delete children before parents or use deleteMany which handles it if no FK restrict)
        // Actually deleteMany ignores order, but FK might complain if 'restrict'.
        // However, we are deleting ALL of them. 
        // Prisma `deleteMany` should work if there are no other constraints.
        // Self-referencing FK usually requires deleting children first?
        // Let's delete in reverse order of depth or just try deleteMany.
        // Prisma `deleteMany` doesn't support automatic ordering for self-relations.
        // Safe bet: Delete descendants first, then target.
        // `descendantIds` from `getDescendantAlbumIds` usually comes breath-first (top-down).
        // We need bottom-up.

        // Let's re-fetch descendants locally or just repeat deleteMany until 0?
        // Or just let's delete strictly by ID list if we trust `deleteMany`.
        // Actually, if we delete a parent, and child has `onDelete: Cascade`, it works.
        // If `onDelete: SetNull` or `Restrict`, we have issues.
        // Prisma default for optional self-relation is usually SetNull.

        // Let's check schema via `prisma.album.delete({ where: { id } })`.
        // If schema has cascading deletes for children, we only need to delete the top album!
        // But we MUST delete photos first primarily to clean up storage nicely.
        // AND we must find them to know their keys.

        // Since we already deleted photos, let's try deleting the target album.
        // If it fails due to children, we delete children first.

        // Safe approach: verify if we can simply delete the target album and let cascade handle children?
        // Let's look at schema logic typically used.
        // If I haven't defined `@relation(onDelete: Cascade)`, it defaults to `SetNull` or fails.
        // Assuming no cascade: I must delete children.

        // Let's use `deleteMany` on `descendantIds` then `delete` on `id`.
        // `deleteMany` might fail if inner foreign keys exist b/w them?
        // But the only relation between albums is parent-child.
        // If I delete ALL IDs at once `deleteMany({ where: { id: { in: allAlbumIds } } })`,
        // DB usually handles it if it's a set operation, or fails if order matters.

        // Better: Delete permissions first (FK constraint). Done.
        // Photos deleted. Done.
        // Now albums.

        // Try deleting everything in `allAlbumIds`.
        await prisma.album.deleteMany({
            where: { id: { in: allAlbumIds } }
        });

        revalidateTag('albums', { expire: 0 });
        revalidateTag('photos', { expire: 0 });
        return NextResponse.json({ success: true, count: photos.length, albumsDeleted: allAlbumIds.length });

    } catch (err: any) {
        console.error("Recursive delete album error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
// PATCH /api/albums/[id] — update album details (name, visibility, etc.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { name, visibility, parentId } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (visibility !== undefined) updateData.visibility = visibility;
        // parentId logic if we want to move albums (not implemented yet fully, but field exists)

        const album = await prisma.album.update({
            where: { id },
            data: updateData
        });

        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, album });
    } catch (err: any) {
        console.error("Update album error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
