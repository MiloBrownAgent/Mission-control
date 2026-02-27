'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode') ?? 'work';
  const redirectPath = searchParams.get('redirect') ?? '/';
  const isFamilyMode = mode === 'family';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, mode, redirect: redirectPath }),
    });

    const data = await res.json();
    if (res.ok) {
      const defaultPath = isFamilyMode ? '/family-home' : '/';
      window.location.href = (data.redirect && data.redirect !== '/') ? data.redirect : defaultPath;
    } else {
      setError('Incorrect password. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#060606]">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl shadow-xl bg-[#B8956A]/10 border border-[#B8956A]/20">
            <Lock className="h-7 w-7 text-[#B8956A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#E8E4DF] font-[family-name:var(--font-display)]">
              Mission Control
            </h1>
            <p className="text-sm text-[#6B6560] mt-1">Private access only</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-4 py-3.5 text-[#E8E4DF] placeholder-[#6B6560] text-lg focus:border-[#B8956A]/40 focus:outline-none focus:ring-2 focus:ring-[#B8956A]/20 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560] hover:text-[#E8E4DF] transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-[#060606] transition-all disabled:opacity-50 bg-[#B8956A] hover:bg-[#CDAA7E] active:bg-[#B8956A]"
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B6560]">
          🔒 Private — Authorized access only
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
