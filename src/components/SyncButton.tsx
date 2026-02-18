"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/sync", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                router.refresh();
                alert(data.message || "Sync successful!");
            } else {
                // Show the actual server error to the user
                alert(`Sync failed: ${data.error || res.statusText}`);
                console.error("Sync error response:", data);
            }
        } catch (error: any) {
            console.error("Sync network error:", error);
            alert(`Sync failed (network): ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={syncing}
            className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 glass-card hover:border-white/20 transition disabled:opacity-50 flex items-center gap-2 group"
        >
            <svg
                className={`${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition duration-500'}`}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21v-5h5" />
            </svg>
            {syncing ? "Syncing..." : "Sync R2"}
        </button>
    );
}
