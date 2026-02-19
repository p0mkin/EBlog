import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/albums — returns all albums for move dialog (owner only)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const albums = await prisma.album.findMany({
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, parentId: true },
    });
    return NextResponse.json(albums);
}
