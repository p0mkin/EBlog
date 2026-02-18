"use client";

import { useEffect, useCallback, useState, useRef } from "react";

interface Photo {
    id: string;
    filename: string;
    fileSize: number;
    uploadedAt: string;
    thumbnailUrl: string;
    fullUrl: string;
    width?: number;
    height?: number;
}

interface PhotoLightboxProps {
    photos: Photo[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
    const photo = photos[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < photos.length - 1;
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setNaturalSize({ w: 0, h: 0 });
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
                    className="max-w-[95vw] max-h-[calc(100vh-100px)] object-contain"
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

            {/* Bottom metadata bar — size + resolution only */}
            <div className="shrink-0 px-5 py-3 border-t border-white/5 flex items-center gap-8" onClick={e => e.stopPropagation()}>
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
    );
}
