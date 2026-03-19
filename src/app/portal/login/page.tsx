'use client';

import { useState } from 'react';
import { Camera, ShieldAlert } from 'lucide-react';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = '/portal/files';
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#060606]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / wordmark */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B8956A]/10 border border-[#B8956A]/20 shadow-xl">
            <Camera className="h-7 w-7 text-[#B8956A]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide text-[#E8E4DF]">
              Look &amp; Seen
            </h1>
            <p className="text-sm mt-1.5 tracking-wide text-[#6B6560]">
              Client Portal
            </p>
          </div>
        </div>

        <div className="mx-auto w-12 h-px bg-[#B8956A]/30" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoFocus
            autoComplete="email"
            className="w-full rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-4 py-4 text-base text-[#E8E4DF] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:border-[#B8956A]/40 focus:ring-[#B8956A]/20 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-4 py-4 text-base text-[#E8E4DF] placeholder-[#6B6560] focus:outline-none focus:ring-2 focus:border-[#B8956A]/40 focus:ring-[#B8956A]/20 transition-colors"
          />

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-xl px-4 py-4 text-base font-medium tracking-wide transition-all disabled:opacity-50 bg-[#B8956A] hover:bg-[#CDAA7E] active:bg-[#B8956A] text-[#060606]"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-12 text-center text-xs tracking-wider uppercase text-[#3A3530]">
        Powered by Look &amp; Seen
      </p>
    </div>
  );
}
