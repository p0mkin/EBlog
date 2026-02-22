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

    // Deduplicate: if slug already exists under the same parent, append -2, -3, …
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.album.findFirst({ where: { slug, parentId: parentId ?? null } })) {
        slug = `${baseSlug}-${suffix++}`;
    }

    const album = await prisma.album.create({
        data: { name: name.trim(), slug, parentId: parentId ?? null },
    });

    revalidateTag('albums', { expire: 0 });
    return NextResponse.json(album, { status: 201 });
}
