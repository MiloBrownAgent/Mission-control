'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConvex = error.message?.includes('CONVEX') || error.message?.includes('Server Error');

  useEffect(() => {
    if (isConvex) {
      // Auto-retry after 5 seconds for Convex errors
      const timer = setTimeout(() => reset(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, reset, isConvex]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C4533A]/10 border border-[#C4533A]/20">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-light text-[#E8E4DF]">
          {isConvex ? 'Database Temporarily Unavailable' : 'Something went wrong'}
        </h2>
        <p className="text-sm text-[#6B6560]">
          {isConvex 
            ? 'The database is being restored. This page will automatically retry in a few seconds.'
            : error.message || 'An unexpected error occurred.'
          }
        </p>
        <button
          onClick={reset}
          className="mx-auto rounded-lg bg-[#B8956A] px-6 py-2.5 text-sm font-medium text-[#060606] transition-colors hover:bg-[#CDAA7E]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
