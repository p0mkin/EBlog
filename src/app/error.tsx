"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error Boundary caught:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md w-full">
                <svg
                    className="w-12 h-12 text-red-500 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <h2 className="text-xl font-bold mb-2 text-white">Something went wrong</h2>
                <p className="text-zinc-400 text-sm mb-6">
                    {error.message || "An unexpected error occurred while loading this page."}
                </p>
                <button
                    onClick={() => reset()}
                    className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
