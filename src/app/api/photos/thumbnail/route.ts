import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { getOraclePublicUrl } from "@/lib/oracle";
import { getCachedPhotoProvider } from "@/lib/db";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Allow up to 60s for massive images
export const maxDuration = 60;

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
        // Cached provider lookup (300s TTL, tagged "photos")
        const provider = await getCachedPhotoProvider(key);

        // Oracle: public bucket — redirect to direct URL (no proxy needed)
        if (provider === "oracle") {
            const publicUrl = getOraclePublicUrl(key);
            return NextResponse.redirect(publicUrl);
        }

        // R2: proxy + resize via Sharp
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const response = await r2.send(command);

        const body = response.Body;
        if (!body) {
            return NextResponse.json({ error: "Empty body from R2" }, { status: 500 });
        }

        const byteArray = await body.transformToByteArray();

        const resized = await sharp(byteArray, {
            limitInputPixels: false,
            sequentialRead: true,
            failOn: 'none',
        })
            .rotate()  // Auto-orient based on EXIF
            .resize({ width: Math.min(width, 1200), withoutEnlargement: true })
            .jpeg({ quality: 90, progressive: true, mozjpeg: true })
            .toBuffer();

        return new NextResponse(new Uint8Array(resized), {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=604800, s-maxage=604800",
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
