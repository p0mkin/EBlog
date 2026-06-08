import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notify";
import { isOwner } from "@/lib/auth-utils";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { roleAssignments: { include: { role: true } } }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const isAdmin = isOwner(session) || user.role === 'admin';
        
        let posts;

        if (isAdmin) {
            // Admin sees all live posts
            posts = await prisma.post.findMany({
                where: { archivedAt: null },
                include: {
                    roleFilters: { include: { role: true } },
                    likes: true,
                    _count: { select: { comments: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // User sees posts based on role filtering
            // Get all user's active role IDs
            const roleIds = [
                ...(user.role ? [await prisma.role.findUnique({ where: { name: user.role } })].map(r => r?.id).filter(Boolean) : []),
                ...user.roleAssignments
                    .filter(a => !a.expiresAt || a.expiresAt > new Date())
                    .map(a => a.roleId)
            ] as string[];

            posts = await prisma.post.findMany({
                where: {
                    archivedAt: null,
                    AND: [
                        // Not excluded
                        {
                            NOT: {
                                roleFilters: {
                                    some: {
                                        type: 'exclude',
                                        roleId: { in: roleIds }
                                    }
                                }
                            }
                        },
                        // Either no include filters, or included
                        {
                            OR: [
                                {
                                    roleFilters: {
                                        none: { type: 'include' }
                                    }
                                },
                                {
                                    roleFilters: {
                                        some: {
                                            type: 'include',
                                            roleId: { in: roleIds }
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                include: {
                    likes: true,
                    _count: { select: { comments: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json(posts);
    } catch (error) {
        console.error("Fetch posts error:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) {
        return NextResponse.json({ error: "Unauthorized admin only" }, { status: 401 });
    }

    try {
        const { body, mediaKeys, expiresAt, includeRoleIds = [], excludeRoleIds = [] } = await req.json();

        if (!body) return NextResponse.json({ error: "Body is required" }, { status: 400 });

        const adminUser = await prisma.user.findUnique({
            where: { email: session!.user!.email! },
            select: { id: true, name: true }
        });

        const post = await prisma.post.create({
            data: {
                body,
                mediaKeys: mediaKeys || [],
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                roleFilters: {
                    create: [
                        ...includeRoleIds.map((id: string) => ({ roleId: id, type: 'include' })),
                        ...excludeRoleIds.map((id: string) => ({ roleId: id, type: 'exclude' }))
                    ]
                }
            }
        });

        // Notify applicable users
        const applicableUsers = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        NOT: {
                            roleAssignments: {
                                some: {
                                    roleId: { in: excludeRoleIds },
                                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
                                }
                            }
                        }
                    },
                    includeRoleIds.length > 0 ? {
                        roleAssignments: {
                            some: {
                                roleId: { in: includeRoleIds },
                                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
                            }
                        }
                    } : {}
                ]
            },
            select: { id: true }
        });

        const userIdsToNotify = applicableUsers.map(u => u.id);
        if (userIdsToNotify.length > 0 && adminUser) {
            await createBulkNotifications(userIdsToNotify, {
                actorId: adminUser.id,
                actorName: adminUser.name || 'Admin',
                type: 'post',
                postId: post.id
            });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error("Create post error:", error);
        return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }
}
