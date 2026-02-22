"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface UserBadgeProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        username?: string | null;
    };
    isOwner: boolean;
    userRole?: { name: string; color: string } | null;
}

export default function UserBadge({ user, isOwner, userRole }: UserBadgeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <div
                className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-white leading-tight">
                        {user.name || 'User'}
                    </span>
                    {isOwner ? (
                        <span className="admin-badge px-1.5 py-0.5 rounded-md text-white/90">Admin</span>
                    ) : (
                        <span
                            className="text-[9px] uppercase tracking-widest font-black"
                            style={{ color: userRole?.color || '#71717a' }}
                        >
                            {userRole?.name || 'Viewer'}
                        </span>
                    )}
                </div>
                {user.image ? (
                    <img src={user.image} alt="" className="w-6 h-6 rounded-full border border-white/20 hover:border-white/50 transition-colors" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10" />
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 pt-1.5 z-[100] animate-in">
                    <div className="bg-[#111] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden min-w-[160px]">
                        <div className="px-3 py-2 border-b border-white/5">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{user.email || user.username || 'unknown'}</p>
                        </div>
                        {isOwner && (
                            <Link
                                href="/admin/roles"
                                className="w-full text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2 border-b border-white/5"
                                onClick={() => setIsOpen(false)}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Manage Roles
                            </Link>
                        )}
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="w-full text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
