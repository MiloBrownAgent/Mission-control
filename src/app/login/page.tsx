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
        ? 'bg-gradient-to-br from-rose-950 via-gray-950 to-gray-900'
        : 'bg-gradient-to-br from-blue-950 via-gray-950 to-gray-900'
    }`}>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl ${
            isFamilyMode ? 'bg-rose-600 shadow-rose-600/30' : 'bg-blue-600 shadow-blue-600/30'
          }`}>
            {isFamilyMode ? (
              <span className="text-3xl">🏠</span>
            ) : (
              <Lock className="h-8 w-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isFamilyMode ? 'Sweeney Home' : 'Mission Control'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
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
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 text-lg focus:border-white/30 focus:outline-none focus:ring-0 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
            className={`w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white transition-all disabled:opacity-50 ${
              isFamilyMode
                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
            }`}
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
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
