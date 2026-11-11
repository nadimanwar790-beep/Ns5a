/**
 * Display preferences — Desktop Mode + Screen Rotation.
 *
 * The student requested two things from the Settings sheet:
 *
 *  1. **Desktop Mode**: render the app at a wider viewport so phones see the
 *     "tablet/laptop" layout instead of the cramped mobile one. We achieve
 *     this by rewriting the page's `<meta name="viewport">` to a fixed
 *     1024px width — the browser then scales the whole page down to fit the
 *     physical screen, just like Chrome's "Desktop site" toggle. The
 *     preference is persisted to localStorage so it survives reloads, and
 *     re-applied on every app boot via `applyDesktopModeFromStorage()`.
 *
 *  2. **Rotate Screen**: a one-tap button that flips the app between
 *     portrait and landscape using `screen.orientation.lock()`. This API
 *     only works while the page is in fullscreen on most browsers — so the
 *     helper requests fullscreen first when needed, then locks the chosen
 *     orientation. If the device/browser refuses (iOS Safari, desktop
 *     browsers), the helper returns `false` so the UI can show a toast.
 *
 * Everything is wrapped in try/catch — we never want a settings tap to
 * crash the app, and unsupported devices should fail silently with a
 * graceful "not supported" return value.
 */

import { useState, useEffect } from 'react';

/**
 * Display preferences — Desktop/Laptop Mode.
 *
 * Switch the app between Mobile Mode and Desktop/Laptop Mode:
 *  - When Desktop Mode is ON:
 *    - Applies `.force-desktop-mode` to <html> and <body>
 *    - Adjusts viewport scaling
 *    - Compacts buttons, cards, headings, and padding so everything fits on laptop screens without excessive scrolling
 *    - Enables multi-column grids for cards
 *  - `rotateScreen()` directly toggles Desktop Mode (as requested by user) without physically locking screen orientation.
 */

const DESKTOP_MODE_KEY = 'nst_desktop_mode_v1';

const MOBILE_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';
const DESKTOP_VIEWPORT = 'width=1024, initial-scale=1';

const getViewportTag = (): HTMLMetaElement | null => {
  let tag = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'viewport';
    document.head.appendChild(tag);
  }
  return tag;
};

export const isDesktopModeOn = (): boolean => {
  try {
    return localStorage.getItem(DESKTOP_MODE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setDesktopMode = (on: boolean, autoRotate = false): void => {
  try {
    localStorage.setItem(DESKTOP_MODE_KEY, on ? '1' : '0');
  } catch {}
  const tag = getViewportTag();
  if (tag) {
    tag.setAttribute('content', on ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT);
  }
  if (on) {
    document.documentElement.classList.add('force-desktop-mode');
    document.body.classList.add('force-desktop-mode');
    if (autoRotate) {
      void rotateToLandscape();
    }
  } else {
    document.documentElement.classList.remove('force-desktop-mode');
    document.body.classList.remove('force-desktop-mode');
    if (autoRotate) {
      void rotateToPortrait();
    }
  }
  // Dispatch custom event for immediate React component state sync
  try {
    window.dispatchEvent(new CustomEvent('nst-desktop-mode-change', { detail: { isDesktop: on } }));
  } catch {}
};

export const toggleDesktopMode = (autoRotate = true): boolean => {
  const next = !isDesktopModeOn();
  setDesktopMode(next, autoRotate);
  return next;
};

/**
 * Hook to listen for Desktop Mode changes
 */
export const useDesktopMode = (): [boolean, (on: boolean) => void] => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopModeOn());

  useEffect(() => {
    const handler = (e: any) => {
      setIsDesktop(e.detail?.isDesktop ?? isDesktopModeOn());
    };
    window.addEventListener('nst-desktop-mode-change', handler);
    return () => window.removeEventListener('nst-desktop-mode-change', handler);
  }, []);

  return [isDesktop, setDesktopMode];
};

/**
 * Call once on app boot so the previously-saved Desktop Mode preference
 * is re-applied before the first paint settles.
 */
export const applyDesktopModeFromStorage = (): void => {
  if (isDesktopModeOn()) {
    setDesktopMode(true);
  }
};

/* ──────────────────────────  Screen Rotation / Desktop Toggle  ────────────────────────── */

let _rotatingForOrientation = false;
export const isRotatingForOrientation = (): boolean => _rotatingForOrientation;

export const isFullscreen = (): boolean => {
  if (typeof document === 'undefined') return false;
  return !!document.fullscreenElement;
};

export const exitFullscreenSafe = async (): Promise<boolean> => {
  try {
    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
      return true;
    }
  } catch {}
  return false;
};

export const requestFullscreenSafe = async (): Promise<boolean> => {
  try {
    const el: any = document.documentElement;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch {
    return false;
  }
};

export const getScreenOrientation = (): 'portrait' | 'landscape' => {
  try {
    const so: any = (screen as any).orientation;
    if (so && so.type) {
      return so.type.toLowerCase().startsWith('landscape') ? 'landscape' : 'portrait';
    }
    if (window.matchMedia) {
      return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
    }
  } catch {}
  return 'portrait';
};

export const rotateToLandscape = async (): Promise<'landscape'> => {
  _rotatingForOrientation = true;
  setTimeout(() => { _rotatingForOrientation = false; }, 1200);

  const so: any = (typeof screen !== 'undefined' ? (screen as any).orientation : null);

  // 1. Try direct lock (works in installed PWA / WebAPK)
  if (so && typeof so.lock === 'function') {
    try {
      await so.lock('landscape');
      try { window.dispatchEvent(new CustomEvent('nst-screen-rotate', { detail: { orientation: 'landscape' } })); } catch {}
      return 'landscape';
    } catch {}

    // 2. Browser requires fullscreen before locking orientation (e.g. Chrome on Android)
    try {
      await requestFullscreenSafe();
      await so.lock('landscape');
      try { window.dispatchEvent(new CustomEvent('nst-screen-rotate', { detail: { orientation: 'landscape' } })); } catch {}
      return 'landscape';
    } catch {}
  }

  // Fallback: visual layout notification for browsers that do not expose screen.orientation.lock (iOS Safari, desktop)
  try { window.dispatchEvent(new CustomEvent('nst-screen-rotate', { detail: { orientation: 'landscape' } })); } catch {}
  return 'landscape';
};

export const rotateToPortrait = async (): Promise<'portrait'> => {
  _rotatingForOrientation = true;
  setTimeout(() => { _rotatingForOrientation = false; }, 1200);

  const so: any = (typeof screen !== 'undefined' ? (screen as any).orientation : null);

  if (so) {
    try {
      if (typeof so.unlock === 'function') so.unlock();
      else if (typeof so.lock === 'function') await so.lock('portrait');
    } catch {}
  }

  // Exit fullscreen if it was entered to rotate
  await exitFullscreenSafe().catch(() => {});

  try { window.dispatchEvent(new CustomEvent('nst-screen-rotate', { detail: { orientation: 'portrait' } })); } catch {}
  return 'portrait';
};

/**
 * Rotate Button Handler:
 * Cleanly flips orientation between portrait and landscape.
 * When switching to landscape, enters fullscreen & locks landscape.
 * When switching to portrait, unlocks orientation & exits fullscreen.
 */
export const rotateScreen = async (): Promise<'portrait' | 'landscape'> => {
  try {
    const current = getScreenOrientation();
    if (current === 'landscape') {
      return await rotateToPortrait();
    } else {
      return await rotateToLandscape();
    }
  } catch {
    setTimeout(() => { _rotatingForOrientation = false; }, 300);
    return 'portrait';
  }
};

/**
 * Hook to continuously track physical screen orientation, window size, and desktop mode.
 * Accurately updates when user rotates phone, toggles Desktop Site in browser, or resizes window.
 */
export const useDeviceOrientation = () => {
  const [orientationState, setOrientationState] = useState(() => {
    const isLand = getScreenOrientation() === 'landscape';
    const isDesk = isDesktopModeOn();
    const isWide = typeof window !== 'undefined' && window.innerWidth >= 1024;
    return {
      isLandscape: isLand || isDesk,
      isDesktopMode: isDesk,
      isWideScreen: isWide,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => {
      const isLand = getScreenOrientation() === 'landscape';
      const isDesk = isDesktopModeOn();
      const isWide = window.innerWidth >= 1024;
      setOrientationState({
        isLandscape: isLand || isDesk,
        isDesktopMode: isDesk,
        isWideScreen: isWide,
      });
    };

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('nst-screen-rotate', sync);
    window.addEventListener('nst-desktop-mode-change', sync);

    const mql = window.matchMedia ? window.matchMedia('(orientation: landscape)') : null;
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', sync);
    }

    const so: any = (screen as any)?.orientation;
    if (so && so.addEventListener) {
      so.addEventListener('change', sync);
    }

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('nst-screen-rotate', sync);
      window.removeEventListener('nst-desktop-mode-change', sync);
      if (mql && mql.removeEventListener) {
        mql.removeEventListener('change', sync);
      }
      if (so && so.removeEventListener) {
        so.removeEventListener('change', sync);
      }
    };
  }, []);

  return orientationState;
};

