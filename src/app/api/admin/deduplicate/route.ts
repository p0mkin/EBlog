import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
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

function isCuidOrUuid(name: string) {
    // CUID: usually start with c, 25 chars, alphanumeric
    const isCuid = /^c[a-z0-9]{24}$/.test(name);
    // UUID: 8-4-4-4-12 hex
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
    // Also check for "r2-" prefix which we used briefly
    const isR2Prefixed = name.startsWith("r2-");

    return isCuid || isUuid || isR2Prefixed;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch all photos with minimal fields needed for comparison
        const allPhotos = await prisma.photo.findMany({
            select: {
                id: true,
                filename: true,
                fileSize: true,
                uploadedAt: true,
                album: { select: { id: true, name: true, slug: true } },
                visibility: true,
            },
            where: { visibility: { not: "hidden" } } // Only process currently visible photos?
        });

        // 2. Group by signature (size + normalized filename)
        // Sync API sets filename = R2 Key basename (which often has timestamp), 
        // while Upload API sets filename = original name.
        // We must normalize to match them.
        const groups = new Map<string, typeof allPhotos>();

        for (const p of allPhotos) {
            let normName = p.filename.toLowerCase().trim();

            // Strip 'r2-' prefix if present (legacy)
            if (normName.startsWith("r2-")) normName = normName.substring(3);

            // Strip timestamp prefix (e.g. 1771538991379-) details:
            // Date.now() is 13 digits.
            // But be careful not to strip year like 2022-.
            // Timestamps are usually > 1600000000000.
            // Let's regex for 13 digits followed by dash.
            normName = normName.replace(/^\d{13}-/, "");

            const key = `${p.fileSize}-${normName}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(p);
        }

        // 3. Find duplicates and decide winners
        const toHideIds: string[] = [];

        for (const [key, photos] of groups) {
            if (photos.length < 2) continue;

            // Sort to prioritize "Good" albums
            // We want the winner to be first.
            photos.sort((a, b) => {
                const aIsJunk = isCuidOrUuid(a.album.name) || isCuidOrUuid(a.album.slug);
                const bIsJunk = isCuidOrUuid(b.album.name) || isCuidOrUuid(b.album.slug);

                if (aIsJunk && !bIsJunk) return 1; // b wins
                if (!aIsJunk && bIsJunk) return -1; // a wins

                // Tie-breaker: Keep the one in the SHORTER album name (usually better?)
                if (a.album.name.length !== b.album.name.length) return a.album.name.length - b.album.name.length;

                // Tie-breaker: Keep oldest upload? Or newest?
                // User's manual upload (newest) vs Sync (old/mixed).
                // Let's keep the NEWEST one if both are "good" or both "bad".
                // Actually Sync usually creates NEW records too.
                // Let's keep the one with the cleaner ID? No.
                // Let's keep OLDER creation date (stable)?
                return a.uploadedAt.getTime() - b.uploadedAt.getTime();
            });

            // The first one is the winner. The rest are hidden.
            const losers = photos.slice(1);
            losers.forEach(l => toHideIds.push(l.id));
        }

        // 4. Update DB
        if (toHideIds.length > 0) {
            await prisma.photo.updateMany({
                where: { id: { in: toHideIds } },
                data: { visibility: "hidden" }
            });
        }

        revalidateTag('photos', { expire: 0 });
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({
            success: true,
            processed: allPhotos.length,
            duplicatesFound: toHideIds.length,
            hiddenIds: toHideIds,
        });

    } catch (err: any) {
        console.error("Deduplicate error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
