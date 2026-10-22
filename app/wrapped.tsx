/**
 * Mood Wrapped — a 9:16 share card. Art, name and archetype only by default;
 * numbers are an opt-in. Nothing is posted automatically.
 */
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Platform, useWindowDimensions, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useApp } from '@/hooks/useApp';
import { C, R, S, T } from '@/ui/tokens';
import { Button, Row, Small, SmallSemi, IconButton, Eyebrow, tap } from '@/ui/primitives';
import { MoodPrint } from '@/art/MoodPrint';
import { useMoodArt } from '@/lib/useMoodArt';
import { byDay, computeDrivers, SCALE_INDEX } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { useIsPro } from '@/ui/ProGate';
import { useUid } from '@/ui/uid';

export default function Wrapped() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { moodLogEntries } = useApp();
  const fitnessData = useRealFitness();
  const art = useMoodArt('month');
  const shot = useRef<ViewShot>(null);
  const [stats, setStats] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const days = useMemo(() => [...byDay(moodLogEntries).values()].filter(d => d.date.startsWith(monthKey)).sort((a, b) => a.date.localeCompare(b.date)), [moodLogEntries, monthKey]);
  const lifts = useMemo(() => computeDrivers(moodLogEntries, fitnessData).filter(d => d.effect > 0 && d.confidence !== 'Hunch').slice(0, 3), [moodLogEntries, fitnessData]);
  const best = days.reduce((m, d) => Math.max(m, d.avg), 0);
  const cardW = Math.min(width - 40, 360); const cardH = cardW * 16 / 9;
  const p = art.palette;
  const isPro = useIsPro();
  const U = useUid('wr');

  const share = async () => {
    tap();
    try {
      const uri = await shot.current?.capture?.();
      if (!uri) return;
      if (Platform.OS === 'web') { setMsg('Long-press or right-click the card to save it.'); return; }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Mood Wrapped' });
    } catch (e: any) { setMsg(e?.message ?? 'Could not share.'); }
  };
  const save = async () => {
    tap();
    try {
      const uri = await shot.current?.capture?.();
      if (!uri || Platform.OS === 'web') { setMsg('Saving to Photos works in the app.'); return; }
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { setMsg('Photos access is off — you can turn it on in Settings.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri); setMsg('Saved to Photos.');
    } catch (e: any) { setMsg(e?.message ?? 'Could not save.'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.md, paddingHorizontal: S.xl, gap: S.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Close" onPress={() => router.back()}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={2} strokeLinecap="round" /></Svg>
        </IconButton>
        <Small color={C.muted}>Your Mood Wrapped</Small>
        <View style={{ width: 44 }} />
      </Row>

      <View style={{ alignItems: 'center' }}>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
          <View style={{ width: cardW, height: cardH, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.bg, padding: S.xl, gap: S.lg }}>
            <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={cardW} height={cardH}>
              <Defs>
                <RadialGradient id={`${U}a`} cx="15%" cy="8%" r="45%"><Stop offset="0" stopColor={C.energy} stopOpacity="0.4" /><Stop offset="1" stopColor={C.energy} stopOpacity="0" /></RadialGradient>
                <RadialGradient id={`${U}b`} cx="95%" cy="45%" r="45%"><Stop offset="0" stopColor={p?.accent ?? C.focus} stopOpacity="0.4" /><Stop offset="1" stopColor={C.focus} stopOpacity="0" /></RadialGradient>
                <RadialGradient id={`${U}c`} cx="20%" cy="92%" r="45%"><Stop offset="0" stopColor={p?.base ?? C.mind} stopOpacity="0.55" /><Stop offset="1" stopColor={C.mind} stopOpacity="0" /></RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${U}a)`} /><Rect width="100%" height="100%" fill={`url(#${U}b)`} /><Rect width="100%" height="100%" fill={`url(#${U}c)`} />
            </Svg>
            <View style={{ gap: 6 }}>
              <Eyebrow color={C.energyInk}>My {now.toLocaleDateString(undefined, { month: 'long' })}, mapped</Eyebrow>
              <Text style={[T.hero, { color: C.ink, fontSize: 34, lineHeight: 38 }]}>{art.archetype?.name ?? 'My month'}.</Text>
              <Text style={[T.body, { color: C.inkSoft }]}>{art.archetype?.line}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {days.map(d => <View key={d.date} style={{ width: (cardW - 40 - 6 * 4) / 7, height: 22, borderRadius: 6, backgroundColor: C.scale[SCALE_INDEX(d.avg)] }} />)}
            </View>
            <View style={{ alignItems: 'center' }}>
              <MoodPrint ridges={days.length} avg={art.input?.score ?? 60} volatility={art.traits?.air ?? 'still'} energy={art.input?.energy ?? 0.5} size={cardW * 0.62} />
            </View>
            {stats ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <View><Text style={[T.h1, { color: C.ink }]}>{days.length}</Text><Small color={C.inkSoft}>days logged</Small></View>
                <View><Text style={[T.h1, { color: C.ink }]}>{art.input?.score ?? '—'}</Text><Small color={C.inkSoft}>average</Small></View>
                <View><Text style={[T.h1, { color: C.ink }]}>{best || '—'}</Text><Small color={C.inkSoft}>best day</Small></View>
              </Row>
            ) : null}
            {lifts.length ? (
              <View style={{ gap: 6 }}>
                <Eyebrow color={C.mindInk}>What lifted me</Eyebrow>
                {lifts.map(l => <Text key={l.key} style={[T.bodySemi, { color: C.ink }]}>{l.name}</Text>)}
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[T.h3, { color: C.ink }]}>MyMoodMapp</Text>
              <Small color={C.inkSoft}>your mood, painted</Small>
            </Row>
          </View>
        </ViewShot>
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <SmallSemi>Include my numbers</SmallSemi>
        <Switch value={stats} onValueChange={setStats} trackColor={{ true: C.mind, false: C.surface2 }} accessibilityLabel="Include my numbers" />
      </Row>
      {!isPro ? <Small color={C.energyInk} style={{ textAlign: 'center' }}>Wrapped is part of Pro.</Small> : null}
      <Row>
        <Button label={isPro ? 'Share' : 'See Pro'} onPress={isPro ? share : () => router.push('/plans')} style={{ flex: 1 }} />
        <Button label="Save" kind="ghost" onPress={save} style={{ flex: 1 }} />
      </Row>
      {msg ? <Small color={C.muted} style={{ textAlign: 'center' }}>{msg}</Small> : null}
    </View>
  );
}
