"use client";

import { useEffect, useState } from "react";

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState<"dark" | "silver">("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Read theme from localStorage or document attribute
        try {
            const saved = localStorage.getItem("theme") as "dark" | "silver" | null;
            const currentTheme = saved || (document.documentElement.getAttribute("data-theme") as "dark" | "silver") || "dark";
            setTheme(currentTheme);
            document.documentElement.setAttribute("data-theme", currentTheme);
        } catch (e) {
            console.error("Failed to read theme", e);
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "silver" : "dark";
        setTheme(nextTheme);
        try {
            localStorage.setItem("theme", nextTheme);
            document.documentElement.setAttribute("data-theme", nextTheme);
            
            // Dispatch custom event so other components (e.g. Map, Sonner, etc.) can react if needed
            window.dispatchEvent(new Event("themechange"));
        } catch (e) {
            console.error("Failed to save theme", e);
        }
    };

    if (!mounted) {
        // Render placeholder to avoid layout shift while mounting
        return (
            <div className="w-8 h-8 rounded-full border border-white/5 bg-transparent shrink-0" />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="group relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] hover:bg-[var(--glass-hover)] hover:scale-105 shadow-[0_2px_8px_rgba(0,0,0,0.15)] focus:outline-none focus:ring-2 focus:ring-zinc-400"
            title={theme === "dark" ? "Switch to Polished Silver" : "Switch to Midnight Black"}
            aria-label="Toggle theme"
        >
            {/* Glossy overlay layer for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-100 pointer-events-none" />

            <div className="relative w-4 h-4 flex items-center justify-center">
                {theme === "dark" ? (
                    /* Elegant Metallic Sun / Sparkle Icon for Light Mode Option */
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-all duration-500 rotate-0 scale-100 group-hover:rotate-45"
                    >
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                        <circle cx="12" cy="12" r="4" className="fill-zinc-400 group-hover:fill-zinc-200 transition-colors" />
                    </svg>
                ) : (
                    /* Elegant Midnight Moon Icon for Dark Mode Option */
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-900 transition-all duration-500 rotate-0 scale-100 group-hover:-rotate-12"
                    >
                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" className="fill-zinc-600 group-hover:fill-zinc-900 transition-colors" />
                    </svg>
                )}
            </div>
        </button>
    );
}
