"use client";

import { useState, useEffect, useRef } from "react";
import MessengerPanel from "@/components/MessengerPanel";

interface Chat {
    id: string;
    userId: string;
    createdAt: string;
    user: { name: string | null };
    messages: { body: string | null; type: string; createdAt: string }[];
}

interface AppUser {
    id: string;
    name: string | null;
    email: string;
}

// ── User Picker Modal ─────────────────────────────────
function UserPickerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (userId: string) => void }) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/admin/users")
            .then(r => r.json())
            .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);

    const filtered = users.filter(u =>
        (u.name?.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-bold text-sm tracking-tight">New Conversation</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name or email…"
                            className="flex-1 bg-transparent text-sm outline-none text-white placeholder-zinc-500"
                        />
                    </div>
                </div>

                {/* User list */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-8">No users found</p>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filtered.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => onSelect(u.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 font-bold text-sm shadow-lg">
                                        {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{u.name || "Unnamed"}</p>
                                        <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main MessagesClient ───────────────────────────────
export default function MessagesClient({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId: string }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);

    const fetchChats = async () => {
        try {
            const res = await fetch("/api/chats");
            if (res.ok) {
                const data = await res.json();
                setChats(data);
                if (data.length > 0 && !selectedChatId && !isAdmin) {
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

    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) setSelectedChatId(hash);
    }, []);

    const selectedChat = chats.find(c => c.id === selectedChatId);

    // Non-admin: start own support chat
    const startNewChat = async () => {
        try {
            const res = await fetch("/api/chats", { method: "POST" });
            if (res.ok) {
                const newChat = await res.json();
                setChats(prev => [newChat, ...prev.filter(c => c.id !== newChat.id)]);
                setSelectedChatId(newChat.id);
            }
        } catch (e) {
            console.error("Failed to start chat");
        }
    };

    // Admin: open (or create) a chat for a specific user
    const openChatForUser = async (targetUserId: string) => {
        setShowPicker(false);
        try {
            const res = await fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId }),
            });
            if (res.ok) {
                const newChat = await res.json();
                setChats(prev => {
                    const without = prev.filter(c => c.id !== newChat.id);
                    return [newChat, ...without];
                });
                setSelectedChatId(newChat.id);
            }
        } catch (e) {
            console.error("Failed to open chat");
        }
    };

    return (
        <>
            {showPicker && (
                <UserPickerModal
                    onClose={() => setShowPicker(false)}
                    onSelect={openChatForUser}
                />
            )}

            <div className="flex h-[calc(100vh-52px)] w-full max-w-6xl mx-auto overflow-hidden border-x border-white/5 relative bg-[#050505]">
                {/* Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 flex flex-col border-r border-white/10 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between shrink-0">
                        <h2 className="font-bold tracking-tight">Messages</h2>
                        {isAdmin ? (
                            <button
                                onClick={() => setShowPicker(true)}
                                className="flex items-center gap-1.5 text-[10px] bg-white text-black px-3 py-1.5 rounded-full font-bold uppercase tracking-wider hover:bg-zinc-200 transition"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                New Chat
                            </button>
                        ) : (
                            chats.length === 0 && (
                                <button onClick={startNewChat} className="text-[10px] bg-white text-black px-3 py-1.5 rounded-full font-bold uppercase tracking-wider hover:bg-zinc-200 transition">
                                    Start Chat
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                <p className="text-sm">{isAdmin ? "No conversations yet" : "No active conversations"}</p>
                                {isAdmin && (
                                    <button onClick={() => setShowPicker(true)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition underline">
                                        Start one →
                                    </button>
                                )}
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
                                                    <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                                                        {new Date(chat.createdAt).toLocaleDateString()}
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
                <div className={`flex-1 flex flex-col min-w-0 ${!selectedChatId ? 'hidden md:flex' : 'flex'} bg-[#0a0a0a]`}>
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
                            <p className="font-mono tracking-widest uppercase text-xs mb-3">Select a conversation</p>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowPicker(true)}
                                    className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition underline"
                                >
                                    or start a new one →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
