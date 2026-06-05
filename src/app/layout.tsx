import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ClientUi from "@/components/ClientUi";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "leaflet/dist/leaflet.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  if (saved === 'silver') {
                    document.documentElement.setAttribute('data-theme', 'silver');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
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
