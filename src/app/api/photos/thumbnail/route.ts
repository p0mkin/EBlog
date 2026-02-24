import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { getOraclePublicUrl, putOracleObject } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createHmac } from 'crypto';

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
    const id = searchParams.get("id");
    const blur = searchParams.get("blur") === "true";
    const sig = searchParams.get("sig");
    const width = parseInt(searchParams.get("w") || "400", 10);

    if (!key && !id) {
        return NextResponse.json({ error: "Missing key or id" }, { status: 400 });
    }

    if (id && !key) {
        const expectedSig = createHmac('sha256', process.env.NEXTAUTH_SECRET || "fallback")
            .update(`${id}_${blur}`)
            .digest('hex');

        if (sig !== expectedSig) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
    }

    try {
        // Look up the photo record to check for a cached thumbnail
        const photo = await prisma.photo.findFirst({
            where: id ? { id } : { r2Key: key! },
            select: { id: true, r2Key: true, r2Thumbnail: true, storageProvider: true, mediaType: true },
        });

        if (!photo && id) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        const actualKey = photo?.r2Key || key!;
        const provider = photo?.storageProvider ?? "r2";
        const isVideo = photo?.mediaType === "video";

        const serveBuffer = async (bufferData: Uint8Array | Buffer) => {
            const buf = Buffer.from(bufferData);
            if (blur) {
                const blurred = await sharp(buf)
                    .resize(20, null, { withoutEnlargement: true })
                    .blur(5)
                    .jpeg({ quality: 20 })
                    .toBuffer();
                return new NextResponse(blurred as any, {
                    headers: {
                        "Content-Type": "image/jpeg",
                        "Cache-Control": "public, max-age=31536000",
                    },
                });
            }
            return new NextResponse(buf as any, {
                headers: {
                    "Content-Type": "image/jpeg",
                    "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
                },
            });
        };

        // ── Serve cached thumbnail if available ──────────────────────
        if (photo?.r2Thumbnail) {
            try {
                if (provider === "oracle") {
                    const oracleUrl = getOraclePublicUrl(photo.r2Thumbnail);

                    if (blur) {
                        const resp = await fetch(oracleUrl);
                        if (!resp.ok) throw new Error("Oracle thumbnail fetch failed");
                        const bytes = await resp.arrayBuffer();
                        return serveBuffer(new Uint8Array(bytes));
                    }

                    // Verify the thumbnail exists before redirecting
                    const headCheck = await fetch(oracleUrl, { method: "HEAD" });
                    if (headCheck.ok) {
                        return NextResponse.redirect(oracleUrl);
                    }
                    throw new Error("Oracle thumbnail not found");
                }
                // R2: proxy the small cached file
                const cached = await r2.send(new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: photo.r2Thumbnail,
                }));
                if (cached.Body) {
                    const bytes = await cached.Body.transformToByteArray();
                    return serveBuffer(new Uint8Array(bytes));
                }
                throw new Error("Empty body from cached thumbnail");
            } catch (cachedErr: any) {
                // Cached thumbnail file is missing — clear stale reference and regenerate
                console.warn(`Cached thumbnail missing for ${actualKey}, regenerating. Error: ${cachedErr.message}`);
                prisma.photo.update({
                    where: { id: photo.id },
                    data: { r2Thumbnail: null },
                }).catch(e => console.error("Failed to clear stale r2Thumbnail:", e.message));
            }
        }

        // ── Video without cached thumbnail: return placeholder ───────
        if (isVideo) {
            const placeholder = await generateVideoPlaceholder(width);
            return serveBuffer(new Uint8Array(placeholder));
        }

        // ── Oracle without cached thumbnail: redirect to original ────
        // (Oracle is a public bucket so we avoid proxying full images)
        if (provider === "oracle" && !photo?.r2Thumbnail) {
            const publicUrl = getOraclePublicUrl(actualKey);

            // Fire-and-forget: generate thumbnail in the background
            generateAndCacheThumbnail(actualKey, provider, width, photo?.id).catch(err =>
                console.error("Background thumbnail generation failed:", err.message)
            );

            if (blur) {
                const resp = await fetch(publicUrl);
                if (!resp.ok) throw new Error("Oracle full image fetch failed for blur");
                const bytes = await resp.arrayBuffer();
                return serveBuffer(new Uint8Array(bytes));
            }

            return NextResponse.redirect(publicUrl);
        }

        // ── R2: generate, cache, and return ──────────────────────────
        const resized = await generateThumbnailFromR2(actualKey, width);

        // Cache the generated thumbnail (fire-and-forget to not block response)
        if (photo?.id) {
            cacheThumbnailToR2(photo.id, actualKey, width, resized).catch(err =>
                console.error("Thumbnail caching failed:", err.message)
            );
        }

        return serveBuffer(new Uint8Array(resized));
    } catch (error: any) {
        console.error("Thumbnail error for key/id:", key || id, "Error:", error.message);
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
        .jpeg({ quality: 92, progressive: true, mozjpeg: true })
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
        .jpeg({ quality: 92, progressive: true, mozjpeg: true })
        .toBuffer();

    const thumbKey = thumbnailKey(originalKey, width);
    await putOracleObject(thumbKey, new Uint8Array(resized), "image/jpeg");
    await prisma.photo.update({
        where: { id: photoId },
        data: { r2Thumbnail: thumbKey },
    });
}

/**
 * Generate a dark placeholder image with a play icon for videos without thumbnails.
 */
async function generateVideoPlaceholder(width: number): Promise<Buffer> {
    const w = Math.min(width, 600);
    const h = Math.round(w * 9 / 16); // 16:9 aspect ratio
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.12;
    const triSize = r * 0.7;

    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1a1a2e"/>
                <stop offset="100%" stop-color="#0a0a0a"/>
            </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#bg)"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
        <polygon points="${cx - triSize * 0.4},${cy - triSize} ${cx - triSize * 0.4},${cy + triSize} ${cx + triSize * 0.8},${cy}" fill="rgba(255,255,255,0.5)"/>
    </svg>`;

    return sharp(Buffer.from(svg))
        .jpeg({ quality: 80 })
        .toBuffer();
}

