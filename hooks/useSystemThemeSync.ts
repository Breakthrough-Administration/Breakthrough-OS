'use client';

import { useEffect, useRef } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';

/**
 * useSystemThemeSync
 * Listens for system-level light/dark mode changes (prefers-color-scheme: dark)
 * and automatically syncs the Management OS theme setting via useManagementStore,
 * while updating the document's root classList for consistent Tailwind dark mode styling.
 */
export function useSystemThemeSync() {
  const { theme, setTheme } = useManagementStore();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Sync theme class to document root
    const syncRootClass = (currentTheme: 'light' | 'dark') => {
      const root = document.documentElement;
      if (currentTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    // On initial mount, sync root class with current store theme
    syncRootClass(theme);

    // Handler for system preferences change
    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newTheme: 'light' | 'dark' = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      syncRootClass(newTheme);
    };

    // If this is the initial mount and no theme was manually set in session,
    // ensure alignment with system preference if different
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const initialSystemTheme: 'light' | 'dark' = mediaQuery.matches ? 'dark' : 'light';
      if (theme !== initialSystemTheme) {
        setTheme(initialSystemTheme);
        syncRootClass(initialSystemTheme);
      }
    }

    // Attach event listener to media query
    try {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } catch {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [setTheme]);

  // Keep DOM class in sync whenever store theme changes (e.g. manual toggle)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  return { theme };
}
