import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, role: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const comment = await prisma.comment.findUnique({
            where: { id }
        });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const isUserAdmin = isOwner(session) || user.role === 'admin';
        const isAuthor = comment.userId === user.id;

        if (!isAuthor && !isUserAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Hard delete if admin, soft delete if author
        if (isUserAdmin) {
            await prisma.comment.delete({ where: { id } });
        } else {
            await prisma.comment.update({
                where: { id },
                data: { deletedAt: new Date(), body: '' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
