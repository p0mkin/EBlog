"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Photo } from "./PhotoGrid";

interface PhotoLightboxProps {
    photos: Photo[];
    currentIndex: number;
    isOwner: boolean;
    onClose: () => void;
    onNavigate: (index: number) => void;
    onPhotoUpdate: (photo: Photo) => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function PhotoLightbox({ photos, currentIndex, isOwner, onClose, onNavigate, onPhotoUpdate }: PhotoLightboxProps) {
    const photo = photos[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < photos.length - 1;
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });

    // Caption state
    const [caption, setCaption] = useState(photo.caption ?? "");
    const [captionSaving, setCaptionSaving] = useState(false);
    const captionRef = useRef<HTMLTextAreaElement>(null);

    // Like state
    const [liked, setLiked] = useState(photo.liked);
    const [likeCount, setLikeCount] = useState(photo.likeCount);
    const [likePulsing, setLikePulsing] = useState(false);

    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setNaturalSize({ w: 0, h: 0 });
        setCaption(photo.caption ?? "");
        setLiked(photo.liked);
        setLikeCount(photo.likeCount);
    }, [currentIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
        if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
        if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 7.5));
        if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
        if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    }, [onClose, onNavigate, currentIndex, hasPrev, hasNext]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.3 : 0.3;
        setZoom(z => {
            const next = Math.max(1, Math.min(z + delta, 7.5));
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1) return;
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        setPan({
            x: panStart.current.x + (e.clientX - dragStart.current.x),
            y: panStart.current.y + (e.clientY - dragStart.current.y),
        });
    };

    const handleMouseUp = () => setDragging(false);

    const handleDoubleClick = () => {
        if (zoom > 1) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
        } else {
            setZoom(3);
        }
    };

    const handleCaptionBlur = async () => {
        const trimmed = caption.trim();
        if (trimmed === (photo.caption ?? "")) return;
        setCaptionSaving(true);
        try {
            await fetch(`/api/photos/${encodeURIComponent(photo.id)}/caption`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caption: trimmed || null }),
            });
            onPhotoUpdate({ ...photo, caption: trimmed || null });
        } finally {
            setCaptionSaving(false);
        }
    };

    const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            captionRef.current?.blur();
        }
        e.stopPropagation(); // prevent lightbox key handlers
    };

    const handleLike = async () => {
        const newLiked = !liked;
        const newCount = likeCount + (newLiked ? 1 : -1);
        setLiked(newLiked);
        setLikeCount(newCount);
        setLikePulsing(true);
        setTimeout(() => setLikePulsing(false), 300);
        onPhotoUpdate({ ...photo, liked: newLiked, likeCount: newCount, caption });

        await fetch(`/api/photos/${encodeURIComponent(photo.id)}/like`, { method: "POST" });
    };

    const resW = photo.width || naturalSize.w;
    const resH = photo.height || naturalSize.h;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/98" onClick={onClose}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    <p className="text-xs text-zinc-500 font-mono">{currentIndex + 1} / {photos.length}</p>
                    {zoom > 1 && (
                        <p className="text-[10px] text-zinc-600 font-mono">{Math.round(zoom * 100)}%</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Heart/Like button */}
                    <button
                        onClick={handleLike}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition"
                        title="Like"
                    >
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill={liked ? "#ef4444" : "none"}
                            stroke={liked ? "#ef4444" : "currentColor"}
                            strokeWidth="2" strokeLinecap="round"
                            style={{
                                transition: "transform 0.15s ease",
                                transform: likePulsing ? "scale(1.35)" : "scale(1)",
                                color: liked ? "#ef4444" : "#71717a",
                            }}
                        >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {likeCount > 0 && (
                            <span className="text-[10px] font-bold" style={{ color: liked ? "#ef4444" : "#71717a" }}>
                                {likeCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setZoom(z => Math.min(z + 0.5, 7.5))}
                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition text-sm font-bold"
                        title="Zoom in (+)"
                    >+</button>
                    <button
                        onClick={() => setZoom(z => { const n = Math.max(z - 0.5, 1); if (n === 1) setPan({ x: 0, y: 0 }); return n; })}
                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition text-sm font-bold"
                        title="Zoom out (-)"
                    >−</button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition ml-2"
                        title="Close (Esc)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            </div>

            {/* Image area */}
            <div
                className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden select-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onClick={e => e.stopPropagation()}
                style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
            >
                {hasPrev && zoom <= 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
                        className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                )}

                <img
                    src={photo.fullUrl}
                    alt={photo.filename}
                    className="max-w-[95vw] max-h-[calc(100vh-160px)] object-contain"
                    draggable={false}
                    onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        transition: dragging ? 'none' : 'transform 0.2s ease',
                    }}
                />

                {hasNext && zoom <= 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
                        className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                )}
            </div>

            {/* Bottom metadata bar */}
            <div className="shrink-0 px-5 py-3 border-t border-white/5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                {/* Caption row */}
                {(isOwner || caption) && (
                    <div className="flex items-start gap-3">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" className="mt-1 shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {isOwner ? (
                            <textarea
                                ref={captionRef}
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                onBlur={handleCaptionBlur}
                                onKeyDown={handleCaptionKeyDown}
                                placeholder="Add a caption… (Enter to save)"
                                rows={1}
                                className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 resize-none outline-none border-none focus:text-white transition-colors"
                                style={{ overflowY: "hidden" }}
                                onInput={e => {
                                    const t = e.target as HTMLTextAreaElement;
                                    t.style.height = 'auto';
                                    t.style.height = t.scrollHeight + 'px';
                                }}
                            />
                        ) : (
                            <p className="flex-1 text-xs text-zinc-300">{caption}</p>
                        )}
                        {captionSaving && <span className="text-[9px] text-zinc-600 font-mono">saving…</span>}
                    </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-8">
                    <div>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Size</p>
                        <p className="text-xs text-white font-mono">{formatBytes(photo.fileSize)}</p>
                    </div>
                    {(resW > 0 && resH > 0) && (
                        <div>
                            <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Resolution</p>
                            <p className="text-xs text-white font-mono">{resW} × {resH}</p>
                        </div>
                    )}
                    <div className="ml-auto text-[9px] text-zinc-700 font-mono">
                        Scroll to zoom · Double-click to toggle · Drag to pan
                    </div>
                </div>
            </div>
        </div>
    );
}
