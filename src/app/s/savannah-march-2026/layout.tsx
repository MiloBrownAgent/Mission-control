import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vienna, Dylan and Fillipa do Savannah",
  description: "Your guide to The Ford Field & River Club — March 12–16, 2026",
  openGraph: {
    title: "Vienna, Dylan and Fillipa do Savannah",
    description: "Your guide to The Ford Field & River Club — March 12–16, 2026",
    images: ["https://sweeney.family/savannah-hero.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vienna, Dylan and Fillipa do Savannah",
    description: "Your guide to The Ford Field & River Club — March 12–16, 2026",
    images: ["https://sweeney.family/savannah-hero.jpg"],
  },
};

export default function SavannahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
