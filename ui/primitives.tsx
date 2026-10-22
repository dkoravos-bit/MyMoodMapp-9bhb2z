/**
 * Small, shared building blocks for the redesign. Everything takes its look from ui/tokens.
 */
import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle, StyleProp, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, R, S, T } from './tokens';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

type TxtProps = { children: React.ReactNode; style?: StyleProp<TextStyle>; color?: string; numberOfLines?: number; accessibilityRole?: any };
const mk = (base: TextStyle) => ({ children, style, color, numberOfLines, accessibilityRole }: TxtProps) => (
  <Text accessibilityRole={accessibilityRole} numberOfLines={numberOfLines} style={[base, { color: color ?? C.ink }, style]}>{children}</Text>
);
export const Hero = mk(T.hero);
export const H1 = mk(T.h1);
export const H2 = mk(T.h2);
export const H3 = mk(T.h3);
export const Body = mk(T.body);
export const BodySemi = mk(T.bodySemi);
export const Small = mk(T.small);
export const SmallSemi = mk(T.smallSemi);
export const Tiny = mk(T.tiny);
export function Eyebrow({ children, color, style }: TxtProps) {
  return <Text style={[T.eyebrow, { color: color ?? C.muted, textTransform: 'uppercase' }, style]}>{children}</Text>;
}

/** Full-screen page with the night ground and safe-area top padding. */
export function Screen({ children, scroll = true, padTop = true, style, contentStyle }: {
  children: React.ReactNode; scroll?: boolean; padTop?: boolean; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: padTop ? insets.top + S.lg : 0, paddingHorizontal: S.xl, paddingBottom: 120, gap: S.lg };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: C.bg }, style]}><View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View></View>;
  return (
    <ScrollView style={[{ flex: 1, backgroundColor: C.bg }, style]} contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, tone = 'surface' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'raised' | 'outline' }) {
  return (
    <View style={[
      { borderRadius: R.lg, padding: S.lg, gap: S.sm },
      tone === 'surface' && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
      tone === 'raised' && { backgroundColor: C.surface2 },
      tone === 'outline' && { borderWidth: 1, borderColor: C.lineStrong },
      style,
    ]}>{children}</View>
  );
}

export function Button({ label, onPress, kind = 'primary', disabled, loading, style, icon, accessibilityLabel }: {
  label: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'accent' | 'quiet'; disabled?: boolean; loading?: boolean;
  style?: StyleProp<ViewStyle>; icon?: React.ReactNode; accessibilityLabel?: string;
}) {
  const bg = kind === 'primary' ? C.ink : kind === 'accent' ? C.mind : 'transparent';
  const fg = kind === 'primary' || kind === 'accent' ? C.bg : kind === 'quiet' ? C.muted : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{
        height: 54, borderRadius: R.lg, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: S.sm, paddingHorizontal: S.xl,
        borderWidth: kind === 'ghost' ? 1 : 0, borderColor: C.lineStrong,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <>
        {icon}
        <Text style={[T.h3, { color: fg, fontSize: 16 }]}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style }: { label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{
        minHeight: 38, paddingHorizontal: 14, borderRadius: R.pill, justifyContent: 'center',
        backgroundColor: on ? C.ink : 'transparent', borderWidth: 1, borderColor: on ? C.ink : C.lineStrong,
        opacity: pressed ? 0.8 : 1,
      }, style]}
    >
      <Text style={[T.smallSemi, { color: on ? C.bg : C.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ onPress, children, label, style }: { onPress?: () => void; children: React.ReactNode; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      onPress={() => { tap(); onPress?.(); }}
      hitSlop={6}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.scrim, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }, style]}
    >{children}</Pressable>
  );
}

export function Row({ children, style, gap = S.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} />;
}

/** Diverging effect bar used by Drivers. value in points, max = scale end. */
export function EffectBar({ value, max = 15, faint }: { value: number; max?: number; faint?: boolean }) {
  const w = Math.min(50, (Math.abs(value) / max) * 50);
  const pos = value >= 0;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ position: 'absolute', left: '50%', top: -3, width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <View style={{
        position: 'absolute', top: 0, bottom: 0, width: `${w}%`, borderRadius: 4,
        backgroundColor: pos ? C.mind : C.energy, opacity: faint ? 0.45 : 1,
        ...(pos ? { left: '50%' } : { right: '50%' }),
      }} />
    </View>
  );
}
