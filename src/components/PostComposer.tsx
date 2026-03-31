"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function PostComposer({ onPostCreated }: { onPostCreated: () => void }) {
    const [body, setBody] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Visibility options
    const [showOptions, setShowOptions] = useState(false);
    const [expiresDays, setExpiresDays] = useState<number | ''>('');
    const [includeRoles, setIncludeRoles] = useState<string>("");
    const [excludeRoles, setExcludeRoles] = useState<string>("");

    const handleSubmit = async () => {
        if (!body.trim()) return;
        setIsSubmitting(true);

        // Compute expiry date if requested
        let expiresAt: string | undefined;
        if (typeof expiresDays === 'number' && expiresDays > 0) {
            const date = new Date();
            date.setDate(date.getDate() + expiresDays);
            expiresAt = date.toISOString();
        }

        const payload = {
            body,
            expiresAt,
            filter: {
                includeRoles: includeRoles ? includeRoles.split(',').map(s => s.trim()).filter(Boolean) : [],
                excludeRoles: excludeRoles ? excludeRoles.split(',').map(s => s.trim()).filter(Boolean) : []
            }
        };

        try {
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Post broadcasted!");
                setBody("");
                setShowOptions(false);
                setExpiresDays('');
                setIncludeRoles("");
                setExcludeRoles("");
                onPostCreated();
            } else {
                toast.error("Failed to create post");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="glass-card p-5 mb-8 border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden">
            <h2 className="text-xl font-bold tracking-tight mb-4 text-white">Broadcast Update</h2>
            
            <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What's happening? (Supports quick markdown)"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white resize-none min-h-[100px] focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition custom-scrollbar"
                rows={4}
            />

            <div className="flex flex-col sm:flex-row justify-between mt-4">
                <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition flex items-center gap-2 mb-4 sm:mb-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showOptions ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    Visibility & Expiry
                </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden transition-all duration-300 ease-in-out ${showOptions ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ml-1">Expires in (Days)</label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={expiresDays}
                        onChange={e => setExpiresDays(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="e.g. 7 (Leave empty for never)"
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-indigo-500/50 outline-none transition"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ml-1">Include Roles (CSV)</label>
                    <input
                        type="text"
                        value={includeRoles}
                        onChange={e => setIncludeRoles(e.target.value)}
                        placeholder="e.g. VIP, Client"
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-green-500/50 outline-none transition"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider ml-1">Exclude Roles (CSV)</label>
                    <input
                        type="text"
                        value={excludeRoles}
                        onChange={e => setExcludeRoles(e.target.value)}
                        placeholder="e.g. Guest"
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-red-500/50 outline-none transition"
                    />
                </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
                <button
                    onClick={handleSubmit}
                    disabled={!body.trim() || isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-xs"
                >
                    {isSubmitting ? "Broadcasting..." : "Broadcast"}
                </button>
            </div>
        </div>
    );
}
