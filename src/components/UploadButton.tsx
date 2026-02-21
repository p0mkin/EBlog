"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "r2" | "oracle";

export default function UploadButton({ albumId }: { albumId: string }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState("");
    const [provider, setProvider] = useState<Provider>("r2");
    const router = useRouter();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setProgress(`Uploading ${i + 1}/${files.length}…`);

                if (provider === "r2") {
                    // Presigned URL flow: browser uploads directly to R2
                    const signRes = await fetch("/api/photos/sign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: file.name,
                            contentType: file.type || undefined,
                            albumId,
                            provider: "r2",
                        }),
                    });
                    if (!signRes.ok) {
                        const data = await signRes.json();
                        throw new Error(data.error || "Failed to get upload URL");
                    }
                    const { uploadUrl, key } = await signRes.json();

                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": file.type || "application/octet-stream" },
                        body: file,
                    });
                    if (!uploadRes.ok) {
                        throw new Error("Direct upload to R2 failed");
                    }

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
                    // Oracle: proxied upload (no CORS support for direct uploads)
                    const ORACLE_MAX_SIZE = 4 * 1024 * 1024; // 4MB Vercel limit
                    if (file.size > ORACLE_MAX_SIZE) {
                        throw new Error(
                            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — Oracle uploads are limited to 4MB on Vercel. Switch to R2 Storage for larger files.`
                        );
                    }

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
            router.refresh();
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
            setProgress("");
            e.target.value = '';
        }
    };

    return (
        <div className="flex items-center gap-3">
            {/* Provider toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-full border border-white/10 bg-white/3">
                {(["r2", "oracle"] as Provider[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setProvider(p)}
                        disabled={uploading}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${provider === p
                            ? "bg-white text-black shadow"
                            : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        {p === "r2" ? "R2" : "Oracle"}
                    </button>
                ))}
            </div>

            {progress && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                        {progress}
                    </span>
                </div>
            )}

            <div className="relative group/btn">
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                />
                <button
                    disabled={uploading}
                    className="relative flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition duration-300 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover/btn:shadow-[0_0_25px_rgba(255,255,255,0.25)]"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs">{uploading ? "Processing" : "Add Photos"}</span>
                </button>
            </div>
        </div>
    );
}
