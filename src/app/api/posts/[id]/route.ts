import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { body, expiresAt, includeRoleIds = [], excludeRoleIds = [] } = await req.json();

        const post = await prisma.post.update({
            where: { id },
            data: {
                body,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                roleFilters: {
                    deleteMany: {},
                    create: [
                        ...includeRoleIds.map((rid: string) => ({ roleId: rid, type: 'include' })),
                        ...excludeRoleIds.map((rid: string) => ({ roleId: rid, type: 'exclude' }))
                    ]
                }
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("Update post error:", error);
        return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Archive if not archived, hard delete if already archived
        const post = await prisma.post.findUnique({ where: { id } });
        
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.archivedAt) {
            await prisma.post.delete({ where: { id } });
            return NextResponse.json({ deleted: true });
        } else {
            const archivedPost = await prisma.post.update({
                where: { id },
                data: { archivedAt: new Date() }
            });
            return NextResponse.json(archivedPost);
        }
    } catch (error) {
        console.error("Archive/Delete post error:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
