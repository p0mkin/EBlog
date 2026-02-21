import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getUploadUrl } from "@/lib/r2";
import { getOracleUploadUrl } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";

// Fallback MIME types for files where the browser returns empty file.type
function resolveContentType(contentType: string | undefined, filename: string): string {
    if (contentType) return contentType;
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
        heic: 'image/heic',
        heif: 'image/heif',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        avif: 'image/avif',
        tiff: 'image/tiff',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { filename, contentType: rawContentType, albumId, provider } = await req.json();

        if (!filename || !albumId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const contentType = resolveContentType(rawContentType, filename);

        // Build slug path matching the upload route pattern
        let pathParts: string[] = [];
        let currentAlbumId: string | null = albumId;

        while (currentAlbumId) {
            const album: { id: string; slug: string; parentId: string | null } | null = await prisma.album.findUnique({
                where: { id: currentAlbumId },
                select: { id: true, slug: true, parentId: true }
            });
            if (!album) break;
            pathParts.unshift(album.slug);
            currentAlbumId = album.parentId;
        }

        const folderPath = pathParts.length > 0 ? pathParts.join("/") : "uploads";
        const key = `${folderPath}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const uploadUrl = provider === "oracle"
            ? await getOracleUploadUrl(key, contentType)
            : await getUploadUrl(key, contentType);

        return NextResponse.json({ uploadUrl, key });
    } catch (error) {
        console.error("Signing error:", error);
        return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }
}
