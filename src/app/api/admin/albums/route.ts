import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getCachedAdminAlbums } from "@/lib/db";
import { isOwner } from "@/lib/auth-utils";

// GET all albums (flat list for admin UI) — cached 60s
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const albums = await getCachedAdminAlbums();
    return NextResponse.json(albums);
}

// POST /api/admin/albums — create a new album
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, parentId } = await req.json();
    if (!name?.trim()) {
        return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    // Generate a URL-safe slug from the name
    const baseSlug = name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // ✅ FIX: previous check-then-act loop (findFirst, then create) raced
    // under concurrent requests — two admins creating the same-named album
    // at once could both see "slug available" then both call create(),
    // with the loser throwing an unhandled P2002 and 500ing the request.
    // Now the create() itself is retried on P2002, bumping the suffix each
    // time, so the race resolves safely instead of crashing.
    let slug = baseSlug;
    let suffix = 2;
    let album;
    const MAX_ATTEMPTS = 10;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            album = await prisma.album.create({
                data: { name: name.trim(), slug, parentId: parentId ?? null },
            });
            break;
        } catch (e: any) {
            if (e.code === 'P2002' && attempt < MAX_ATTEMPTS - 1) {
                slug = `${baseSlug}-${suffix++}`;
                continue;
            }
            throw e;
        }
    }

    revalidateTag('albums', { expire: 0 });
    return NextResponse.json(album, { status: 201 });
}
