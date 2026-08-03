"use client";

import { useEffect, useState } from 'react';

/** Same cutoff as the sidebar drawer (`lg:` breakpoint) and the onboarding tour. */
export const MY_ZONE_MOBILE_MAX_WIDTH_PX = 1023;

const MEDIA_QUERY = `(max-width: ${MY_ZONE_MOBILE_MAX_WIDTH_PX}px)`;

function readMatches(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MEDIA_QUERY).matches;
}

/**
 * Viewport gate for the My Zone phone shell. Workspace and desktop My Zone keep
 * the classic sidebar layout, so this must stay read-only and side-effect free.
 */
export function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(readMatches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);
    const sync = () => setIsNarrow(mediaQueryList.matches);
    sync();
    mediaQueryList.addEventListener('change', sync);
    return () => mediaQueryList.removeEventListener('change', sync);
  }, []);

  return isNarrow;
}
