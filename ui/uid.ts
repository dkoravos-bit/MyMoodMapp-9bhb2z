import { useRef } from 'react';
let n = 0;
/** Stable, per-instance id prefix for SVG defs (web shares one id namespace per document). */
export function useUid(prefix = 'u') {
  const r = useRef<string | null>(null);
  if (!r.current) r.current = `${prefix}${++n}`;
  return r.current;
}
