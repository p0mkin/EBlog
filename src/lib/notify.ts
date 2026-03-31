import { prisma } from '@/lib/prisma';

export type NotificationType = 'like' | 'comment' | 'reply' | 'tag' | 'message' | 'post';

interface CreateNotificationParams {
    userId: string;       // recipient
    type: NotificationType;
    actorId?: string;
    actorName?: string;
    photoId?: string;
    commentId?: string;
    chatId?: string;
    messageId?: string;
    postId?: string;
}

/**
 * Creates a notification for a user.
 * Silently no-ops if userId equals actorId (don't notify yourself).
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
    const { userId, actorId, ...rest } = params;

    // Don't notify yourself
    if (userId === actorId) return;

    try {
        await prisma.notification.create({
            data: {
                userId,
                actorId,
                ...rest,
            },
        });
    } catch (err) {
        // Non-fatal — log but never throw so caller is unaffected
        console.error('[notify] Failed to create notification:', err);
    }
}

/**
 * Notify all users in a list (e.g. all eligible feed subscribers).
 * Fires in parallel, non-blocking.
 */
export async function createBulkNotifications(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
    const filtered = params.actorId ? userIds.filter(id => id !== params.actorId) : userIds;
    if (filtered.length === 0) return;

    try {
        await prisma.notification.createMany({
            data: filtered.map(userId => ({ userId, ...params })),
            skipDuplicates: true,
        });
    } catch (err) {
        console.error('[notify] Failed to create bulk notifications:', err);
    }
}
