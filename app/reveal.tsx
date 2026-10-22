/**
 * The Reveal — the art takes in your log. On a heavy day it waits until you're
 * ready and lets you choose how it meets you (Mirror / Calm / Lift).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { C, R, S, T } from '@/ui/tokens';
import { Button, Chip, Eyebrow, IconButton, Row, Small, Body, tap } from '@/ui/primitives';
import { MoodField } from '@/art/MoodField';
import { useMoodArt, useTone } from '@/lib/useMoodArt';
import { forgivingStreak } from '@/lib/insight';
import type { Tone } from '@/supabase/functions/_shared/moodArtSpec';

const TONES: { id: Tone; label: string }[] = [{ id: 'mirror', label: 'Mirror me' }, { id: 'calm', label: 'Calm me' }, { id: 'lift', label: 'Lift me' }];

export default function Reveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { prev } = useLocalSearchParams<{ prev?: string }>();
  const { todayMoodLogEntries, moodLogEntries } = useApp();
  const art = useMoodArt('now', { fetchPlate: true });
  const { tone, setTone } = useTone();
  const score = todayMoodLogEntries.length ? Math.round(todayMoodLogEntries.reduce((s, e) => s + e.score, 0) / todayMoodLogEntries.length) : (art.input?.score ?? 50);
  const heavy = score < 40;
  const [revealed, setRevealed] = useState(!heavy);
  const streak = forgivingStreak(moodLogEntries).streak;

  useEffect(() => { if (revealed) tap('success'); }, [revealed]);

  const prevN = prev ? Number(prev) : null;
  const change = !art.traits ? '' : prevN == null
    ? 'Your first piece. It changes every time you log.'
    : score - prevN >= 6 ? 'Brighter than last time — the horizon warmed and the current picked up.'
      : score - prevN <= -6 ? (heavy ? 'Your sky turned to night — still, deep and yours. Nothing here is broken.' : 'Quieter than last time. The light softened and the tide slowed.')
        : 'Close to last time. Your field held its shape.';

  const dims = art.input ? { mind: art.input.mind, energy: art.input.energy, body: art.input.body, focus: art.input.focus } : { mind: 0.5, energy: 0.5, body: 0.5, focus: 0.5 };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {art.palette && art.traits ? (
        <Animated.View entering={FadeIn.duration(900)} style={{ flex: 1 }}>
          <MoodField palette={art.palette} traits={art.traits} dims={dims} plateUrl={revealed ? art.plateUrl : null}
            height={height} width={width} compassSize={Math.min(280, width * 0.7)} showCompass={revealed} accessibilityLabel={art.alt}>
            <View style={{ position: 'absolute', top: insets.top + S.md, left: S.xl, right: S.xl }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <IconButton label="Close" onPress={() => router.replace('/(tabs)')}>
                  <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={2} strokeLinecap="round" /></Svg>
                </IconButton>
                <Small color={C.inkSoft}>Logged · day {Math.max(1, streak)}</Small>
                <View style={{ width: 44 }} />
              </Row>
            </View>

            <View style={{ position: 'absolute', left: S.xl, right: S.xl, bottom: insets.bottom + S.xl, gap: S.md }}>
              {!revealed ? (
                <Animated.View entering={FadeInDown.duration(600)} style={{ gap: S.md }}>
                  <Text style={[T.h2, { color: C.ink }]}>That sounds like a heavy one. Your art is ready when you are.</Text>
                  <Small color={C.inkSoft}>How should it meet you today?</Small>
                  <Row>{TONES.map(t => <Chip key={t.id} label={t.label} on={tone === t.id} onPress={() => setTone(t.id)} style={{ flex: 1, alignItems: 'center' }} />)}</Row>
                  <Button label="Reveal my art" onPress={() => setRevealed(true)} />
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.delay(500).duration(900)} style={{ gap: S.sm }}>
                  <Eyebrow color={C.inkSoft}>Today you are</Eyebrow>
                  <Animated.Text entering={ZoomIn.delay(700).duration(700)} style={[T.hero, { color: C.ink, fontSize: 32, lineHeight: 36 }]}>{art.name}</Animated.Text>
                  <Body color={C.inkSoft}>{change}</Body>
                  {heavy ? (
                    <View style={{ backgroundColor: C.scrim, borderRadius: R.md, borderWidth: 1, borderColor: C.lineStrong, padding: S.md, gap: 6 }}>
                      <Body>What was going on around the time your energy dropped?</Body>
                      <Small color={C.muted}>If things feel like too much, you can call or text 988 in the US, any time.</Small>
                    </View>
                  ) : null}
                  <Row style={{ marginTop: S.sm }}>
                    <Button label="See my Mapp" onPress={() => router.replace('/(tabs)/mapp')} style={{ flex: 1 }} />
                    {heavy
                      ? <Button label="Say it" kind="ghost" onPress={() => router.replace('/voice')} style={{ flex: 1 }} />
                      : <Button label="Done" kind="ghost" onPress={() => router.replace('/(tabs)')} style={{ flex: 1 }} />}
                  </Row>
                </Animated.View>
              )}
            </View>
          </MoodField>
        </Animated.View>
      ) : null}
    </View>
  );
}
