import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { isOwner } from "@/lib/auth-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

        await prisma.postLike.create({
            data: { postId: id, userId: user.id }
        });

        if (!isOwner(session)) {
             // Notify all admins
             const admins = await prisma.user.findMany({ where: { role: 'admin' } });
             for(const admin of admins) {
                 await createNotification({
                     userId: admin.id,
                     actorId: user.id,
                     actorName: user.name || "A user",
                     type: 'like',
                     postId: id
                 });
             }
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        await prisma.postLike.delete({
            where: {
                postId_userId: {
                    postId: id,
                    userId: user.id
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 });
    }
}
