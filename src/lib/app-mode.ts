'use client';

// mission-control is always work mode
export type AppMode = 'work';

export function getAppMode(): AppMode {
  return 'work';
}

export function useAppMode(): AppMode {
  return 'work';
}
