"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAlbumButton({ albumId, albumName, className, redirectTo }: {
    albumId: string,
    albumName: string,
    className?: string,
    redirectTo?: string
}) {
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Are you SURE you want to delete album "${albumName}"?\n\nThis will permanently delete:\n- The album itself\n- All sub-albums inside it\n- All photos inside it\n\nThis action CANNOT be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch(`/api/albums/${albumId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || "Delete failed");
            }

            if (redirectTo) {
                router.push(redirectTo);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            console.error("Delete album error:", error);
            alert(`Failed to delete album: ${error.message}`);
            setDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20 hover:text-red-300 transition ${className}`}
            title="Delete Album"
        >
            {deleting ? (
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                </svg>
            )}
            <span className="text-xs font-bold uppercase tracking-widest">
                {deleting ? "Deleting…" : "Delete"}
            </span>
        </button>
    );
}
