"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEmptyAlbumsButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Delete all empty albums (and their empty sub-albums)? This cannot be undone.")) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("/api/admin/albums/empty", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult(data.deleted === 0 ? "No empty albums" : `Deleted ${data.deleted}`);
            if (data.deleted > 0) router.refresh();
        } catch (e: any) {
            setResult(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-red-900/40 text-red-500/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition disabled:opacity-40"
                title="Delete all albums that have no photos in them or any of their sub-albums"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                </svg>
                {loading ? "Cleaning…" : "Clean Empty"}
            </button>
            {result && (
                <span className="text-[10px] font-mono text-zinc-500">{result}</span>
            )}
        </div>
    );
}
