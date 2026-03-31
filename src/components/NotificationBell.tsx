"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error("Failed to fetch notifications");
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id?: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(id ? { id } : { markAll: true })
            });
            fetchNotifications();
        } catch (e) {
            toast.error("Failed to mark as read");
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return '❤️';
            case 'comment': return '🗨️';
            case 'reply': return '↩️';
            case 'tag': return '👋';
            case 'message': return '💬';
            case 'post': return '📢';
            default: return '🔔';
        }
    };

    const getLink = (n: any) => {
        if (n.type === 'message') return `/messages/${n.chatId || ''}`;
        if (n.type === 'post') return `/feed`;
        return `/gallery`; // Ideally scroll to photo or comment
    };

    const getMessage = (n: any) => {
        switch (n.type) {
            case 'like': return 'liked your photo';
            case 'comment': return 'commented on a photo';
            case 'reply': return 'replied to your comment';
            case 'tag': return 'mentioned you in a comment';
            case 'message': return 'sent you a message';
            case 'post': return 'posted an update';
            default: return 'interacted with you';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-white/10 transition"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-background"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 glass-card rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAsRead()}
                                className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-wider font-bold"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm text-zinc-500">
                                You're all caught up!
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`flex gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition group ${!n.read ? 'bg-white/5' : ''}`}>
                                    <div className="text-xl shrink-0 mt-1">{getIcon(n.type)}</div>
                                    <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                                        <p className="text-sm text-zinc-300 leading-snug">
                                            <span className="font-bold text-white">{n.actorName || 'Someone'}</span> {getMessage(n)}
                                        </p>
                                        <span className="text-[10px] text-zinc-500 mt-1">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {!n.read && (
                                        <div className="shrink-0 flex items-center justify-center">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
