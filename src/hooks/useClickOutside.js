import { useEffect } from 'react';

export function useClickOutside(ref, handler) {
  useEffect(() => {
    if (!handler) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler(e);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, handler]);
}
