"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import UserBadge from "./UserBadge";

interface User {
    id: string;
    name: string | null;
    role: string;
}

interface CommentType {
    id: string;
    body: string;
    createdAt: string;
    deletedAt: string | null;
    user: User;
    replies: CommentType[];
}

export default function CommentsPanel({ photoId }: { photoId: string }) {
    const { data: session } = useSession();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/comments?photoId=${photoId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [photoId]);

    const submitComment = async () => {
        if (!newComment.trim()) return;

        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    photoId,
                    body: newComment,
                    parentId: replyTo?.id || null,
                })
            });

            if (res.ok) {
                setNewComment("");
                setReplyTo(null);
                fetchComments();
            } else {
                toast.error("Failed to post comment");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const deleteComment = async (id: string) => {
        if (!confirm("Delete this comment?")) return;
        try {
            const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
            if (res.ok) fetchComments();
        } catch (e) {
             toast.error("Failed to delete comment");
        }
    };

    // Very basic username highlighting
    const renderBody = (text: string) => {
        const parts = text.split(/(@[\w.-]+)/g);
        return parts.map((part, i) => 
            part.startsWith('@') ? <span key={i} className="text-blue-400 font-medium">{part}</span> : part
        );
    };

    const CommentRender = ({ c, isReply = false }: { c: CommentType, isReply?: boolean }) => {
        const isAuthor = session?.user?.email === c.user.name; // In a real app check ID
        // actually session.user.email might not match username - check next-auth integration
        // Better yet, just show delete if session exists, API blocks anyway
        return (
            <div className={`flex flex-col gap-2 ${isReply ? 'ml-8 mt-2 border-l-2 border-white/10 pl-4' : 'mt-4 border-b border-white/5 pb-4'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                            {c.user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-bold text-white">{c.user.name || 'Anonymous'}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap pl-8">
                    {c.deletedAt ? <span className="italic text-zinc-500">[Comment deleted]</span> : renderBody(c.body)}
                </p>
                {!c.deletedAt && session?.user && (
                    <div className="flex items-center gap-3 pl-8 mt-1">
                        {!isReply && (
                            <button onClick={() => setReplyTo({ id: c.id, name: c.user.name || 'User' })} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-wider">
                                Reply
                            </button>
                        )}
                        <button onClick={() => deleteComment(c.id)} className="text-[10px] text-red-500/50 hover:text-red-400 uppercase font-bold tracking-wider">
                            Delete
                        </button>
                    </div>
                )}
                
                {c.replies?.map(r => <CommentRender key={r.id} c={r} isReply={true} />)}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-white/10 w-full sm:w-80 md:w-96 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-lg">Comments</h3>
                <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full">{comments.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-white/10 rounded w-1/4"></div>
                                    <div className="h-3 bg-white/10 rounded w-3/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        <p className="text-sm">No comments yet.<br/>Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map(c => <CommentRender key={c.id} c={c} />)
                )}
            </div>

            {session?.user ? (
                <div className="p-4 border-t border-white/10 bg-black/40">
                    {replyTo && (
                        <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-t-lg border-b border-white/10 text-xs text-zinc-400">
                            <span>Replying to <span className="font-bold text-white">@{replyTo.name}</span></span>
                            <button onClick={() => setReplyTo(null)} className="hover:text-white">✕</button>
                        </div>
                    )}
                    <div className={`flex flex-col gap-2 ${replyTo ? 'rounded-b-lg' : 'rounded-lg'} bg-white/5 border border-white/10 p-2 focus-within:border-white/30 focus-within:bg-white/10 transition`}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitComment();
                                }
                            }}
                            placeholder="Add a comment... (use @ to tag)"
                            className="bg-transparent text-sm text-white focus:outline-none resize-none min-h-[60px] p-1 custom-scrollbar"
                            rows={3}
                        />
                        <div className="flex justify-end">
                            <button 
                                onClick={submitComment}
                                disabled={!newComment.trim()}
                                className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 hover:bg-zinc-200 transition"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 border-t border-white/10 text-center bg-black/40">
                    <p className="text-sm text-zinc-500">Sign in to leave a comment</p>
                </div>
            )}
        </div>
    );
}
