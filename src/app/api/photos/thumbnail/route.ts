import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { getOraclePublicUrl, putOracleObject } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Allow up to 60s for massive images
export const maxDuration = 60;

/**
 * Build the storage key for a cached thumbnail.
 * e.g. "photos/foo.jpg" → "thumbs/photos/foo.jpg"
 */
function thumbnailKey(originalKey: string, width: number): string {
    return `thumbs/${width}/${originalKey}.jpg`;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const width = parseInt(searchParams.get("w") || "400", 10);

    if (!key) {
        return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    try {
        // Look up the photo record to check for a cached thumbnail
        const photo = await prisma.photo.findFirst({
            where: { r2Key: key },
            select: { id: true, r2Thumbnail: true, storageProvider: true },
        });

        const provider = photo?.storageProvider ?? "r2";

        // ── Serve cached thumbnail if available ──────────────────────
        if (photo?.r2Thumbnail) {
            if (provider === "oracle") {
                // Oracle is a public bucket — redirect directly
                return NextResponse.redirect(getOraclePublicUrl(photo.r2Thumbnail));
            }
            // R2: proxy the small cached file (no Sharp needed)
            const cached = await r2.send(new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: photo.r2Thumbnail,
            }));
            if (cached.Body) {
                const bytes = await cached.Body.transformToByteArray();
                return new NextResponse(new Uint8Array(bytes), {
                    headers: {
                        "Content-Type": "image/jpeg",
                        "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
                    },
                });
            }
        }

        // ── Oracle without cached thumbnail: redirect to original ────
        // (Oracle is a public bucket so we avoid proxying full images)
        if (provider === "oracle" && !photo?.r2Thumbnail) {
            // Generate + store thumbnail asynchronously, but serve redirect now
            // for the first request to avoid blocking
            const publicUrl = getOraclePublicUrl(key);

            // Fire-and-forget: generate thumbnail in the background
            // (Next request will use the cached version)
            generateAndCacheThumbnail(key, provider, width, photo?.id).catch(err =>
                console.error("Background thumbnail generation failed:", err.message)
            );

            return NextResponse.redirect(publicUrl);
        }

        // ── R2: generate, cache, and return ──────────────────────────
        const resized = await generateThumbnailFromR2(key, width);

        // Cache the generated thumbnail (fire-and-forget to not block response)
        if (photo?.id) {
            cacheThumbnailToR2(photo.id, key, width, resized).catch(err =>
                console.error("Thumbnail caching failed:", err.message)
            );
        }

        return new NextResponse(new Uint8Array(resized), {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
            },
        });
    } catch (error: any) {
        console.error("Thumbnail error for key:", key, "Error:", error.message);
        // Return a 1x1 transparent pixel as fallback so the UI doesn't break
        const fallback = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        return new NextResponse(new Uint8Array(fallback), {
            headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" },
        });
    }
}

/**
 * Download from R2 and resize via Sharp.
 */
async function generateThumbnailFromR2(key: string, width: number): Promise<Buffer> {
    const response = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    }));

    const body = response.Body;
    if (!body) throw new Error("Empty body from R2");

    const byteArray = await body.transformToByteArray();
    return sharp(byteArray, {
        limitInputPixels: false,
        sequentialRead: true,
        failOn: 'none',
    })
        .rotate()  // Auto-orient based on EXIF
        .resize({ width: Math.min(width, 1200), withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true, mozjpeg: true })
        .toBuffer();
}

/**
 * Store a generated thumbnail buffer to R2 and update the DB record.
 */
async function cacheThumbnailToR2(photoId: string, originalKey: string, width: number, buffer: Buffer): Promise<void> {
    const thumbKey = thumbnailKey(originalKey, width);
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: thumbKey,
        Body: buffer,
        ContentType: "image/jpeg",
    }));
    await prisma.photo.update({
        where: { id: photoId },
        data: { r2Thumbnail: thumbKey },
    });
}

/**
 * Generate a thumbnail for an Oracle photo and store it back to Oracle.
 */
async function generateAndCacheThumbnail(
    originalKey: string,
    provider: string,
    width: number,
    photoId: string | undefined,
): Promise<void> {
    if (!photoId) return;

    // For Oracle, we need to fetch the original via the public URL
    const publicUrl = getOraclePublicUrl(originalKey);
    const response = await fetch(publicUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${publicUrl}: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const resized = await sharp(Buffer.from(arrayBuffer), {
        limitInputPixels: false,
        sequentialRead: true,
        failOn: 'none',
    })
        .rotate()
        .resize({ width: Math.min(width, 1200), withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true, mozjpeg: true })
        .toBuffer();

    const thumbKey = thumbnailKey(originalKey, width);
    await putOracleObject(thumbKey, new Uint8Array(resized), "image/jpeg");
    await prisma.photo.update({
        where: { id: photoId },
        data: { r2Thumbnail: thumbKey },
    });
}
