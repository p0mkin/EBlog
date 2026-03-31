"use client";

import { useState, useEffect } from "react";
import MessengerPanel from "@/components/MessengerPanel";

interface Chat {
    id: string;
    userId: string;
    updatedAt: string;
    user: { name: string | null };
    messages: { body: string | null; type: string; createdAt: string }[];
}

export default function MessagesClient({ isAdmin, currentUserId }: { isAdmin: boolean, currentUserId: string }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchChats = async () => {
        try {
            const res = await fetch("/api/chats");
            if (res.ok) {
                const data = await res.json();
                setChats(data);
                if (data.length > 0 && !selectedChatId && !isAdmin) {
                    // Auto-select for regular users
                    setSelectedChatId(data[0].id);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        const intv = setInterval(fetchChats, 10000);
        return () => clearInterval(intv);
    }, []);

    // Also auto-select from URL hash or query if possible
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setSelectedChatId(hash);
        }
    }, []);

    const selectedChat = chats.find(c => c.id === selectedChatId);

    const startNewChat = async () => {
        try {
            const res = await fetch("/api/chats", { method: "POST" });
            if (res.ok) {
                const newChat = await res.json();
                setChats(prev => [newChat, ...prev]);
                setSelectedChatId(newChat.id);
            }
        } catch (e) {
            console.error("Failed to start chat");
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full max-w-6xl mx-auto overflow-hidden border-x border-white/5 relative bg-[#050505]">
            {/* Sidebar (List of Chats) */}
            <div className={`w-full md:w-80 flex-shrink-0 flex flex-col border-r border-white/10 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between shrink-0">
                    <h2 className="font-bold tracking-tight">Messages</h2>
                    {!isAdmin && chats.length === 0 && (
                        <button onClick={startNewChat} className="text-[10px] bg-white text-black px-3 py-1.5 rounded-full font-bold uppercase tracking-wider hover:bg-zinc-200">
                            Start Chat
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            <p className="text-sm">No active conversations</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {chats.map(chat => {
                                const lastMsg = chat.messages?.[0];
                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChatId(chat.id)}
                                        className={`w-full text-left p-4 hover:bg-white/5 transition flex items-center gap-4 ${selectedChatId === chat.id ? 'bg-white/10' : ''}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 font-bold text-sm shadow-lg">
                                            {isAdmin ? (chat.user?.name?.charAt(0).toUpperCase() || '?') : 'A'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-bold text-sm truncate">
                                                    {isAdmin ? (chat.user?.name || "Anonymous User") : "Admin Support"}
                                                </h3>
                                                <span className="text-[10px] text-zinc-500">
                                                    {new Date(chat.updatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 truncate w-[90%]">
                                                {lastMsg ? (lastMsg.type === "text" ? lastMsg.body : `[${lastMsg.type.toUpperCase()}]`) : "No messages yet"}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex col min-w-0 ${!selectedChatId ? 'hidden md:flex' : 'flex'} bg-[#0a0a0a]`}>
                {selectedChatId ? (
                    <div className="w-full h-full animate-in fade-in zoom-in-95 duration-300">
                        <MessengerPanel 
                            chatId={selectedChatId} 
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            participantName={selectedChat?.user?.name || "User"}
                            onClose={() => setSelectedChatId(null)}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                        <svg className="w-20 h-20 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        <p className="font-mono tracking-widest uppercase text-xs">Select a conversation</p>
                    </div>
                )}
            </div>
        </div>
    );
}
