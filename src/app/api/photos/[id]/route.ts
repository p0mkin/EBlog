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

// DELETE /api/photos/[id] — delete a photo from storage and database
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // 1. Find photo to get storage details
        const photo = await prisma.photo.findUnique({
            where: { id },
            select: { id: true, r2Key: true, storageProvider: true }
        });

        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        // 2. Delete from Storage Provider
        // Note: We don't stop if storage delete fails, we try to clean up the DB anyway,
        // but we log errors.
        try {
            if (photo.storageProvider === "oracle") {
                await oracle.send(new DeleteObjectCommand({
                    Bucket: process.env.ORACLE_BUCKET_NAME,
                    Key: photo.r2Key,
                }));
            } else {
                // Default to R2
                await r2.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: photo.r2Key,
                }));
            }
        } catch (storageErr) {
            console.error(`Failed to delete file from ${photo.storageProvider}:`, storageErr);
            // We continue to delete from DB so the UI isn't broken
        }

        // 3. Delete from Database
        await prisma.photo.delete({ where: { id } });

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        console.error("Delete photo error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
