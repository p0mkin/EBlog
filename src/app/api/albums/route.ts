import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getCachedAllAlbums } from "@/lib/db";
import { isOwner } from "@/lib/auth-utils";

// GET /api/albums — returns all albums for move dialog (owner only)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Cached: 60s TTL, tagged "albums"
    const albums = await getCachedAllAlbums();
    return NextResponse.json(albums);
}
