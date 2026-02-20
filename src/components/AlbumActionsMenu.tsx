"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ArchiveAlbumButton from "./ArchiveAlbumButton";
import DeleteAlbumButton from "./DeleteAlbumButton";
import AlbumCoverPicker from "./AlbumCoverPicker";

interface AlbumActionsMenuProps {
    albumId: string;
    albumName: string;
    isArchived: boolean;
    isArchivedView: boolean;
    currentUrl: string;
    breadcrumb: string[];
    allPhotosForCover: any[];
    currentCoverId: string | null;
}

export default function AlbumActionsMenu({
    albumId,
    albumName,
    isArchived,
    isArchivedView,
    currentUrl,
    breadcrumb,
    allPhotosForCover,
    currentCoverId
}: AlbumActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coverPickerOpen, setCoverPickerOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [newName, setNewName] = useState(albumName);
    const [saving, setSaving] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (renameOpen && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renameOpen]);

    const handleRename = async () => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === albumName) {
            setRenameOpen(false);
            return;
        }
        setSaving(true);
        try {
            await fetch(`/api/albums/${albumId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });
            router.refresh();
        } catch (e) {
            console.error("Rename failed:", e);
        } finally {
            setSaving(false);
            setRenameOpen(false);
        }
    };

    const menuItemClass = "w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition flex items-center gap-3";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex flex-col gap-1 items-center justify-center rounded-full border border-white/10 glass-card hover:bg-white/10 transition"
                title="Album Actions"
            >
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-56 glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        {/* Rename Album */}
                        <button className={menuItemClass} onClick={() => { setIsOpen(false); setNewName(albumName); setRenameOpen(true); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                            </svg>
                            Rename Album
                        </button>

                        {/* Archive Toggle View */}
                        <Link
                            href={isArchivedView ? currentUrl.split('?')[0] : `${currentUrl}?showArchived=true`}
                            className={menuItemClass}
                            onClick={() => setIsOpen(false)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isArchivedView ? (
                                    <>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </>
                                )}
                            </svg>
                            {isArchivedView ? "Show Active" : "Show Archived"}
                        </Link>

                        <div className="h-[1px] bg-white/10 my-1" />

                        {/* Set Cover */}
                        <button className={menuItemClass} onClick={() => { setIsOpen(false); setCoverPickerOpen(true); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Set Cover Photo
                        </button>

                        {/* Archive Action */}
                        <div className="w-full">
                            <ArchiveAlbumButton
                                albumId={albumId}
                                albumName={albumName}
                                isArchived={isArchived}
                                className="!w-full !justify-start !px-4 !py-2 !border-none !rounded-none !bg-transparent hover:!bg-white/10 !text-zinc-300 hover:!text-white !font-normal !normal-case tracking-normal !gap-3"
                            />
                        </div>

                        <div className="h-[1px] bg-white/10 my-1" />

                        {/* Delete Action */}
                        <div className="w-full">
                            <DeleteAlbumButton
                                albumId={albumId}
                                albumName={albumName}
                                redirectTo={breadcrumb.length > 0 ? `/gallery/${breadcrumb.join('/')}` : '/gallery'}
                                className="!w-full !justify-start !px-4 !py-2 !border-none !rounded-none !bg-transparent hover:!bg-red-500/20 !text-red-400 hover:!text-red-300 !font-normal !normal-case tracking-normal !gap-3"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Cover picker rendered OUTSIDE the dropdown */}
            {coverPickerOpen && (
                <AlbumCoverPicker
                    albumId={albumId}
                    photos={allPhotosForCover}
                    currentCoverId={currentCoverId}
                    externalOpen={coverPickerOpen}
                    onClose={() => setCoverPickerOpen(false)}
                />
            )}

            {/* Rename modal */}
            {renameOpen && (
                <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-8" onClick={() => setRenameOpen(false)}>
                    <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Rename Album</h3>
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameOpen(false); }}
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white text-lg focus:outline-none focus:border-white/30 transition"
                            placeholder="Album name"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setRenameOpen(false)}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRename}
                                disabled={saving || !newName.trim() || newName.trim() === albumName}
                                className="px-4 py-2 text-sm bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
