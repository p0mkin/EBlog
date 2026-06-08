"use client";

import { useState, useEffect } from "react";

interface Role {
    id: string;
    name: string;
    color: string;
    durationDays: number | null;
    isPayAsYouGo: boolean;
    photoUnlockPrice: number | null;
    blurPreviewCount: number | null;
    assignments: { id: string; user: { id: string; email: string; name: string | null }; expiresAt: string | null }[];
    albumAccess: { id: string; album: { id: string; name: string; slug: string } }[];
}

interface Album {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
}

// ─── Tree Utilities ──────────────────────────────────────────────────
function buildTree(albums: Album[], parentId: string | null = null, depth = 0): { album: Album; depth: number }[] {
    const children = albums.filter((a) => a.parentId === parentId);
    const result: { album: Album; depth: number }[] = [];
    for (const child of children) {
        result.push({ album: child, depth });
        result.push(...buildTree(albums, child.id, depth + 1));
    }
    return result;
}

function getAllDescendantIds(albums: Album[], id: string): string[] {
    const children = albums.filter((a) => a.parentId === id);
    const result: string[] = [];
    for (const child of children) {
        result.push(child.id);
        result.push(...getAllDescendantIds(albums, child.id));
    }
    return result;
}

// ─── Album Picker Modal ─────────────────────────────────────────────
function AlbumPickerModal({
    albums,
    alreadyGranted,
    onConfirm,
    onClose,
}: {
    albums: Album[];
    alreadyGranted: Set<string>;
    onConfirm: (ids: string[]) => void;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const tree = buildTree(albums);

    const toggle = (id: string) => {
        const descendants = getAllDescendantIds(albums, id);
        const allIds = [id, ...descendants];
        const selectableIds = allIds.filter((i) => !alreadyGranted.has(i));

        setSelected((prev) => {
            const next = new Set(prev);
            const allSelected = selectableIds.every((i) => next.has(i));
            if (allSelected) {
                selectableIds.forEach((i) => next.delete(i));
            } else {
                selectableIds.forEach((i) => next.add(i));
            }
            return next;
        });
    };

    // A node is "checked" if it itself is selected or already granted
    const isChecked = (id: string) => alreadyGranted.has(id) || selected.has(id);

    // A node is "indeterminate" (partially selected) if some but not all
    // of its descendants are selected
    const isIndeterminate = (id: string) => {
        if (isChecked(id)) return false;
        const descendants = getAllDescendantIds(albums, id);
        return descendants.some((d) => selected.has(d) || alreadyGranted.has(d));
    };

    const selectableCount = [...selected].filter((id) => !alreadyGranted.has(id)).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in">
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Grant Album Access</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-0.5">
                    {tree.map(({ album, depth }) => {
                        const granted = alreadyGranted.has(album.id);
                        const checked = isChecked(album.id);
                        const indeterminate = isIndeterminate(album.id);
                        const hasChildren = albums.some((a) => a.parentId === album.id);

                        return (
                            <button
                                key={album.id}
                                onClick={() => toggle(album.id)}
                                disabled={granted && !hasChildren}
                                style={{ paddingLeft: `${depth * 16}px` }}
                                className={`w-full flex items-center gap-2.5 pr-3 py-2 rounded-lg text-left transition text-xs ${granted && !hasChildren
                                    ? 'text-zinc-600 cursor-default'
                                    : 'text-white hover:bg-white/5 cursor-pointer'
                                    }`}
                            >
                                {/* Depth connector */}
                                {depth > 0 && (
                                    <span className="text-zinc-700 text-[10px] shrink-0 -ml-1">└</span>
                                )}

                                {/* Checkbox */}
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${checked ? 'bg-white border-white' : indeterminate ? 'border-zinc-400 bg-zinc-700' : 'border-zinc-600'
                                    }`}>
                                    {checked && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={granted ? '#555' : '#000'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                    {indeterminate && !checked && (
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                    )}
                                </div>

                                <span className={depth === 0 ? 'font-semibold' : 'text-zinc-300'}>{album.name}</span>

                                {granted && !hasChildren && (
                                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-auto">Granted</span>
                                )}
                                {hasChildren && (
                                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-auto">
                                        {getAllDescendantIds(albums, album.id).length} nested
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {tree.length === 0 && (
                        <p className="text-xs text-zinc-600 italic text-center py-4">No albums available</p>
                    )}
                </div>
                <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {selectableCount} album{selectableCount !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                const newIds = [...selected].filter((id) => !alreadyGranted.has(id));
                                if (newIds.length > 0) onConfirm(newIds);
                                onClose();
                            }}
                            disabled={selectableCount === 0}
                            className="px-5 py-2 bg-white text-black rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Roles Manager ──────────────────────────────────────────────────
export default function RolesManager() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleColor, setNewRoleColor] = useState("#6366f1");
    const [newRoleDuration, setNewRoleDuration] = useState("");
    const [newRoleIsPayAsYouGo, setNewRoleIsPayAsYouGo] = useState(false);
    const [newRoleUnlockPrice, setNewRoleUnlockPrice] = useState("");
    const [newRolePreviewCount, setNewRolePreviewCount] = useState("");
    const [pickerRoleId, setPickerRoleId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const fetchRoles = async () => {
        const res = await fetch("/api/admin/roles");
        if (res.ok) {
            const data = await res.json();
            setRoles(data);
        }
    };

    const fetchAlbums = async () => {
        const res = await fetch("/api/admin/albums");
        if (res.ok) setAlbums(await res.json());
    };

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchRoles(), fetchAlbums()]);
            setLoading(false);
        };
        loadData();
    }, []);

    // Set selected role to the first one after fetching if not set yet
    useEffect(() => {
        if (!selectedRoleId && roles.length > 0) {
            setTimeout(() => setSelectedRoleId(roles[0].id), 0);
        }
    }, [roles, selectedRoleId]);

    const createRole = async () => {
        if (!newRoleName.trim()) return;
        const duration = newRoleDuration.trim() ? parseInt(newRoleDuration.trim(), 10) : null;

        const payload = {
            name: newRoleName.trim(),
            color: newRoleColor,
            durationDays: duration,
            isPayAsYouGo: newRoleIsPayAsYouGo,
            photoUnlockPrice: newRoleIsPayAsYouGo && newRoleUnlockPrice.trim() ? parseFloat(newRoleUnlockPrice.trim()) : null,
            blurPreviewCount: newRoleIsPayAsYouGo && newRolePreviewCount.trim() ? parseInt(newRolePreviewCount.trim(), 10) : null
        };

        await fetch("/api/admin/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        setNewRoleName("");
        setNewRoleDuration("");
        setNewRoleIsPayAsYouGo(false);
        setNewRoleUnlockPrice("");
        setNewRolePreviewCount("");
        await fetchRoles();
    };

    const deleteRole = async (id: string, name: string) => {
        if (name === 'viewer') {
            alert("The viewer role cannot be deleted.");
            return;
        }
        if (!confirm("Delete this role? All assignments will be removed.")) return;
        await fetch("/api/admin/roles", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (selectedRoleId === id) setSelectedRoleId(roles[0]?.id || null);
        await fetchRoles();
    };

    const assignUser = async (roleId: string) => {
        const email = prompt("Enter user's email to assign this role:");
        if (!email) return;
        await fetch("/api/admin/roles/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId, userEmail: email }),
        });
        await fetchRoles();
    };

    const removeAssignment = async (id: string) => {
        await fetch("/api/admin/roles/assign", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        await fetchRoles();
    };

    const batchGrantAlbumAccess = async (roleId: string, albumIds: string[]) => {
        await fetch("/api/admin/roles/albums", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId, albumIds }),
        });
        await fetchRoles();
    };

    const revokeAlbumAccess = async (id: string) => {
        await fetch("/api/admin/roles/albums", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        await fetchRoles();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const pickerRole = pickerRoleId ? roles.find((r) => r.id === pickerRoleId) : null;
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    const isViewer = selectedRole?.name === 'viewer';

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Left Sidebar - Roles List */}
            <div className="w-full md:w-1/3 space-y-4">
                <div className="space-y-2">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`w-full text-left p-4 rounded-xl border transition ${selectedRoleId === role.id ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                                <span className="font-bold text-white capitalize truncate">{role.name}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                    {role.assignments.length} members
                                </span>
                                <div className="flex gap-1">
                                    {role.isPayAsYouGo && (
                                        <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded-full capitalize tracking-wide flex items-center gap-1">
                                            PAYG
                                        </span>
                                    )}
                                    {role.durationDays && (
                                        <span className="text-[10px] text-zinc-400 font-bold bg-white/5 px-2 py-0.5 rounded-full capitalize tracking-wide flex items-center gap-1">
                                            ⏱ {role.durationDays}d
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Create Role Form */}
                <div className="rounded-xl p-4 border border-dashed border-white/10 bg-white/[0.02]">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">New Role</h2>
                    <div className="space-y-3">
                        <div>
                            <input
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="Role Name"
                                onKeyDown={(e) => e.key === 'Enter' && createRole()}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={newRoleDuration}
                                onChange={(e) => setNewRoleDuration(e.target.value)}
                                placeholder="Days (Opt)"
                                type="number"
                                onKeyDown={(e) => e.key === 'Enter' && createRole()}
                                className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                            />
                            <input
                                type="color"
                                value={newRoleColor}
                                onChange={(e) => setNewRoleColor(e.target.value)}
                                className="w-9 h-9 shrink-0 rounded-lg bg-transparent border border-white/10 cursor-pointer p-0"
                            />
                        </div>

                        {/* Pay as you go toggle */}
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                            <input
                                type="checkbox"
                                id="paygToggle"
                                checked={newRoleIsPayAsYouGo}
                                onChange={(e) => setNewRoleIsPayAsYouGo(e.target.checked)}
                                className="w-3.5 h-3.5 bg-black/50 border-white/20 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <label htmlFor="paygToggle" className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest cursor-pointer select-none">
                                Pay-As-You-Go Mode
                            </label>
                        </div>

                        {newRoleIsPayAsYouGo && (
                            <div className="flex gap-2">
                                <input
                                    value={newRoleUnlockPrice}
                                    onChange={(e) => setNewRoleUnlockPrice(e.target.value)}
                                    placeholder="Price ($)"
                                    type="number"
                                    step="0.01"
                                    className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                                />
                                <input
                                    value={newRolePreviewCount}
                                    onChange={(e) => setNewRolePreviewCount(e.target.value)}
                                    placeholder="Blur limit"
                                    type="number"
                                    className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                                />
                            </div>
                        )}

                        <button
                            onClick={createRole}
                            className="w-full py-2 bg-white text-black rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Main Area - Role Details */}
            <div className="w-full md:w-2/3">
                {selectedRole ? (
                    <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
                        <div className="p-6 md:p-8 border-b border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                                    <h2 className="text-2xl font-bold text-white capitalize">{selectedRole.name}</h2>
                                    {isViewer && (
                                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest bg-white/5 px-2 py-1 rounded">
                                            Default
                                        </span>
                                    )}
                                </div>
                                {!isViewer && (
                                    <button
                                        onClick={() => deleteRole(selectedRole.id, selectedRole.name)}
                                        className="text-zinc-600 hover:text-red-400 transition text-xs font-bold uppercase tracking-widest"
                                    >
                                        Delete Role
                                    </button>
                                )}
                            </div>

                            {isViewer ? (
                                <p className="text-xs text-zinc-500 max-w-md mt-4">
                                    All signed-in users start as viewers. Grant album access below to control what everyone can see.
                                </p>
                            ) : (
                                <p className="text-xs text-zinc-500 mt-2">
                                    {selectedRole.durationDays
                                        ? `Access expires ${selectedRole.durationDays} days after being granted.`
                                        : 'Users granted this role keep it for a lifetime.'}
                                </p>
                            )}

                            {selectedRole.isPayAsYouGo && (
                                <div className="mt-4 flex gap-3">
                                    <div className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                                        <span className="block text-[9px] uppercase tracking-widest text-green-500/70 font-bold mb-0.5">Photo Price</span>
                                        <span className="text-sm font-semibold text-green-400">${selectedRole.photoUnlockPrice?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
                                        <span className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Photo Preview Limit</span>
                                        <span className="text-sm font-semibold text-white">{selectedRole.blurPreviewCount || 'All'} locked</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 space-y-10">
                            {/* Members */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Members</h4>
                                    {!isViewer && (
                                        <button
                                            onClick={() => assignUser(selectedRole.id)}
                                            className="text-[10px] uppercase tracking-widest font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
                                        >
                                            + Add Member
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {selectedRole.assignments.length === 0 && (
                                        <p className="text-xs text-zinc-600 italic">No members assigned.</p>
                                    )}
                                    {selectedRole.assignments.map((a) => (
                                        <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3 gap-2">
                                            <div>
                                                <span className="text-sm text-white font-medium block">{a.user.email}</span>
                                                {a.expiresAt && (
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 block ${new Date(a.expiresAt) < new Date() ? 'text-red-400' : 'text-zinc-500'}`}>
                                                        {new Date(a.expiresAt) < new Date() ? 'Expired' : `Expires ${new Date(a.expiresAt).toLocaleDateString()}`}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeAssignment(a.id)}
                                                className="text-zinc-600 hover:text-red-400 transition shrink-0 self-end sm:self-auto"
                                                title="Remove member"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Album Access */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Album Access</h4>
                                    <button
                                        onClick={() => setPickerRoleId(selectedRole.id)}
                                        className="text-[10px] uppercase tracking-widest font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
                                    >
                                        + Grant Access
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedRole.albumAccess.length === 0 && (
                                        <p className="text-xs text-zinc-600 italic">No album access granted yet.</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedRole.albumAccess.map((a) => (
                                            <div key={a.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3">
                                                <span className="text-sm text-white truncate pr-2">{a.album.name}</span>
                                                <button
                                                    onClick={() => revokeAlbumAccess(a.id)}
                                                    className="text-zinc-600 hover:text-red-400 transition shrink-0"
                                                    title="Revoke access"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[40vh] border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-zinc-600 text-sm">
                        Select a role to view or edit details
                    </div>
                )}
            </div>

            {/* Album Picker Modal */}
            {pickerRole && (
                <AlbumPickerModal
                    albums={albums}
                    alreadyGranted={new Set(pickerRole.albumAccess.map((a) => a.album.id))}
                    onConfirm={(ids) => batchGrantAlbumAccess(pickerRole.id, ids)}
                    onClose={() => setPickerRoleId(null)}
                />
            )}
        </div>
    );
}
