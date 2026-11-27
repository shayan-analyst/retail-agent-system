'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

/** Viewport coordinates (px) the theme change should spread out from. */
export interface ThemeOrigin { x: number; y: number }

interface ThemeCtx {
  theme: Theme;
  toggle: (origin?: ThemeOrigin) => void;
  setTheme: (t: Theme, origin?: ThemeOrigin) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'theme';

/**
 * Inline script (rendered in <head> by app/layout.tsx) that applies the saved
 * theme before first paint, so there is no light-to-dark flash on reload.
 * Light is always the default; dark applies only if the user chose it.
 */
export const themeInitScript = `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('${STORAGE_KEY}')==='dark');}catch(e){}})();`;

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => ViewTransitionLike };

const REVEAL_MS = 850;
const REVEAL_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
let activeTransitions = 0;

/**
 * Switches the theme. Where the View Transitions API exists, the new theme is
 * revealed as a circle that grows from `origin` (the toggle button) until it
 * covers the whole screen while the old theme dims behind it. Without that API,
 * or with "reduce motion" on, the theme simply cross-fades.
 */
function applyTheme(t: Theme, origin: ThemeOrigin | undefined, commitState: () => void) {
  const root = document.documentElement;
  const swap = () => root.classList.toggle('dark', t === 'dark');

  const doc = document as DocWithVT;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || reduce || !origin) {
    root.classList.add('theme-fade');
    swap();
    commitState();
    window.setTimeout(() => root.classList.remove('theme-fade'), 350);
    return;
  }

  const { x, y } = origin;
  // Radius that reaches the farthest corner of the viewport from the origin.
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  activeTransitions += 1;
  root.classList.add('theme-switching');
  const done = () => {
    activeTransitions -= 1;
    if (activeTransitions <= 0) {
      activeTransitions = 0;
      root.classList.remove('theme-switching');
    }
  };

  try {
    const vt = doc.startViewTransition(() => {
      // The DOM (including the toggle icon) must be final before the "new"
      // snapshot is taken, hence flushSync.
      flushSync(() => {
        swap();
        commitState();
      });
    });

    vt.ready
      .then(() => {
        // New theme: a circle that grows from the toggle.
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: REVEAL_EASE, pseudoElement: '::view-transition-new(root)' },
        );
        // Old theme: dims and desaturates as it is swallowed, for depth.
        root.animate(
          { filter: ['brightness(1) saturate(1)', 'brightness(0.72) saturate(0.6)'] },
          { duration: REVEAL_MS, easing: REVEAL_EASE, fill: 'forwards', pseudoElement: '::view-transition-old(root)' },
        );
      })
      .catch(() => { /* transition was skipped — the theme is already applied */ });

    vt.finished.then(done, done);
  } catch {
    // Never leave the page half-switched.
    swap();
    commitState();
    done();
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Sync React state with whatever the init script already applied.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((t: Theme, origin?: ThemeOrigin) => {
    applyTheme(t, origin, () => setThemeState(t));
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, []);

  const toggle = useCallback((origin?: ThemeOrigin) => {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark', origin);
  }, [setTheme]);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
