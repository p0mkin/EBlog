import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import sharp from "sharp";
import r2 from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, any> = {};

    // 1. Check sharp version and format support
    try {
        const meta = sharp.versions;
        results.sharpVersions = meta;
    } catch (e: any) {
        results.sharpVersions = { error: e.message };
    }

    // 2. Check supported input formats
    try {
        const formats = sharp.format;
        const formatSupport: Record<string, any> = {};
        for (const [name, info] of Object.entries(formats)) {
            formatSupport[name] = {
                input: (info as any).input?.file ?? false,
                output: (info as any).output?.file ?? false,
            };
        }
        results.formats = formatSupport;
    } catch (e: any) {
        results.formats = { error: e.message };
    }

    // 3. Try to find and process a HEIC file from R2
    try {
        const heicPhoto = await prisma.photo.findFirst({
            where: {
                filename: { endsWith: ".HEIC" },
                storageProvider: "r2",
            },
            select: { r2Key: true, filename: true, fileSize: true },
        });

        if (heicPhoto) {
            results.heicFile = { key: heicPhoto.r2Key, filename: heicPhoto.filename, fileSize: heicPhoto.fileSize };

            // Try fetching from R2
            try {
                const command = new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: heicPhoto.r2Key,
                });
                const response = await r2.send(command);
                const body = response.Body;
                if (body) {
                    const byteArray = await body.transformToByteArray();
                    results.r2Fetch = { success: true, bytes: byteArray.length };

                    // Try sharp metadata
                    try {
                        const metadata = await sharp(byteArray, { failOn: 'none' }).metadata();
                        results.sharpMetadata = metadata;
                    } catch (e: any) {
                        results.sharpMetadata = { error: e.message, stack: e.stack?.split('\n').slice(0, 5) };
                    }

                    // Try sharp resize
                    try {
                        const thumb = await sharp(byteArray, {
                            limitInputPixels: false,
                            sequentialRead: true,
                            failOn: 'none',
                        })
                            .rotate()
                            .resize({ width: 200, withoutEnlargement: true })
                            .jpeg({ quality: 75 })
                            .toBuffer();
                        results.sharpResize = { success: true, outputBytes: thumb.length };
                    } catch (e: any) {
                        results.sharpResize = { error: e.message, stack: e.stack?.split('\n').slice(0, 5) };
                    }
                }
            } catch (e: any) {
                results.r2Fetch = { error: e.message };
            }
        } else {
            results.heicFile = "No HEIC file found in database";
        }
    } catch (e: any) {
        results.heicLookup = { error: e.message };
    }

    return NextResponse.json(results, { status: 200 });
}
