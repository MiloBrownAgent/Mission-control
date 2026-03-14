import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Cormorant_Garamond, Syne } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ConvexErrorBoundary } from "@/components/convex-error-boundary";
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
  const host = headersList.get("host") ?? "";
  const isFamily = host.includes("sweeney.family") || host.includes("home.lookandseen");
  const mode = isFamily ? "hd" : "mc";

  return {
    title: isFamily ? "Sweeney Home" : "Mission Control",
    description: isFamily ? "The Sweeney Family" : "Look & Seen work dashboard",
    manifest: `/api/manifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: isFamily ? "default" : "black-translucent",
      title: isFamily ? "Sweeney" : "MC",
      startupImage: `/api/favicon?mode=${mode}&size=512&v=3`,
    },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
    icons: {
      icon: `/api/favicon?mode=${mode}&v=3`,
      apple: `/api/favicon?mode=${mode}&size=192&v=3`,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#060606",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${syne.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          <ConvexErrorBoundary>
            <CommandPalette />
            <AppShell>
              {children}
            </AppShell>
          </ConvexErrorBoundary>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
