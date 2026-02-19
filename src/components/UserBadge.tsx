"use client";

import { signOut } from "next-auth/react";

interface UserBadgeProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        username?: string | null;
    };
    isOwner: boolean;
}

export default function UserBadge({ user, isOwner }: UserBadgeProps) {
    return (
        <div className="relative group">
            <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full border-white/10 group-hover:border-white/30 transition-all duration-300 cursor-pointer">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-white leading-tight">
                        {user.name || 'User'}
                    </span>
                    {isOwner ? (
                        <span className="admin-badge px-1.5 py-0.5 rounded-md text-white/90">Admin</span>
                    ) : (
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Viewer</span>
                    )}
                </div>
                {user.image ? (
                    <img src={user.image} alt="" className="w-6 h-6 rounded-full border border-white/20 group-hover:border-white/50 transition-colors" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10" />
                )}
            </div>

            <div className="absolute top-full right-0 pt-1.5 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-[100]">
                <div className="bg-[#111] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden min-w-[160px]">
                    <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">@{user.username || 'unknown'}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
