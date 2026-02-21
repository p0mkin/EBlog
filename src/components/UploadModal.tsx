"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Provider = "r2" | "oracle";

export default function UploadModal({ albumId }: { albumId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, filename: "" });
    const [provider, setProvider] = useState<Provider>("r2");
    const [isDragging, setIsDragging] = useState(false);

    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        if (uploading) return;
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0 || uploading) return;
        setUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setProgress({ current: i + 1, total: files.length, filename: file.name });

                if (provider === "r2") {
                    // Presigned URL flow: browser uploads directly to R2
                    const signRes = await fetch("/api/photos/sign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: file.name,
                            contentType: file.type,
                            albumId,
                        }),
                    });
                    if (!signRes.ok) {
                        const data = await signRes.json();
                        throw new Error(data.error || "Failed to get upload URL");
                    }
                    const { uploadUrl, key } = await signRes.json();

                    // Upload directly to R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": file.type },
                        body: file,
                    });
                    if (!uploadRes.ok) {
                        throw new Error("Direct upload to R2 failed");
                    }

                    // Save metadata
                    const metaRes = await fetch("/api/photos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            albumId,
                            filename: file.name,
                            r2Key: key,
                            fileSize: file.size,
                            storageProvider: "r2",
                        }),
                    });
                    if (!metaRes.ok) {
                        const data = await metaRes.json();
                        throw new Error(data.error || "Failed to save photo metadata");
                    }
                } else {
                    // Oracle: keep proxied upload
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("albumId", albumId);
                    formData.append("provider", "oracle");

                    const res = await fetch("/api/photos/upload", {
                        method: "POST",
                        body: formData,
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Upload failed");
                    }
                }
            }

            setFiles([]);
            setIsOpen(false);
            router.refresh();
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
            setProgress({ current: 0, total: 0, filename: "" });
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center gap-2"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm">Add Photos</span>
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm"
                    onClick={() => !uploading && setIsOpen(false)}
                >
                    <div
                        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight">Upload Photos</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={uploading}
                                className="text-zinc-500 hover:text-white transition disabled:opacity-50"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-1 overflow-auto">
                            {/* Drag Zone */}
                            {!uploading && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer ${isDragging
                                        ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <div className={`p-4 rounded-full bg-white/5 ${isDragging ? "text-blue-400" : "text-zinc-400"}`}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-medium text-zinc-200">
                                            {isDragging ? "Drop files now" : "Drag & Drop files here"}
                                        </p>
                                        <p className="text-sm text-zinc-500 mt-1">or click to browse</p>
                                    </div>
                                </div>
                            )}

                            {/* Files List */}
                            {files.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                                            {files.length} files selected
                                        </span>
                                        {!uploading && (
                                            <button
                                                onClick={() => setFiles([])}
                                                className="text-xs text-red-400 hover:text-red-300"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {files.map((file, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between p-3 rounded-lg border bg-white/5 ${uploading && i < progress.current - 1 ? 'border-green-500/30 bg-green-500/10' :
                                                    uploading && i === progress.current - 1 ? 'border-amber-500/30 bg-amber-500/10' :
                                                        'border-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] font-bold text-zinc-500">IMG</span>
                                                    </div>
                                                    <span className="text-sm text-zinc-300 truncate">{file.name}</span>
                                                    <span className="text-xs text-zinc-600">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                                </div>

                                                {uploading && i < progress.current - 1 && (
                                                    <svg className="text-green-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                                {uploading && i === progress.current - 1 && (
                                                    <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                )}
                                                {!uploading && (
                                                    <button onClick={() => removeFile(i)} className="text-zinc-600 hover:text-white transition">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Progress Bar */}
                            {uploading && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Uploading {progress.current} of {progress.total}</span>
                                        <span className="text-xs font-mono text-zinc-500">{Math.round((progress.current / progress.total) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2 truncate">Current: {progress.filename}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/3">
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/20">
                                <button
                                    onClick={() => setProvider("r2")}
                                    disabled={uploading}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition ${provider === "r2" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                                >
                                    R2 Storage
                                </button>
                                <button
                                    onClick={() => setProvider("oracle")}
                                    disabled={uploading}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition ${provider === "oracle" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                                >
                                    Oracle Cloud
                                </button>
                            </div>

                            <button
                                onClick={uploadFiles}
                                disabled={files.length === 0 || uploading}
                                className="bg-white text-black px-8 py-2.5 rounded-full font-bold hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                {uploading ? "Uploading..." : `Upload ${files.length > 0 ? files.length : ""} Photos`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
