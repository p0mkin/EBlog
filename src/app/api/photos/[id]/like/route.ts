import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/photos/[id]/like  — toggle like for authenticated user
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: photoId } = await params;

    // Find or create the user record
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await prisma.photoLike.findUnique({
        where: { photoId_userId: { photoId, userId: user.id } },
    });

    if (existing) {
        await prisma.photoLike.delete({ where: { id: existing.id } });
    } else {
        await prisma.photoLike.create({ data: { photoId, userId: user.id } });
    }

    const count = await prisma.photoLike.count({ where: { photoId } });
    return NextResponse.json({ liked: !existing, count });
}
