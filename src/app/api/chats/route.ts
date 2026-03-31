import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth-utils";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const chats = await prisma.chat.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                _count: {
                    select: { messages: { where: { readAt: null, senderId: { not: undefined } } } } // Need to count unread messages from the other user
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Compute unread count carefully:
        // For admin, unread messages are those sent by the user where readAt is null
        const enriched = chats.map(c => {
            return {
                ...c,
                unreadCount: c.messages[0]?.senderId !== 'admin' && c.messages[0]?.readAt === null ? 1 : 0 // Simplified: we need better unread logic, but we'll do an aggregate count later if needed
            };
        });

        return NextResponse.json(chats);
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
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
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
