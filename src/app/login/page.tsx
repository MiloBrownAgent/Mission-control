'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff, Rocket } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') ?? '/';

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
      body: JSON.stringify({ password, mode: 'work', redirect: redirectPath }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = (data.redirect && data.redirect !== '/') ? data.redirect : '/';
    } else {
      setError('Incorrect password. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#060606]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B8956A]/10 border border-[#B8956A]/20 shadow-xl">
            <Rocket className="h-7 w-7 text-[#B8956A]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide font-[family-name:var(--font-display)] text-[#E8E4DF]">
              Mission Control
            </h1>
            <p className="text-sm mt-1.5 tracking-wide text-[#6B6560]">
              Private access only
            </p>
          </div>
        </div>

        <div className="mx-auto w-12 h-px bg-[#B8956A]/30" />

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-4 py-4 text-base text-[#E8E4DF] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:border-[#B8956A]/40 focus:ring-[#B8956A]/20 pr-12 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6B6560] hover:text-[#E8E4DF] transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl px-4 py-4 text-base font-medium tracking-wide transition-all disabled:opacity-50 bg-[#B8956A] hover:bg-[#CDAA7E] active:bg-[#B8956A] text-[#060606]"
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs tracking-wider uppercase text-[#6B6560]">
          mc.lookandseen.com
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
