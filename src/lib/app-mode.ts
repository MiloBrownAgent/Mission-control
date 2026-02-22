"use client";

import { useState, useEffect } from "react";

export type AppMode = 'work' | 'family';

export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'work'; // SSR default
  return window.location.port === '3001' ? 'family' : 'work';
}

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>('work');
  useEffect(() => {
    setMode(getAppMode());
  }, []);
  return mode;
}
