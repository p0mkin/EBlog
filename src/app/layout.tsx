import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ClientUi from "@/components/ClientUi";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
      <body className="min-h-screen flex flex-col">
        <ClientUi />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
