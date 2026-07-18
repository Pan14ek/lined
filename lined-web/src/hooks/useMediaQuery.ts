import { useEffect, useState } from 'react';

/**
 * Tracks whether a CSS media query currently matches, re-rendering on change.
 * Used for the rare cases where a layout decision has to happen in JS (e.g.
 * driving Zustand state), not just via Tailwind responsive classes.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};
