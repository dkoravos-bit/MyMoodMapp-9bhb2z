/** Crisp four-axis compass — the exact data glyph (Mind top, Energy right, Body bottom, Focus left). */
import React from 'react';
import { useUid } from '@/ui/uid';
import Svg, { Circle, Path, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import { C } from '@/ui/tokens';

export function Compass({ mind, energy, body, focus, size = 200, rings = true, label }: {
  mind: number; energy: number; body: number; focus: number; size?: number; rings?: boolean; label?: string;
}) {
  const U = useUid('cp');
  const c = 100; const r = 80;
  const p = (v: number) => Math.max(0.04, Math.min(1, v)) * r;
  const pts = `${c},${c - p(mind)} ${c + p(energy)},${c} ${c},${c + p(body)} ${c - p(focus)},${c}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel={label ?? `Mind ${Math.round(mind * 100)}, Energy ${Math.round(energy * 100)}, Body ${Math.round(body * 100)}, Focus ${Math.round(focus * 100)}`}>
      <Defs>
        <LinearGradient id={`${U}cg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.mind} stopOpacity="0.6" />
          <Stop offset="1" stopColor={C.focus} stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      {rings ? <>
        <Circle cx={c} cy={c} r={80} fill="none" stroke="rgba(255,255,255,0.18)" />
        <Circle cx={c} cy={c} r={53} fill="none" stroke="rgba(255,255,255,0.10)" />
        <Circle cx={c} cy={c} r={27} fill="none" stroke="rgba(255,255,255,0.08)" />
        <Path d="M100 20V180M20 100H180" stroke="rgba(255,255,255,0.10)" />
      </> : null}
      <Polygon points={pts} fill={`url(#${U}cg)`} stroke={C.ink} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx={c} cy={c - p(mind)} r={5} fill={C.mind} />
      <Circle cx={c + p(energy)} cy={c} r={5} fill={C.energy} />
      <Circle cx={c} cy={c + p(body)} r={5} fill={C.body} />
      <Circle cx={c - p(focus)} cy={c} r={5} fill={C.focus} />
    </Svg>
  );
}
