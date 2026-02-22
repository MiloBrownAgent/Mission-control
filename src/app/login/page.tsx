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
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isFamilyMode
        ? 'bg-gradient-to-br from-[#C4533A]/8 via-[#F8F4EF] to-[#C07A1A]/5'
        : 'bg-gradient-to-br from-[#2A4E8A]/8 via-[#F8F4EF] to-[#6B5A9B]/5'
    }`}>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl ${
            isFamilyMode ? 'bg-[#C4533A] shadow-[#C4533A]/20' : 'bg-[#2A4E8A] shadow-[#2A4E8A]/20'
          }`}>
            {isFamilyMode ? (
              <span className="text-3xl">🏠</span>
            ) : (
              <Lock className="h-8 w-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1C1208] font-[family-name:var(--font-display)]">
              {isFamilyMode ? 'Sweeney Home' : 'Mission Control'}
            </h1>
            <p className="text-sm text-[#6B5B4E] mt-1">
              {isFamilyMode ? 'Enter your family password' : 'Private access only'}
            </p>
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
              className="w-full rounded-xl border border-[#E5DDD4] bg-[#FFFCF7] px-4 py-3.5 text-[#1C1208] placeholder-[#6B5B4E]/60 text-lg focus:border-[#C4533A]/40 focus:outline-none focus:ring-2 focus:ring-[#C4533A]/20 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5B4E] hover:text-[#1C1208]"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={`w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white transition-all disabled:opacity-50 ${
              isFamilyMode
                ? 'bg-[#C4533A] hover:bg-[#C4533A]/90 active:bg-[#C4533A]/80'
                : 'bg-[#2A4E8A] hover:bg-[#2A4E8A]/90 active:bg-[#2A4E8A]/80'
            }`}
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B5B4E]">
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
