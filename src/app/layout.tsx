import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Syne } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { AppShell } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host =
    headersList.get("host") ||
    headersList.get("x-forwarded-host") ||
    "";
  const isFamily =
    host.includes("home.lookandseen") || host.includes("family");
  const mode = isFamily ? "hd" : "mc";

  return {
    title: isFamily ? "The Sweeney Family" : "Mission Control",
    description: isFamily ? "The Sweeney Family" : "Look & Seen work dashboard",
    manifest: `/api/manifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: isFamily ? "HD" : "MC",
      startupImage: `/api/favicon?mode=${mode}&size=512`,
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    icons: {
      icon: `/api/favicon?mode=${mode}`,
      apple: `/api/favicon?mode=${mode}&size=192`,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#060606",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host =
    headersList.get("host") ||
    headersList.get("x-forwarded-host") ||
    "";
  const isFamily =
    host.includes("home.lookandseen") || host.includes("family");

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${syne.variable} font-sans antialiased${isFamily ? " family-mode" : ""}`}
      >
        <ConvexClientProvider>
          <CommandPalette />
          <AppShell>
            {children}
          </AppShell>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
