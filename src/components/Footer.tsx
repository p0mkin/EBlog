import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full glass-card border-x-0 border-b-0 py-6 px-6 md:px-10 mt-auto animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-black font-bold text-xs">
                        E
                    </div>
                    <span className="font-semibold tracking-tight premium-gradient-text text-sm">
                        Photo Studio
                    </span>
                    <span className="text-zinc-500 text-xs ml-2">
                        &copy; {new Date().getFullYear()}
                    </span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors duration-300 relative group">
                        Privacy Policy
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <div className="w-[1px] h-3 bg-zinc-800" />
                    <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors duration-300 relative group">
                        Terms of Service
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <div className="w-[1px] h-3 bg-zinc-800" />
                    <Link href="/cookies" className="text-zinc-400 hover:text-white transition-colors duration-300 relative group">
                        Cookie Policy
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                </div>
            </div>
        </footer>
    );
}
