import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Photo Studio | Private Gallery",
  description: "A secure, premium personal photo portfolio.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <NextTopLoader color="#fff" showSpinner={false} shadow="0 0 10px #ffffff,0 0 5px #ffffff" />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Toaster theme="dark" position="bottom-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
