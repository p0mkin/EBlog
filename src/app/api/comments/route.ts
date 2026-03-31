import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
        return NextResponse.json({ error: "Missing photoId" }, { status: 400 });
    }

    try {
        const comments = await prisma.comment.findMany({
            where: { photoId, parentId: null },
            include: {
                user: { select: { id: true, name: true, role: true } },
                replies: {
                    include: { user: { select: { id: true, name: true, role: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Hide soft-deleted comment bodies
        const transformComment = (c: any) => {
            if (c.deletedAt) {
                c.body = "[Comment removed]";
            }
            if (c.replies) {
                c.replies = c.replies.map(transformComment);
            }
            return c;
        };

        return NextResponse.json(comments.map(transformComment));
    } catch (error) {
        console.error("Fetch comments error:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { photoId, parentId, body } = await req.json();

        if (!photoId || !body?.trim()) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const comment = await prisma.comment.create({
            data: {
                photoId,
                parentId: parentId || null,
                body: body.trim(),
                userId: user.id
            },
            include: {
                user: { select: { id: true, name: true, role: true } },
                replies: { include: { user: { select: { id: true, name: true, role: true } } } }
            }
        });

        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: { album: { select: { id: true } } }
        });

        if (photo) {
            // Find unique user mentions @username
            const mentionRegex = /@([\w.-]+)/g;
            const matches = [...body.matchAll(mentionRegex)];
            const mentionedNames = [...new Set(matches.map(m => m[1] || m[2]))];

            const mentionedUsers = await prisma.user.findMany({
                where: { name: { in: mentionedNames as string[] } },
                select: { id: true }
            });

            // Notify mentioned users
            for (const mUser of mentionedUsers) {
                await createNotification({
                    userId: mUser.id,
                    actorId: user.id,
                    actorName: user.name || "A user",
                    type: "tag",
                    photoId,
                    commentId: comment.id
                });
            }

            // Notify parent comment owner if this is a reply
            if (parentId) {
                const parent = await prisma.comment.findUnique({ where: { id: parentId } });
                if (parent && parent.userId !== user.id) {
                    await createNotification({
                        userId: parent.userId,
                        actorId: user.id,
                        actorName: user.name || "A user",
                        type: "reply",
                        photoId,
                        commentId: comment.id
                    });
                }
            } else {
                // If it's a top-level comment, ideally notify the photo owner,
                // but since the platform is owned by the admin (Owner), we can notify all admins
                // For now, let's notify the owner based on environment variables.
                const admins = await prisma.user.findMany({ where: { role: 'admin' } });
                for(const admin of admins) {
                    await createNotification({
                        userId: admin.id,
                        actorId: user.id,
                        actorName: user.name || "A user",
                        type: "comment",
                        photoId,
                        commentId: comment.id
                    });
                }
            }
        }

        return NextResponse.json(comment);
    } catch (error) {
        console.error("Create comment error:", error);
        return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
    }
}
