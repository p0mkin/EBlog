/* eslint-disable */
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isOwner as checkIsOwner } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function ArchivedPostsPage() {
    const session = await getSession();
    if (!checkIsOwner(session)) redirect("/");

    const archivedPosts = await prisma.post.findMany({
        where: { archivedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        include: {
            roleFilters: true,
            _count: { select: { comments: true, likes: true } }
        }
    });

    return (
        <main className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 mt-8 pb-20">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Archived Posts</h1>
                <p className="text-zinc-500 text-sm mb-8">Posts here will be automatically hard-deleted 14 days after they were created/archived by the cron job.</p>

                {archivedPosts.length === 0 ? (
                    <div className="text-center p-10 glass-card">
                        <p className="text-zinc-500">No archived posts.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {archivedPosts.map((post: any) => (
                            <div key={post.id} className="glass-card p-4 border border-white/5 opacity-70 hover:opacity-100 transition">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs text-zinc-500 font-mono">
                                        ID: {post.id} <br/>
                                        Created: {new Date(post.createdAt).toLocaleDateString()}
                                    </div>
                                    <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest">
                                        Archived
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{post.body}</p>
                                <div className="flex gap-4 mt-3 text-xs text-zinc-500 font-bold">
                                    <span>{post._count.likes} Likes</span>
                                    <span>{post._count.comments} Comments</span>
                                    {post.expiresAt && <span className="text-amber-500">Expired: {new Date(post.expiresAt).toLocaleDateString()}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
