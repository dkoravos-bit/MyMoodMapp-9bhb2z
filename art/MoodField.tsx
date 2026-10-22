/**
 * MoodField — the living art.
 *
 * Layer 1: AI style plate (optional, crossfades in when ready)
 * Layer 2: procedural field — sky gradient, drifting light, sun (daylight), stars (sleep),
 *          paths (steps + workouts), tide (ups and downs), halo / mist (HRV vs your usual)
 * Layer 3: the four-lobe compass "blob" that breathes at the user's energy tempo
 *
 * Built on react-native-svg + Reanimated (both already native in the app),
 * so it runs the same on iOS, Android and web. Honors Reduce Motion.
 */
import React, { useEffect, useMemo } from 'react';
import { useUid } from '@/ui/uid';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion, withSequence,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse, Path, Rect, LinearGradient } from 'react-native-svg';
import { Image } from 'expo-image';
import type { Palette, Traits } from '@/supabase/functions/_shared/moodArtSpec';
import { BRAND, mixHex } from '@/supabase/functions/_shared/moodArtSpec';

export interface FieldDims { mind: number; energy: number; body: number; focus: number }

function seeded(n: number) {
  let s = n || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function MoodField({
  palette, traits, dims, plateUrl, height = 420, width = 390, compassSize = 240, showCompass = true,
  style, children, accessibilityLabel, seed = 7,
}: {
  palette: Palette; traits: Traits; dims: FieldDims; plateUrl?: string | null;
  height?: number; width?: number; compassSize?: number; showCompass?: boolean;
  style?: StyleProp<ViewStyle>; children?: React.ReactNode; accessibilityLabel?: string; seed?: number;
}) {
  const reduce = useReducedMotion();
  const U = useUid('mf');
  const drift = useSharedValue(0);
  const breathe = useSharedValue(0);
  const tide = useSharedValue(0);

  // Energy sets the tempo (calm 7s → lively 3.6s). Air sets tide speed. Never strobes.
  const breathMs = Math.round(7000 - dims.energy * 3400);
  const tideMs = traits.air === 'still' ? 16000 : traits.air === 'breeze' ? 10000 : 7000;

  useEffect(() => {
    if (reduce) { drift.value = 0; breathe.value = 0; tide.value = 0; return; }
    drift.value = withRepeat(withTiming(1, { duration: 22000, easing: Easing.inOut(Easing.sin) }), -1, true);
    breathe.value = withRepeat(withTiming(1, { duration: breathMs, easing: Easing.inOut(Easing.sin) }), -1, true);
    tide.value = withRepeat(withSequence(withTiming(1, { duration: tideMs, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: tideMs, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [reduce, breathMs, tideMs]);

  const driftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -14 * drift.value }, { translateY: 10 * drift.value }] as any }));
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * breathe.value }] }));
  const tideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -40 * tide.value }] }));

  const stars = useMemo(() => {
    const r = seeded(seed * 31 + traits.stars);
    // Unknown sleep = a few faint neutral stars (never drawn as "bad sleep").
    const n = traits.sleepKnown === false ? 6 : [3, 10, 22, 40][traits.stars];
    const dim = traits.sleepKnown === false ? 0.45 : 1;
    return Array.from({ length: n }, () => ({ x: r() * width, y: r() * height * 0.45, s: 0.6 + r() * 1.3, o: (0.35 + r() * 0.55) * dim }));
  }, [seed, traits.stars, traits.sleepKnown, width, height]);

  // Paths = steps + workouts: thin glowing trails winding from the shore toward the horizon.
  const trails = useMemo(() => {
    const r = seeded(seed * 53 + traits.trails);
    return Array.from({ length: traits.trails ?? 0 }, (_, i) => {
      const x0 = width * (0.12 + r() * 0.76), y0 = height * 0.98;
      const x1 = width * (0.3 + r() * 0.4), y1 = height * (0.7 - i * 0.015);
      const cx = x0 + (r() - 0.5) * width * 0.6, cy = height * (0.84 + r() * 0.06);
      return `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`;
    });
  }, [seed, traits.trails, width, height]);
  const sunLevel = traits.sun ?? null;
  const sunColor = mixHex(palette.horizon, '#FFD27A', 0.55);

  // Compass lobes: distance and size from each dimension. Overlapping soft-edged
  // gradients read as one gooey shape without SVG filters (which differ across platforms).
  // The lobes' soft edges reach past the compass box, so draw on a larger canvas (no clipping = no square edges).
  const pad = compassSize * 0.35;
  const c = compassSize / 2 + pad;
  const cr = compassSize / 2;
  const reach = (v: number) => cr * (0.22 + v * 0.44);
  const rad = (v: number) => cr * (0.2 + v * 0.22);
  const lobes = [
    { key: 'mind', x: c, y: c - reach(dims.mind), r: rad(dims.mind), color: BRAND.mind },
    { key: 'energy', x: c + reach(dims.energy), y: c, r: rad(dims.energy), color: BRAND.energy },
    { key: 'body', x: c, y: c + reach(dims.body), r: rad(dims.body), color: BRAND.body },
    { key: 'focus', x: c - reach(dims.focus), y: c, r: rad(dims.focus), color: BRAND.focus },
  ];

  const waveY = height * 0.72;
  const amp = traits.air === 'still' ? 4 : traits.air === 'breeze' ? 9 : 16;
  const wave = (y: number, a: number, w: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= w + 80; x += 40) d += ` Q ${x + 20} ${y + ((x / 40) % 2 === 0 ? -a : a)} ${x + 40} ${y}`;
    return d + ` L ${w + 80} ${height} L 0 ${height} Z`;
  };

  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', backgroundColor: palette.deep }, style]}
      accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {/* Sky */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${U}sky`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.deep} />
            <Stop offset="0.55" stopColor={palette.base} />
            <Stop offset="0.78" stopColor={palette.horizon} />
            <Stop offset="1" stopColor={BRAND.night} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${U}sky)`} />
      </Svg>

      {/* AI style plate */}
      {plateUrl ? (
        <Image source={{ uri: plateUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.88 }]} contentFit="cover" transition={900} />
      ) : null}

      {/* Drifting light */}
      <Animated.View style={[{ position: 'absolute', left: -40, top: -40, right: -40, bottom: -40 }, driftStyle]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`${U}l1`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={palette.light} stopOpacity="0.55" /><Stop offset="1" stopColor={palette.light} stopOpacity="0" /></RadialGradient>
            <RadialGradient id={`${U}l2`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={palette.accent} stopOpacity="0.45" /><Stop offset="1" stopColor={palette.accent} stopOpacity="0" /></RadialGradient>
          </Defs>
          <Circle cx={width * 0.28} cy={height * 0.26} r={width * 0.42} fill={`url(#${U}l2)`} />
          <Circle cx={width * 0.62} cy={height * 0.4} r={width * 0.32} fill={`url(#${U}l1)`} />
        </Svg>
      </Animated.View>

      {/* Sun = time in daylight (only when known) */}
      {sunLevel != null ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id={`${U}sun`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF4D6" stopOpacity={0.35 + sunLevel * 0.2} />
              <Stop offset="0.25" stopColor={sunColor} stopOpacity={0.25 + sunLevel * 0.15} />
              <Stop offset="1" stopColor={sunColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width * 0.74} cy={height * (0.66 - sunLevel * 0.06)} r={width * (0.16 + sunLevel * 0.1)} fill={`url(#${U}sun)`} />
          {sunLevel >= 2 ? <Ellipse cx={width * 0.74} cy={height * 0.735} rx={width * (0.12 + sunLevel * 0.04)} ry={height * 0.014} fill={`url(#${U}sun)`} opacity={0.9} /> : null}
        </Svg>
      ) : null}

      {/* Stars = sleep */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.s} fill={BRAND.ink} opacity={s.o} />)}
      </Svg>

      {/* Tide = ups and downs (wind, never lightning) */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: -80, top: 0, bottom: 0 }, tideStyle]} pointerEvents="none">
        <Svg width={width + 80} height={height}>
          <Path d={wave(waveY, amp, width)} fill="rgba(7,8,15,0.35)" />
          <Path d={wave(waveY + 26, amp * 0.6, width)} fill="rgba(7,8,15,0.45)" />
        </Svg>
      </Animated.View>

      {/* Paths = steps + workouts */}
      {trails.length ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          {trails.map((d, i) => <Path key={i} d={d} stroke={palette.light} strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="1 5" fill="none" />)}
        </Svg>
      ) : null}

      {/* Low mist = HRV below your usual (recovering) */}
      {traits.recovery === 'low' ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <LinearGradient id={`${U}mist`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.light} stopOpacity="0" />
              <Stop offset="0.5" stopColor={palette.light} stopOpacity="0.22" />
              <Stop offset="1" stopColor={palette.light} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y={height * 0.6} width="100%" height={height * 0.2} fill={`url(#${U}mist)`} />
        </Svg>
      ) : null}

      {/* Compass blob */}
      {showCompass ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: height * 0.1 }]} pointerEvents="none">
          <Animated.View style={[{ width: compassSize, height: compassSize }, breatheStyle]}>
            <Svg width={compassSize + pad * 2} height={compassSize + pad * 2} style={{ position: 'absolute', left: -pad, top: -pad }}>
              <Defs>
                {lobes.map(l => (
                  <RadialGradient key={l.key} id={`${U}g-${l.key}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={l.color} stopOpacity="1" />
                    <Stop offset="0.55" stopColor={l.color} stopOpacity="0.85" />
                    <Stop offset="1" stopColor={l.color} stopOpacity="0" />
                  </RadialGradient>
                ))}
                <RadialGradient id={`${U}core`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <Stop offset="0.5" stopColor={palette.light} stopOpacity="0.8" />
                  <Stop offset="1" stopColor={palette.light} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              {/* Soft halo = HRV above your usual (well rested) */}
              {traits.recovery === 'high' ? <Circle cx={c} cy={c} r={cr * 0.98} fill="none" stroke={palette.light} strokeOpacity={0.35} strokeWidth={2} /> : null}
              {lobes.map(l => <Circle key={l.key} cx={l.x} cy={l.y} r={l.r * 1.35} fill={`url(#${U}g-${l.key})`} />)}
              <Circle cx={c} cy={c} r={cr * 0.5} fill={`url(#${U}core)`} />
            </Svg>
          </Animated.View>
        </View>
      ) : null}

      {/* Bottom fade for legible overlays */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={`${U}fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BRAND.night} stopOpacity="0.35" />
            <Stop offset="0.22" stopColor={BRAND.night} stopOpacity="0" />
            <Stop offset="0.6" stopColor={BRAND.night} stopOpacity="0" />
            <Stop offset="1" stopColor={BRAND.night} stopOpacity="0.92" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${U}fade)`} />
      </Svg>

      {children}
    </View>
  );
}
