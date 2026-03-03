import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Static slug registry — add new shared pages here
const SHARED_PAGES: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "savannah-march-2026": () => import("@/app/s/savannah-march-2026/page"),
  "babysitter": () => import("@/app/babysitter/page"),
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!SHARED_PAGES[slug]) return {};

  return {
    robots: {
      index: false,
      follow: false,
    },
    other: {
      "X-Robots-Tag": "noindex, nofollow",
    },
  };
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loader = SHARED_PAGES[slug];

  if (!loader) {
    notFound();
  }

  const { default: PageComponent } = await loader();
  return <PageComponent />;
}
