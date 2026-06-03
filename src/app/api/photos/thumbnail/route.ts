import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { putOracleObject, getOracleDownloadUrl } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createHmac } from 'crypto';
import { canAccessAlbum } from "@/lib/auth-utils";
import { getThumbnailSignatureSecret } from "@/lib/thumbnail-signature";

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
        const expectedSig = createHmac('sha256', getThumbnailSignatureSecret())
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
            select: { id: true, r2Key: true, r2Thumbnail: true, storageProvider: true, mediaType: true, filename: true, albumId: true },
        });

        if (!photo && id) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }
        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        const canAccess = await canAccessAlbum(session, photo.albumId);
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const actualKey = photo.r2Key;
        const provider = photo.storageProvider ?? "r2";
        const isVideo = photo.mediaType === "video";
        const isFile = photo.mediaType === "file";

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

        if (isFile) {
            const ext = photo.filename?.split('.').pop()?.toLowerCase() || 'file';
            const placeholder = await generateFilePlaceholder(width, ext, photo.filename || 'File');
            return serveBuffer(new Uint8Array(placeholder));
        }

        // ── Serve cached thumbnail if available ──────────────────────
        if (photo?.r2Thumbnail) {
            try {
                if (provider === "oracle") {
                    const oracleUrl = await getOracleDownloadUrl(photo.r2Thumbnail);
                    const resp = await fetch(oracleUrl);
                    if (!resp.ok) throw new Error("Oracle thumbnail fetch failed");
                    const bytes = await resp.arrayBuffer();
                    
                    if (blur) {
                        const blurred = await sharp(Buffer.from(bytes))
                            .resize(20, null, { withoutEnlargement: true })
                            .blur(5)
                            .jpeg({ quality: 20 })
                            .toBuffer();
                        return new NextResponse(blurred as any, {
                            headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000" },
                        });
                    }

                    return serveBuffer(new Uint8Array(bytes));
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
                photo.r2Thumbnail = null; // Fix: mutate the in-memory object so fallback logic works
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

        // ── Oracle without cached thumbnail: generate, cache, and return ────
        // We MUST process this synchronously for HEIC iPhone photos because browsers
        // cannot render HEIC natively if we just redirect to the raw file.
        if (provider === "oracle" && !photo.r2Thumbnail) {
            const resized = await generateAndCacheThumbnail(actualKey, provider, width, photo.id);
            return serveBuffer(new Uint8Array(resized));
        }

        // ── R2: generate, cache, and return ──────────────────────────
        const resized = await generateThumbnailFromR2(actualKey, width);

        // Cache the generated thumbnail (fire-and-forget to not block response)
        cacheThumbnailToR2(photo.id, actualKey, width, resized).catch(err =>
            console.error("Thumbnail caching failed:", err.message)
        );

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
): Promise<Buffer> {
    // For Oracle, we need a presigned URL because the bucket is private
    const publicUrl = await getOracleDownloadUrl(originalKey);
    const response = await fetch(publicUrl);
    if (!response.ok) throw new Error(`Failed to fetch secure oracle url: ${response.status}`);

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

    if (photoId) {
        const thumbKey = thumbnailKey(originalKey, width);
        // Fire and forget the save
        putOracleObject(thumbKey, new Uint8Array(resized), "image/jpeg")
            .then(() => prisma.photo.update({
                where: { id: photoId },
                data: { r2Thumbnail: thumbKey },
            }))
            .catch(e => console.error("Oracle async thumbnail save failed:", e.message));
    }
    
    return resized;
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

/**
 * Generate a gorgeous glassmorphic file preview card with sharp custom color tags based on extension.
 */
async function generateFilePlaceholder(width: number, ext: string, filename: string): Promise<Buffer> {
    const w = Math.min(width, 400);
    const h = w; // Square format
    
    // Choose theme colors based on extension
    let startColor = "#6366f1";
    let endColor = "#4338ca";
    
    const archives = ['zip', 'rar', 'tar', 'gz', '7z'];
    const documents = ['doc', 'docx', 'odt', 'pdf'];
    const sheets = ['xls', 'xlsx', 'ods', 'csv'];
    const text = ['txt', 'md', 'rtf', 'log'];
    
    if (archives.includes(ext)) {
        startColor = "#f59e0b"; // Yellow/Amber
        endColor = "#d97706";
    } else if (ext === 'pdf') {
        startColor = "#ef4444"; // Red/Crimson
        endColor = "#dc2626";
    } else if (documents.includes(ext)) {
        startColor = "#3b82f6"; // Blue/Navy
        endColor = "#2563eb";
    } else if (sheets.includes(ext)) {
        startColor = "#10b981"; // Green/Emerald
        endColor = "#059669";
    } else if (text.includes(ext)) {
        startColor = "#9ca3af"; // Gray/Silver
        endColor = "#4b5563";
    }

    const extUpper = ext.toUpperCase().substring(0, 4);
    // Sanitize filename to prevent breaking XML
    const escapedFilename = filename
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const svg = `<svg width="${w}" height="${h}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#141419"/>
                <stop offset="100%" stop-color="#08080a"/>
            </linearGradient>
            <linearGradient id="iconGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${startColor}"/>
                <stop offset="100%" stop-color="${endColor}"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="15" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <!-- Card Background -->
        <rect width="400" height="400" fill="url(#bgGrad)" rx="24"/>
        <rect width="398" height="398" x="1" y="1" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" rx="23"/>

        <!-- Subtle Glow in center -->
        <circle cx="200" cy="180" r="60" fill="url(#iconGrad)" opacity="0.15" filter="url(#glow)"/>

        <!-- Premium Glass File Container -->
        <g transform="translate(130, 100)">
            <!-- File Background Grid Fold -->
            <path d="M 0 0 L 100 0 L 140 40 L 140 180 L 0 180 Z" fill="url(#iconGrad)" opacity="0.9" rx="12"/>
            
            <!-- Folded Corner Corner Overlay -->
            <path d="M 100 0 L 100 40 L 140 40 Z" fill="#ffffff" opacity="0.25"/>
            <path d="M 100 0 L 100 40 L 140 40 Z" fill="rgba(0,0,0,0.15)"/>

            <!-- Document Lines -->
            <line x1="25" y1="70" x2="115" y2="70" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
            <line x1="25" y1="95" x2="115" y2="95" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
            <line x1="25" y1="120" x2="80" y2="120" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>

            <!-- Centered monospaced type -->
            <rect x="25" y="140" width="90" height="28" rx="6" fill="#000000" opacity="0.4"/>
            <text x="70" y="158" font-family="monospace, ui-monospace, Courier" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
                ${extUpper}
            </text>
        </g>

        <!-- Filename text -->
        <text x="200" y="325" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#f4f4f5" text-anchor="middle" opacity="0.9">
            ${escapedFilename.length > 25 ? escapedFilename.substring(0, 22) + '...' : escapedFilename}
        </text>
        <text x="200" y="350" font-family="monospace, ui-monospace, Courier" font-size="11" font-weight="500" fill="#71717a" text-anchor="middle" letter-spacing="0.5">
            SECURE VAULT STORAGE
        </text>
    </svg>`;

    return sharp(Buffer.from(svg))
        .png()
        .toBuffer();
}

