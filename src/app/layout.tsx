import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Personal dashboard for managing OpenClaw",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          <CommandPalette />
          <Sidebar />
          <main className="min-h-screen pt-14 md:pt-0 md:pl-64">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
