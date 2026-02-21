import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { putOracleObject } from "@/lib/oracle";
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

// Proxied upload — Oracle only (R2 uses presigned URLs via /api/photos/sign)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const albumId = formData.get("albumId") as string;
        const provider = (formData.get("provider") as string) || "r2";

        if (!file || !albumId) {
            return NextResponse.json({ error: "Missing file or albumId" }, { status: 400 });
        }

        if (provider !== "oracle") {
            return NextResponse.json({ error: "R2 uploads use presigned URLs — call /api/photos/sign" }, { status: 400 });
        }

        // Build slug path for the key
        let pathParts: string[] = [];
        let currentAlbumId: string | null = albumId;

        // Traverse up to root to build path: root/child/subchild
        while (currentAlbumId) {
            const album: { id: string; slug: string; parentId: string | null } | null = await prisma.album.findUnique({
                where: { id: currentAlbumId },
                select: { id: true, slug: true, parentId: true }
            });
            if (!album) break;
            pathParts.unshift(album.slug);
            currentAlbumId = album.parentId;
        }

        // If for some reason album not found, fallback to 'uploads'
        const folderPath = pathParts.length > 0 ? pathParts.join("/") : "uploads";
        const key = `${folderPath}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const arrayBuffer = await file.arrayBuffer();
        const body = new Uint8Array(arrayBuffer);

        await putOracleObject(key, body, file.type);

        // Save metadata
        const photo = await prisma.photo.create({
            data: {
                albumId,
                filename: file.name,
                r2Key: key,
                storageProvider: "oracle",
                fileSize: file.size,
                visibility: 'visible',
            },
        });

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true, photo });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
