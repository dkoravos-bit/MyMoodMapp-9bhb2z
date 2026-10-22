/**
 * The AI "style plate" under the living art. One request per layer per period,
 * and only when the trait bucket changes — the server also caches by the same key.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArtLayer, Traits, cacheKey } from '@/supabase/functions/_shared/moodArtSpec';
import { callEdge } from './edge';

const mem = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export async function getPlate(userId: string, layer: ArtLayer, period: string, traits: Traits): Promise<string | null> {
  const key = cacheKey(userId, layer, traits, period);
  if (mem.has(key)) return mem.get(key)!;
  try {
    const stored = await AsyncStorage.getItem(`plate:${key}`);
    if (stored) { mem.set(key, stored); return stored; }
  } catch {}
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    try {
      const res = await callEdge<{ artUrl?: string }>('generate-mood-art', { layer, period, traits }, 120000);
      if (res?.artUrl) {
        mem.set(key, res.artUrl);
        AsyncStorage.setItem(`plate:${key}`, res.artUrl).catch(() => {});
        return res.artUrl;
      }
    } catch (e) {
      console.log('[plate] generation unavailable:', (e as Error)?.message);
    }
    return null;
  })();
  inflight.set(key, p);
  try { return await p; } finally { inflight.delete(key); }
}

export const periodFor = (layer: ArtLayer, d = new Date()) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  if (layer === 'month') return `${y}-${m}`;
  if (layer === 'week') {
    const t = new Date(Date.UTC(y, d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
  }
  return `${y}-${m}-${day}`;
};
