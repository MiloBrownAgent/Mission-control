'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LogOut } from 'lucide-react';
import FilesBrowser from '@/components/portal/FilesBrowser';

interface Me {
  userId: string;
  email: string;
  clientSlug: string;
  name?: string;
}

export default function PortalFilesPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/me')
      .then(res => {
        if (!res.ok) {
          router.replace('/portal/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setMe(data);
      })
      .catch(() => router.replace('/portal/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/portal/auth', { method: 'DELETE' });
    router.replace('/portal/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <svg className="w-5 h-5 text-[#B8956A] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M12 2a10 10 0 1 0 10 10" />
        </svg>
      </div>
    );
  }

  if (!me) return null;

  const folderPath = `/Look & Seen/Clients/${me.clientSlug}`;

  return (
    <div className="min-h-screen bg-[#060606] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[#1C1C1C] bg-[#060606]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <Camera className="h-4 w-4 text-[#B8956A]" />
            <span className="text-sm font-light tracking-wider text-[#E8E4DF]">
              Look &amp; Seen
            </span>
          </div>

          {/* Right: client name + logout */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B6560] hidden sm:block">
              {me.name ?? me.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs tracking-wider text-[#6B6560] hover:text-[#E8E4DF] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-light tracking-wide text-[#E8E4DF]">
            Your Files
          </h1>
          <p className="text-sm text-[#6B6560] mt-1">
            {me.name ? `Welcome back, ${me.name.split(' ')[0]}.` : 'Your project deliverables are below.'}
          </p>
        </div>

        <FilesBrowser
          rootPath={folderPath}
          rootLabel={me.clientSlug}
        />
      </main>
    </div>
  );
}
