import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Admins get all chats; regular users get only their own
        if (isOwner(session)) {
            const chats = await prisma.chat.findMany({
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return NextResponse.json(chats);
        } else {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true },
            });
            if (!user) return NextResponse.json([]);

            const chat = await prisma.chat.findUnique({
                where: { userId: user.id },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
            });
            return NextResponse.json(chat ? [chat] : []);
        }
    } catch (error) {
        console.error("Fetch chats error:", error);
        return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // If admin passes a targetUserId, open (or create) that user's chat
        let targetEmail = session.user.email;
        if (isOwner(session)) {
            const body = await req.json().catch(() => ({}));
            if (body.targetUserId) {
                const targetUser = await prisma.user.findUnique({
                    where: { id: body.targetUserId },
                    select: { id: true, email: true },
                });
                if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
                targetEmail = targetUser.email!;
            }
        }

        const user = await prisma.user.findUnique({
            where: { email: targetEmail },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        let chat = await prisma.chat.findUnique({
            where: { userId: user.id },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        if (!chat) {
            chat = await prisma.chat.create({
                data: { userId: user.id },
                include: { user: { select: { id: true, name: true, email: true } } }
            });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error("Create chat error:", error);
        return NextResponse.json({ error: "Failed to create or get chat" }, { status: 500 });
    }
}

