import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { isOwner } from "@/lib/auth-utils";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) return NextResponse.json({ error: "Missing chatId" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, role: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const chat = await prisma.chat.findUnique({
            where: { id: chatId }
        });

        if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

        // Ensure user is part of chat or is admin
        const isAdmin = isOwner(session) || user.role === 'admin';
        if (chat.userId !== user.id && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch messages
        const messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
            // Could add pagination here
        });

        // Mark as read
        const unreadIds = messages.filter(m => !m.readAt && m.senderId !== user.id).map(m => m.id);
        if (unreadIds.length > 0) {
            await prisma.message.updateMany({
                where: { id: { in: unreadIds } },
                data: { readAt: new Date() }
            });
        }

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Fetch messages error:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { chatId, type, body, mediaKey, expiresAt } = await req.json();

        if (!chatId || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true, role: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { user: { select: { id: true, name: true } } }
        });

        if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

        const isAdmin = isOwner(session) || user.role === 'admin';
        if (chat.userId !== user.id && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                chatId,
                senderId: user.id,
                type,
                body,
                mediaKey,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            }
        });

        // Notify recipient
        const recipientId = isAdmin ? chat.userId : 'admin';
        if (recipientId !== 'admin') {
            await createNotification({
                userId: recipientId,
                actorId: user.id,
                actorName: user.name || 'Admin',
                type: 'message',
                chatId
            });
        } else {
             // Notify all admins
             const admins = await prisma.user.findMany({ where: { role: 'admin' } });
             for(const admin of admins) {
                 await createNotification({
                     userId: admin.id,
                     actorId: user.id,
                     actorName: user.name || 'User',
                     type: 'message',
                     chatId
                 });
             }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error("Send message error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
