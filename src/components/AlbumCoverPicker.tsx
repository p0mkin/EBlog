"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Photo {
    id: string;
    filename: string;
    thumbnailUrl: string;
}

export default function AlbumCoverPicker({ albumId, photos, currentCoverId }: {
    albumId: string;
    photos: Photo[];
    currentCoverId: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const setCover = async (photoId: string | null) => {
        setSaving(true);
        try {
            await fetch("/api/albums/cover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ albumId, coverPhotoId: photoId }),
            });
            router.refresh();
        } catch (e) {
            console.error("Failed to set cover:", e);
        } finally {
            setSaving(false);
            setOpen(false);
        }
    };

    if (photos.length === 0) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 text-zinc-500 hover:text-white hover:border-white/30 transition flex items-center gap-1.5"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                Set Cover
            </button>

            {open && (
                <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-8" onClick={() => setOpen(false)}>
                    <div className="bg-[#111] border border-white/10 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Choose Album Cover</h3>
                            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {currentCoverId && (
                            <button
                                onClick={() => setCover(null)}
                                disabled={saving}
                                className="w-full mb-4 px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs text-zinc-500 hover:text-white hover:border-white/20 transition"
                            >
                                Remove current cover
                            </button>
                        )}

                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {photos.map(photo => (
                                <button
                                    key={photo.id}
                                    onClick={() => setCover(photo.id)}
                                    disabled={saving}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition hover:opacity-100 ${photo.id === currentCoverId ? 'border-white opacity-100' : 'border-transparent opacity-70 hover:border-white/30'
                                        }`}
                                >
                                    <img src={photo.thumbnailUrl} alt={photo.filename} className="w-full h-full object-cover" loading="lazy" />
                                    {photo.id === currentCoverId && (
                                        <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
