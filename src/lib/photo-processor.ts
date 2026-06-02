import exifr from 'exifr';
import { generatePHash, hammingDistance } from './phash';
import { prisma } from './prisma';

export interface ImageMetadataResult {
    lat: number | null;
    lng: number | null;
    takenAt: Date | null;
    takenAtRaw: string | null;
    phash: string | null;
    isDuplicate: boolean;
    duplicateOf?: string;
}

export async function processImageMetadata(buffer: Buffer | Uint8Array, albumId: string): Promise<ImageMetadataResult> {
    let lat = null;
    let lng = null;
    let takenAt = null;
    let takenAtRaw = null;
    let phash = null;
    let isDuplicate = false;
    let duplicateOf;

    // 1. Parse EXIF
    try {
        const exifObj = await exifr.parse(buffer, {
            gps: true,
            tiff: true,
            exif: true,
            mergeOutput: true,
        });

        if (exifObj) {
            if (exifObj.latitude !== undefined && exifObj.longitude !== undefined) {
                lat = exifObj.latitude;
                lng = exifObj.longitude;
            }
            if (exifObj.DateTimeOriginal) {
                const parsed = new Date(exifObj.DateTimeOriginal);
                if (!isNaN(parsed.getTime())) {
                    takenAt = parsed;
                    takenAtRaw = exifObj.DateTimeOriginal.toString();
                }
            } else if (exifObj.CreateDate) {
                const parsed = new Date(exifObj.CreateDate);
                if (!isNaN(parsed.getTime())) {
                    takenAt = parsed;
                    takenAtRaw = exifObj.CreateDate.toString();
                }
            }
        }
    } catch (err) {
        console.error("[photo-processor] Exif parsing error:", err);
    }

    // 2. Generate pHash & detect duplicates
    try {
        phash = await generatePHash(buffer);
        
        const existingPhotosInAlbum = await prisma.photo.findMany({
            where: { albumId, phash: { not: null } },
            select: { id: true, phash: true, filename: true }
        });

        for (const existing of existingPhotosInAlbum) {
            if (existing.phash) {
                const dist = hammingDistance(phash, existing.phash);
                if (dist <= 10) {
                    isDuplicate = true;
                    duplicateOf = existing.id;
                    break;
                }
            }
        }
    } catch (err) {
        console.error("[photo-processor] pHash error:", err);
    }

    return { lat, lng, takenAt, takenAtRaw, phash, isDuplicate, duplicateOf };
}
