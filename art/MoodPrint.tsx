/**
 * Mood Print — deterministic neon fingerprint in the app-icon style.
 * One ridge per logged day this month (capped visually), drawn in code; never random.
 *  - ridge colour: amber crown → teal → violet → coral core (the brand ramp)
 *  - warmth: average score brightens the crown
 *  - symmetry: volatility tilts the arcs
 *  - weight: energy sets stroke width
 */
import React from 'react';
import { useUid } from '@/ui/uid';
import Svg, { Path, Defs, Filter, FeGaussianBlur, G } from 'react-native-svg';
import { Platform } from 'react-native';
import { mixHex } from '@/supabase/functions/_shared/moodArtSpec';

const RAMP = ['#F5B54A', '#F8CB7A', '#3DD6C6', '#5FE0D2', '#A88BFF', '#C4B0FF', '#FF8A70', '#FFB09C'];

export function MoodPrint({ ridges, avg, volatility, energy, size = 300 }: {
  ridges: number; avg: number; volatility: 'still' | 'breeze' | 'wind'; energy: number; size?: number;
}) {
  const U = useUid('mp');
  const n = Math.max(3, Math.min(14, ridges));
  const W = 320, H = 300, cx = 160, base = 268;
  const tilt = volatility === 'still' ? 0 : volatility === 'breeze' ? 6 : 14;
  const sw = 4 + energy * 3.5;
  const dim = avg < 50 ? 0.35 : avg < 65 ? 0.15 : 0;
  const arcs = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const rx = 150 - t * 142;
    const ry = 156 - t * 140;
    const skew = (i % 2 === 0 ? 1 : -1) * tilt * (1 - t);
    const x1 = cx - rx, x2 = cx + rx;
    const color = mixHex(RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))], '#07080F', dim);
    return { d: `M${x1} ${base - t * 10} A${rx} ${ry} ${skew} 0 1 ${x2} ${base - t * 10}`, color, w: sw - t * 1.6 };
  });
  const glow = Platform.OS !== 'android'; // feGaussianBlur support differs on Android; arcs stay crisp there
  return (
    <Svg width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={`Mood Print with ${ridges} ridges`}>
      <Defs>
        <Filter id={`${U}glow`} x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation="4" />
        </Filter>
      </Defs>
      {glow ? (
        <G filter={`url(#${U}glow)`} opacity={0.8}>
          {arcs.map((a, i) => <Path key={`g${i}`} d={a.d} stroke={a.color} strokeWidth={a.w + 3} fill="none" strokeLinecap="round" />)}
        </G>
      ) : null}
      {arcs.map((a, i) => <Path key={i} d={a.d} stroke={a.color} strokeWidth={a.w} fill="none" strokeLinecap="round" />)}
    </Svg>
  );
}
