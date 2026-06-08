/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
        await (prisma as any).photoUnlock.create({
            data: {
                userId: user.id,
                photoId: id,
            }
        });

        // Revalidate the cache so the gallery immediately shows the unblurred photo
        (revalidateTag as any)('albums');
        (revalidateTag as any)('photos');

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
    }
}
