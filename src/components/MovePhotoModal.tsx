"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Album {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
}

interface Props {
    photoId: string;
    currentAlbumId: string;
    onClose: () => void;
}

function buildTree(albums: Album[], parentId: string | null = null, depth = 0): { album: Album; depth: number }[] {
    const children = albums.filter(a => a.parentId === parentId);
    const result: { album: Album; depth: number }[] = [];
    for (const child of children) {
        result.push({ album: child, depth });
        result.push(...buildTree(albums, child.id, depth + 1));
    }
    return result;
}

export default function MovePhotoModal({ photoId, currentAlbumId, onClose }: Props) {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selected, setSelected] = useState<string>(currentAlbumId);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/albums")
            .then(r => r.json())
            .then(data => { setAlbums(data); setLoading(false); });
    }, []);

    const handleMove = async () => {
        if (selected === currentAlbumId) { onClose(); return; }
        setSaving(true);
        setErrorMsg(null);
        try {
            // Use body params to avoid slashes in IDs breaking URL path segments
            const res = await fetch("/api/photos/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photoId, albumId: selected }),
            });
            if (!res.ok) {
                const body = await res.text();
                console.error("Move API error:", res.status, body);
                setErrorMsg(`Failed (${res.status})`);
                return;
            }
            router.refresh();
            onClose();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message);
        } finally {
            setSaving(false);
        }
    };

    const tree = buildTree(albums);

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
            <div
                className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white">Move to Album</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {loading ? (
                    <div className="text-zinc-500 text-sm py-8 text-center">Loading albums…</div>
                ) : (
                    <div className="space-y-1 max-h-64 overflow-auto mb-5 pr-1">
                        {tree.map(({ album, depth }) => (
                            <button
                                key={album.id}
                                onClick={() => setSelected(album.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${selected === album.id
                                        ? "bg-white text-black"
                                        : "text-zinc-300 hover:bg-white/5"
                                    }`}
                                style={{ paddingLeft: `${12 + depth * 16}px` }}
                            >
                                {depth > 0 && (
                                    <span className="text-zinc-600 text-[10px]">└</span>
                                )}
                                {album.name}
                                {album.id === currentAlbumId && (
                                    <span className="ml-auto text-[9px] text-zinc-500 uppercase tracking-widest">current</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {errorMsg && (
                    <p className="mb-3 text-[10px] text-red-400 font-mono">{errorMsg}</p>
                )}

                <button
                    onClick={handleMove}
                    disabled={saving || loading}
                    className="w-full py-2.5 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 transition disabled:opacity-50"
                >
                    {saving ? "Moving…" : "Move Here"}
                </button>
            </div>
        </div>
    );
}
