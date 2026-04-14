"use client";

import { useState, useEffect } from "react";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";

export default function FeedClientWrapper({ isOwner, currentUserId }: { isOwner: boolean, currentUserId?: string }) {
    const [clientPosts, setClientPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const refreshFeed = async () => {
        try {
            const res = await fetch("/api/posts");
            if (res.ok) {
                setClientPosts(await res.json());
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshFeed();
    }, []);

    return (
        <div className="max-w-3xl mx-auto w-full px-4 md:px-0 mt-8 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Feed</h1>
            
            {isOwner && (
                <PostComposer onPostCreated={refreshFeed} />
            )}

            <div className="space-y-6">
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card h-40 animate-pulse border-white/5 rounded-2xl" />
                        ))}
                    </div>
                ) : clientPosts.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10 glass-card">
                        <svg className="w-16 h-16 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                        <p className="text-sm font-mono tracking-widest uppercase">No posts available yet</p>
                    </div>
                ) : (
                    clientPosts.map((post: any) => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            isOwner={isOwner} 
                            currentUserId={currentUserId}
                            onUpdate={refreshFeed} 
                        />
                    ))
                )}
            </div>
        </div>
    );
}
