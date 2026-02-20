"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeduplicateButton({ className }: { className?: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDeduplicate = async () => {
        if (loading) return;
        if (!confirm("Start duplicate detection?\n\nThis will scan all photos and HIDE duplicate copies found in 'junk' albums (random characters), keeping the best copy visible.\n\nThis might take a moment.")) return;

        setLoading(true);
        try {
            const res = await fetch("/api/admin/deduplicate", { method: "POST" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to deduplicate");

            alert(`Deduplication Complete!\n\nProcessed: ${data.processed} photos\nDuplicates Found & Hidden: ${data.duplicatesFound}`);
            router.refresh();
        } catch (error: any) {
            console.error("Deduplicate error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDeduplicate}
            disabled={loading}
            className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 glass-card hover:border-white/20 hover:bg-white/5 transition flex items-center gap-2 group ${className}`}
            title="Find & Hide Duplicates"
        >
            <svg
                className={`text-zinc-400 group-hover:text-white transition ${loading ? "animate-spin" : ""}`}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            >
                {loading ? (
                    <>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </>
                ) : (
                    <>
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                    </>
                )}
            </svg>
            <span className="text-zinc-300 group-hover:text-white transition">
                {loading ? "Scanning…" : "Dedup"}
            </span>
        </button>
    );
}
