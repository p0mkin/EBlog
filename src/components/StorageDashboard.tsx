"use client";

import { useState, useEffect } from "react";
import SyncButton from "./SyncButton";
import CreateAlbumButton from "./CreateAlbumButton";
import GalleryActionsMenu from "./GalleryActionsMenu";

const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const CACHE_KEY = "storage_usage_cache";

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 0.1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

interface UsageBarProps {
    label: string;
    bytes: number | null;
    color: string;
}

function UsageBar({ label, bytes, color }: UsageBarProps) {
    const pct = bytes !== null ? Math.min((bytes / STORAGE_LIMIT_BYTES) * 100, 100) : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
                <span className="text-[10px] font-mono text-zinc-500">
                    {bytes !== null ? `${formatBytes(bytes)} / 10 GB` : "—"}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    );
}

export default function StorageDashboard({ isArchivedView }: { isArchivedView: boolean }) {
    const [r2Bytes, setR2Bytes] = useState<number | null>(null);
    const [oracleBytes, setOracleBytes] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cachedAt, setCachedAt] = useState<string | null>(null);

    // Load from localStorage after mount (client-only) to avoid hydration mismatch
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.r2Bytes === "number") setR2Bytes(parsed.r2Bytes);
                if (typeof parsed.oracleBytes === "number") setOracleBytes(parsed.oracleBytes);
                if (parsed.cachedAt) setCachedAt(parsed.cachedAt);
            }
        } catch { }
    }, []);

    const syncUsage = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/storage-usage", { method: "POST" });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Failed to fetch usage");
            }
            const data = await res.json();
            setR2Bytes(data.r2Bytes);
            setOracleBytes(data.oracleBytes);
            const now = new Date().toLocaleTimeString();
            setCachedAt(now);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                r2Bytes: data.r2Bytes,
                oracleBytes: data.oracleBytes,
                cachedAt: now,
            }));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative glass-card rounded-2xl px-5 py-3 border border-white/8 min-w-[260px]">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Storage</span>
                <button
                    onClick={syncUsage}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition disabled:opacity-40"
                >
                    <svg
                        className={loading ? "animate-spin" : ""}
                        width="10" height="10" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 21v-5h5" />
                    </svg>
                    {loading ? "Syncing…" : "Sync Usage"}
                </button>
            </div>

            <div className="space-y-3">
                <UsageBar
                    label="R2"
                    bytes={r2Bytes}
                    color="linear-gradient(90deg, #f97316, #fb923c)"
                />
                <UsageBar
                    label="Oracle"
                    bytes={oracleBytes}
                    color="linear-gradient(90deg, #6366f1, #818cf8)"
                />
            </div>

            {error && (
                <p className="mt-3 text-[9px] text-red-400 font-mono">{error}</p>
            )}

            <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-3">
                <SyncButton className="!px-3 !py-1.5 !text-[10px] !border-white/5 hover:!bg-white/5" />
                <CreateAlbumButton />
                <GalleryActionsMenu isArchivedView={isArchivedView} dropdownClassName="absolute right-[calc(100%+12px)] bottom-0 w-64" noRelative />

            </div>
        </div>
    );
}
