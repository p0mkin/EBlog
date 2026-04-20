"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import VoicePlayer from "./VoicePlayer";

interface Message {
    id: string;
    senderId: string;
    type: "text" | "voice" | "image";
    body: string | null;
    mediaKey: string | null;
    createdAt: string;
}

export default function MessengerPanel({
    chatId,
    currentUserId,
    isAdmin,
    participantName,
    onClose,
}: {
    chatId: string;
    currentUserId?: string;
    isAdmin: boolean;
    participantName?: string;
    onClose?: () => void;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const getMediaUrl = (mediaKey: string | null) => {
        if (!mediaKey) return "";
        return `/api/photos/download?key=${encodeURIComponent(mediaKey)}&direct=1`;
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/messages?chatId=${chatId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                scrollToBottom();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const intv = setInterval(fetchMessages, 3000);
        return () => clearInterval(intv);
    }, [chatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendText = async () => {
        if (!text.trim()) return;
        const body = text.trim();
        setText("");

        try {
            await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId, type: "text", body }),
            });
            fetchMessages();
        } catch (e) {
            toast.error("Failed to send message");
        }
    };

    const handleRecordToggle = async () => {
        if (isRecording) {
            mediaRecorder.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
                mediaRecorder.current = recorder;

                let chunks: Blob[] = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: "audio/webm" });
                    setAudioChunks([]);
                    chunks = [];
                    stream.getTracks().forEach((t) => t.stop());

                    const formData = new FormData();
                    formData.append("file", new File([blob], "voice.webm", { type: "audio/webm" }));

                    toast.promise(
                        fetch("/api/messages/upload", { method: "POST", body: formData })
                            .then(async (res) => {
                                if (!res.ok) throw new Error();
                                const { key } = await res.json();
                                return fetch("/api/messages", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ chatId, type: "voice", mediaKey: key }),
                                });
                            })
                            .then(() => fetchMessages()),
                        {
                            loading: "Sending voice message...",
                            success: "Sent!",
                            error: "Failed to send voice message",
                        }
                    );
                };

                recorder.start();
                setIsRecording(true);
            } catch (err) {
                toast.error("Microphone access denied or unavailable");
            }
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        toast.promise(
            fetch("/api/messages/upload", { method: "POST", body: formData })
                .then(async (res) => {
                    if (!res.ok) throw new Error();
                    const { key } = await res.json();
                    return fetch("/api/messages", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chatId, type: "image", mediaKey: key }),
                    });
                })
                .then(() => fetchMessages()),
            {
                loading: "Sending image...",
                success: "Image sent!",
                error: "Failed to send image",
            }
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#111] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    {onClose && (
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition md:hidden">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}
                    <h2 className="text-lg font-bold tracking-tight">
                        {isAdmin ? participantName || "User Chat" : "Admin Support"}
                    </h2>
                </div>
                {isAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-widest font-bold bg-white/10 text-white">
                        Chat
                    </span>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="w-8 h-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                        <svg className="w-16 h-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-sm font-mono tracking-wide">Say hello! Messages are securely stored.</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-2">
                        {messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            const mediaUrl = getMediaUrl(msg.mediaKey);
                            const bubbleClass = `max-w-[75%] rounded-2xl p-3 ${
                                msg.type === "voice" ? "p-1 bg-white/5" : "text-sm"
                            } border transition ${
                                isMe
                                    ? "bg-indigo-600/20 text-indigo-100 border-indigo-500/30 rounded-br-none"
                                    : "bg-white/10 text-zinc-200 border-white/5 rounded-bl-none"
                            }`;

                            return (
                                <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className={bubbleClass}>
                                        {msg.type === "text" && <p className="whitespace-pre-wrap">{msg.body}</p>}
                                        {msg.type === "image" && (
                                            <img
                                                src={mediaUrl}
                                                className="rounded-xl max-h-60 object-cover"
                                                alt="Image message"
                                                loading="lazy"
                                            />
                                        )}
                                        {msg.type === "voice" && msg.mediaKey && (
                                            <VoicePlayer url={mediaUrl} />
                                        )}
                                        <div className="text-[9px] text-zinc-500 text-right mt-1 w-full opacity-70">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-4 border-t border-white/10 flex items-center gap-3 bg-black/40">
                {/* Image Upload */}
                <label className="shrink-0 p-2 rounded-full cursor-pointer hover:bg-white/10 text-zinc-400 hover:text-white transition">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </label>

                <div className="flex-1 bg-white/5 border border-white/10 rounded-full flex items-center px-4 py-1.5 focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                        placeholder="Message..."
                        className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500"
                    />
                </div>

                {text.trim() ? (
                    <button
                        onClick={handleSendText}
                        className="shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-500 hover:scale-105 transition active:scale-95"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={handleRecordToggle}
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition shadow-lg hover:scale-105 active:scale-95 ${
                            isRecording
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-white/10 text-zinc-300 border border-white/10 hover:bg-white/20"
                        }`}
                        title={isRecording ? "Stop Recording" : "Record Voice Message"}
                    >
                        {isRecording ? (
                            <div className="w-3 h-3 bg-white rounded-sm" />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
