import { useEffect, useState } from 'react';

const LANDSCAPE_QUERY =
  '(orientation: landscape) and (max-height: 500px), (min-aspect-ratio: 4/3) and (min-width: 640px)';

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() =>
    window.matchMedia(LANDSCAPE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(LANDSCAPE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isLandscape;
}
