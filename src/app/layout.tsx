import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Syne } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Look & Seen work dashboard",
  manifest: `/api/manifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MC",
    startupImage: `/api/favicon?mode=mc&size=512`,
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
    icon: `/api/favicon?mode=mc`,
    apple: `/api/favicon?mode=mc&size=192`,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

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
          <CommandPalette />
          <AppShell>
            {children}
          </AppShell>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
