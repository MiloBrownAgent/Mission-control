'use client';

import { useState, useEffect } from 'react';

export type AppMode = 'work' | 'family';

export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'work';
  const host = window.location.hostname;
  if (host === 'home.lookandseen.com' || host.includes('family')) return 'family';
  if (window.location.port === '3001') return 'family';
  return 'work';
}

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>('work');
  useEffect(() => {
    setMode(getAppMode());
  }, []);
  return mode;
}
