"use client";

import { useState } from "react";
import { toast } from "sonner";

interface PostType {
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    expiresAt: string | null;
    isArchived: boolean;
    pollData: any;
    likes: { userId: string }[];
    _count: { comments: number };
}

export default function PostCard({ post, isOwner, currentUserId, onUpdate }: { post: PostType, isOwner: boolean, currentUserId?: string, onUpdate: () => void }) {
    const isLiked = currentUserId ? (post.likes ?? []).some((l: any) => l.userId === currentUserId) : false;
    const [likeLoading, setLikeLoading] = useState(false);

    const toggleLike = async () => {
        if (!currentUserId) return toast.error("Sign in to like posts");
        setLikeLoading(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
            if (res.ok) onUpdate();
        } catch (e) {
            toast.error("Failed to like");
        } finally {
            setLikeLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!confirm("Archive this post? It will vanish from the feed.")) return;
        try {
            const res = await fetch(`/api/posts/${post.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true })
            });
            if (res.ok) onUpdate();
        } catch (e) {
            toast.error("Failed to archive");
        }
    };

    const isExpiringSoon = post.expiresAt && new Date(post.expiresAt).getTime() - Date.now() < 86400000; // < 24h

    return (
        <div className="glass-card p-5 border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold shadow-lg">
                        {(post.authorName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                            {post.authorName || 'Admin'}
                            <span className="bg-indigo-500 text-[9px] px-1.5 py-0.5 rounded text-white uppercase tracking-wider">Admin</span>
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono">
                            {new Date(post.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Expiry indicator */}
                {post.expiresAt && (
                    <div className={`text-[10px] font-mono px-2 py-1 rounded-full border flex items-center gap-1.5 ${isExpiringSoon ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : 'border-white/10 text-zinc-400 bg-white/5'}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Expires {new Date(post.expiresAt).toLocaleDateString()}
                    </div>
                )}
            </div>

            <p className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed mb-4 pl-[52px]">
                {post.body}
            </p>

            <div className="flex items-center gap-6 pl-[52px] mt-2">
                <button 
                    onClick={toggleLike}
                    disabled={likeLoading}
                    className={`flex items-center gap-2 transition text-xs font-bold ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-red-400'}`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {(post.likes ?? []).length}
                </button>

                <button className="flex items-center gap-2 text-zinc-500 hover:text-white transition text-xs font-bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post._count.comments}
                </button>

                {isOwner && (
                    <button 
                        onClick={handleArchive}
                        className="ml-auto flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 hover:text-amber-500 transition opacity-0 group-hover:opacity-100"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        Archive
                    </button>
                )}
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
        </div>
    );
}
