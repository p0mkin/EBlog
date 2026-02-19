"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
    parentId?: string; // undefined = root album, string = sub-album
    label?: string;    // button label override
}

export default function CreateAlbumButton({ parentId, label }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
        else { setName(""); setError(null); }
    }, [open]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/albums", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed, parentId: parentId ?? null }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Failed to create album");
            }
            router.refresh();
            setOpen(false);
            setName("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 glass-card hover:border-white/20 transition"
                title={parentId ? "Create sub-album" : "Create new album"}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {label ?? (parentId ? "Sub-album" : "New Album")}
            </button>
        );
    }

    return (
        <form
            onSubmit={handleCreate}
            className="flex items-center gap-2"
            onKeyDown={e => e.key === "Escape" && setOpen(false)}
        >
            <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={parentId ? "Sub-album name…" : "Album name…"}
                disabled={saving}
                className="text-xs bg-white/5 border border-white/15 focus:border-white/30 rounded-full px-3 py-1.5 text-white placeholder-zinc-600 outline-none transition w-44"
            />
            <button
                type="submit"
                disabled={saving || !name.trim()}
                className="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 transition disabled:opacity-40"
            >
                {saving ? "…" : "Create"}
            </button>
            <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white transition"
                title="Cancel"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            {error && <span className="text-[10px] text-red-400 font-mono">{error}</span>}
        </form>
    );
}
