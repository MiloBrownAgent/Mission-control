'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';

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
      const defaultPath = isFamilyMode ? '/today' : '/';
      window.location.href = (data.redirect && data.redirect !== '/') ? data.redirect : defaultPath;
    } else {
      setError('Incorrect password. Try again.');
      setLoading(false);
    }
  }

  if (isFamilyMode) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left: Editorial gradient panel (hidden on mobile, visible on desktop) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1C1208] via-[#2C1F10] to-[#0D0A06] items-center justify-center">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #B8965A 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#B8965A]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#B8965A]/8 rounded-full blur-[80px]" />
          
          <div className="relative z-10 text-center px-16 max-w-md">
            {/* Monogram */}
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-[#B8965A]/20">
              <span className="text-3xl font-light text-[#B8965A] font-[family-name:var(--font-display)]">S</span>
            </div>
            <h2 className="text-[#E8E4DD]/80 text-lg font-light tracking-[0.3em] uppercase font-[family-name:var(--font-display)]">
              Est. 2020
            </h2>
            <div className="mt-6 mx-auto w-16 h-px bg-[#B8965A]/30" />
            <p className="mt-6 text-[#E8E4DD]/40 text-sm leading-relaxed tracking-wide">
              Dave · Amanda · Soren · Rigs
            </p>
          </div>
        </div>

        {/* Right: Login form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-[#FDFCFA] to-[#F5F0E8] lg:bg-[#FDFCFA] lg:bg-none relative min-h-screen lg:min-h-0">
          {/* Mobile gradient overlay */}
          <div className="absolute inset-0 lg:hidden" style={{
            background: 'radial-gradient(ellipse at top, rgba(184,150,90,0.06) 0%, transparent 60%)'
          }} />
          
          <div className="relative w-full max-w-sm space-y-10">
            {/* Header */}
            <div className="text-center space-y-5">
              {/* Monogram (mobile only — desktop has it on the left) */}
              <div className="lg:hidden mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#B8965A]/25">
                <span className="text-2xl font-light text-[#B8965A] font-[family-name:var(--font-display)]">S</span>
              </div>
              
              <div>
                <h1 className="text-[32px] md:text-[40px] font-light text-[#2C2C2C] font-[family-name:var(--font-display)] leading-tight tracking-wide">
                  The Sweeney Family
                </h1>
                <div className="mt-4 mx-auto w-12 h-px bg-[#B8965A]/50" />
                <p className="mt-3 text-sm text-[#8A7E72] tracking-[0.15em] uppercase">
                  Private Residence
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  autoComplete="current-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="w-full border-0 border-b border-[#D4CFC6] bg-transparent px-1 py-4 text-lg text-[#2C2C2C] placeholder-[#B8B0A4] focus:outline-none focus:border-[#B8965A] transition-colors pr-12 tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#B8B0A4] hover:text-[#2C2C2C] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>

              {error && (
                <p className="flex items-center gap-2 text-sm text-red-500/80">
                  <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#B8965A] hover:bg-[#A6854F] active:bg-[#947545] text-white rounded-lg px-6 py-4 text-base font-medium tracking-wider transition-all disabled:opacity-40 shadow-sm hover:shadow-md"
              >
                {loading ? 'Unlocking\u2026' : 'Enter'}
              </button>
            </form>

            <p className="text-center text-xs text-[#B8B0A4] tracking-[0.2em] uppercase">
              Authorized access only
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Work mode login (keep existing dark theme)
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#060606]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B8956A]/10 border border-[#B8956A]/20 shadow-xl">
            <span className="text-xl font-semibold text-[#B8956A] font-[family-name:var(--font-syne)]">MC</span>
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
            {loading ? 'Unlocking\u2026' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs tracking-wider uppercase text-[#6B6560]">
          Authorized access only
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
