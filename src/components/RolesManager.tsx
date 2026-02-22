"use client";

import { useState, useEffect } from "react";

interface Role {
    id: string;
    name: string;
    color: string;
    assignments: { id: string; user: { id: string; email: string; name: string | null } }[];
    albumAccess: { id: string; album: { id: string; name: string; slug: string } }[];
}

interface Album {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
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

    // Build tree: top-level parents + children map
    const parentAlbums = albums.filter((a) => !a.parentId);
    const childrenMap = new Map<string, Album[]>();
    for (const a of albums) {
        if (a.parentId) {
            const siblings = childrenMap.get(a.parentId) || [];
            siblings.push(a);
            childrenMap.set(a.parentId, siblings);
        }
    }

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleParent = (parentId: string) => {
        const children = childrenMap.get(parentId) || [];
        const allIds = [parentId, ...children.map((c) => c.id)];
        const selectableIds = allIds.filter((id) => !alreadyGranted.has(id));

        setSelected((prev) => {
            const next = new Set(prev);
            const allSelected = selectableIds.every((id) => next.has(id));
            if (allSelected) {
                selectableIds.forEach((id) => next.delete(id));
            } else {
                selectableIds.forEach((id) => next.add(id));
            }
            return next;
        });
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
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
                    {parentAlbums.map((parent) => {
                        const children = childrenMap.get(parent.id) || [];
                        const isGranted = alreadyGranted.has(parent.id);
                        const isChecked = isGranted || selected.has(parent.id);

                        return (
                            <div key={parent.id}>
                                {/* Parent row */}
                                <button
                                    onClick={() => children.length > 0 ? toggleParent(parent.id) : toggle(parent.id)}
                                    disabled={isGranted && children.length === 0}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition text-xs font-semibold ${isGranted && children.length === 0
                                            ? 'text-zinc-600 cursor-default'
                                            : 'text-white hover:bg-white/5 cursor-pointer'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${isChecked
                                            ? 'bg-white border-white'
                                            : 'border-zinc-600'
                                        }`}>
                                        {isChecked && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isGranted ? '#555' : '#000'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </div>
                                    <span>{parent.name}</span>
                                    {isGranted && <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-auto">Granted</span>}
                                    {children.length > 0 && !isGranted && <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-auto">{children.length} sub</span>}
                                </button>

                                {/* Children */}
                                {children.map((child) => {
                                    const childGranted = alreadyGranted.has(child.id);
                                    const childChecked = childGranted || selected.has(child.id);
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => toggle(child.id)}
                                            disabled={childGranted}
                                            className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-left transition text-xs ${childGranted
                                                    ? 'text-zinc-600 cursor-default'
                                                    : 'text-zinc-300 hover:bg-white/5 cursor-pointer'
                                                }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition ${childChecked
                                                    ? 'bg-white border-white'
                                                    : 'border-zinc-700'
                                                }`}>
                                                {childChecked && (
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={childGranted ? '#555' : '#000'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </div>
                                            <span>{child.name}</span>
                                            {childGranted && <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-auto">Granted</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {parentAlbums.length === 0 && (
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
    const [pickerRoleId, setPickerRoleId] = useState<string | null>(null);

    const fetchRoles = async () => {
        const res = await fetch("/api/admin/roles");
        if (res.ok) setRoles(await res.json());
    };

    const fetchAlbums = async () => {
        const res = await fetch("/api/admin/albums");
        if (res.ok) setAlbums(await res.json());
    };

    useEffect(() => {
        Promise.all([fetchRoles(), fetchAlbums()]).finally(() => setLoading(false));
    }, []);

    const createRole = async () => {
        if (!newRoleName.trim()) return;
        await fetch("/api/admin/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newRoleName.trim(), color: newRoleColor }),
        });
        setNewRoleName("");
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

    return (
        <div className="space-y-8">
            {roles.map((role) => {
                const isViewer = role.name === 'viewer';
                return (
                    <div key={role.id} className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
                        {/* Role Header */}
                        <div className="p-5 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                                <h3 className="text-lg font-bold text-white capitalize">{role.name}</h3>
                                {isViewer && (
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                        Default
                                    </span>
                                )}
                                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                    {role.assignments.length} members
                                </span>
                            </div>
                            {isViewer ? (
                                <span className="text-[10px] text-zinc-700 italic">Built-in</span>
                            ) : (
                                <button
                                    onClick={() => deleteRole(role.id, role.name)}
                                    className="text-zinc-600 hover:text-red-400 transition text-xs font-bold uppercase tracking-widest"
                                >
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Viewer description */}
                        {isViewer && (
                            <div className="px-5 py-3 border-b border-white/5">
                                <p className="text-[11px] text-zinc-600">
                                    All signed-in users start as viewers. Grant album access below to control what they can see.
                                </p>
                            </div>
                        )}

                        <div className="p-5 grid md:grid-cols-2 gap-6">
                            {/* Members */}
                            <div>
                                <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Members</h4>
                                <div className="space-y-2">
                                    {role.assignments.length === 0 && isViewer && (
                                        <p className="text-[11px] text-zinc-700 italic px-1">All non-owner users are implicit viewers</p>
                                    )}
                                    {role.assignments.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                            <span className="text-xs text-white font-mono">{a.user.email}</span>
                                            <button
                                                onClick={() => removeAssignment(a.id)}
                                                className="text-zinc-600 hover:text-red-400 transition"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {!isViewer && (
                                        <button
                                            onClick={() => assignUser(role.id)}
                                            className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs text-zinc-500 hover:text-white hover:border-white/20 transition"
                                        >
                                            + Add member
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Album Access */}
                            <div>
                                <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Album Access</h4>
                                <div className="space-y-2">
                                    {role.albumAccess.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                            <span className="text-xs text-white">{a.album.name}</span>
                                            <button
                                                onClick={() => revokeAlbumAccess(a.id)}
                                                className="text-zinc-600 hover:text-red-400 transition"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setPickerRoleId(role.id)}
                                        className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-white/10 text-xs text-zinc-500 hover:text-white hover:border-white/20 transition"
                                    >
                                        + Grant album access...
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Album Picker Modal */}
            {pickerRole && (
                <AlbumPickerModal
                    albums={albums}
                    alreadyGranted={new Set(pickerRole.albumAccess.map((a) => a.album.id))}
                    onConfirm={(ids) => batchGrantAlbumAccess(pickerRole.id, ids)}
                    onClose={() => setPickerRoleId(null)}
                />
            )}

            {/* Create Role */}
            <div className="rounded-2xl p-6 border border-dashed border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Create New Role</h2>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest block mb-1.5">Name</label>
                        <input
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="e.g. family, homie, friend"
                            onKeyDown={(e) => e.key === 'Enter' && createRole()}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest block mb-1.5">Color</label>
                        <input
                            type="color"
                            value={newRoleColor}
                            onChange={(e) => setNewRoleColor(e.target.value)}
                            className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={createRole}
                        className="px-6 py-2.5 bg-white text-black rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition shrink-0"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
