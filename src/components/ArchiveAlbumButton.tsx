"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchiveAlbumButton({ albumId, albumName, isArchived, className }: {
    albumId: string,
    albumName: string,
    isArchived: boolean,
    className?: string
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleArchive = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const action = isArchived ? "unarchive" : "archive";
        const newStatus = isArchived ? "private" : "archived"; // revert to private (or public? assume private for safety)

        if (!confirm(`Are you sure you want to ${action} album "${albumName}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/albums/${albumId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visibility: newStatus }),
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || "Update failed");
            }

            router.refresh();
        } catch (error: any) {
            console.error(`${action} album error:`, error);
            alert(`Failed to ${action} album: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleArchive}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${isArchived
                    ? "bg-amber-400/10 border-amber-400/20 text-amber-400 hover:bg-amber-400/20"
                    : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                } ${className}`}
            title={isArchived ? "Unarchive Album" : "Archive Album"}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
            )}
            <span className="text-xs font-bold uppercase tracking-widest">
                {isArchived ? "Unarchive" : "Archive"}
            </span>
        </button>
    );
}
