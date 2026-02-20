"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import DeleteEmptyAlbumsButton from "./DeleteEmptyAlbumsButton";
import DeduplicateButton from "./DeduplicateButton";

interface GalleryActionsMenuProps {
    isArchivedView: boolean;
    dropdownClassName?: string;
    noRelative?: boolean;
}

export default function GalleryActionsMenu({ isArchivedView, dropdownClassName, noRelative }: GalleryActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={noRelative ? undefined : "relative"} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex flex-col gap-1 items-center justify-center rounded-full border border-white/10 glass-card hover:bg-white/10 transition"
                title="Gallery Actions"
            >
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
                <div className="w-5 h-0.5 bg-zinc-400 rounded-full" />
            </button>

            {isOpen && (
                <div className={`${dropdownClassName || "absolute right-0 top-12 w-64"} glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200`}>
                    <div className="p-1.5">
                        <div className="px-3 py-1.5 border-b border-white/5 mb-0.5">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                Tools
                            </p>
                        </div>

                        <div className="w-full">
                            <DeleteEmptyAlbumsButton className="!w-full !justify-start !px-4 !py-1.5 !border-none !rounded-lg !bg-transparent hover:!bg-white/5 !text-zinc-300 hover:!text-white !font-normal !normal-case tracking-normal !gap-3" />
                        </div>

                        <div className="w-full">
                            <DeduplicateButton className="!w-full !justify-start !px-4 !py-1.5 !border-none !rounded-lg !bg-transparent hover:!bg-white/5 !text-zinc-300 hover:!text-white !font-normal !normal-case tracking-normal !gap-3" />
                        </div>

                        <div className="my-1 border-t border-white/5" />

                        <Link
                            href={isArchivedView ? '/gallery' : '/gallery?showArchived=true'}
                            className="w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isArchivedView ? (
                                    <>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </>
                                ) : (
                                    <>
                                        <polyline points="21 8 21 21 3 21 3 8" />
                                        <rect x="1" y="3" width="22" height="5" />
                                        <line x1="10" y1="12" x2="14" y2="12" />
                                    </>
                                )}
                            </svg>
                            <span className="text-sm">
                                {isArchivedView ? "View Active Albums" : "View Archived Albums"}
                            </span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
