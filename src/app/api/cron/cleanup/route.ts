import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;

export async function GET(req: Request) {
    // Check authorization
    const authHeader = req.headers.get("Authorization");
    const secret = process.env.CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        let archivedCount = 0;
        let deletedPostsCount = 0;
        let deletedMessagesCount = 0;

        // 1. Archive expired posts
        const expiredPosts = await prisma.post.updateMany({
            where: {
                expiresAt: { lte: now },
                archivedAt: null,
            },
            data: { archivedAt: now }
        });
        archivedCount = expiredPosts.count;

        // 2. Hard delete posts archived > 14 days ago
        const oldPosts = await prisma.post.deleteMany({
            where: {
                archivedAt: { lte: fourteenDaysAgo }
            }
        });
        deletedPostsCount = oldPosts.count;

        // 3. Hard delete expired messages
        const oldMessages = await prisma.message.deleteMany({
            where: {
                expiresAt: { lte: now }
            }
        });
        deletedMessagesCount = oldMessages.count;

        console.log(`[cron/cleanup] Run complete: Archived ${archivedCount} posts, Deleted ${deletedPostsCount} posts, Deleted ${deletedMessagesCount} messages.`);

        return NextResponse.json({
            success: true,
            archivedCount,
            deletedPostsCount,
            deletedMessagesCount
        });
    } catch (error) {
        console.error("[cron/cleanup] Error:", error);
        return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
    }
}
