"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isPublicPage = pathname.startsWith("/s/");

  if (isLogin || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen pt-14 md:pt-0 md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
