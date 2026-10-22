/**
 * Onboarding — three short steps: the promise, connect what you already track
 * (so insights start on day one), then your first log.
 */
import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { C, R, S, T } from '@/ui/tokens';
import { Body, BodySemi, Small, Eyebrow, Button, Card, Row, tap } from '@/ui/primitives';
import { markOnboardingDone } from '@/services/storage';
import { requestFitnessPermissions, fetchFitnessDataAndSync } from '@/services/fitness';
import { fetchWeather } from '@/services/weather';
import { MoodPrint } from '@/art/MoodPrint';
import { fmtHours } from '@/lib/insight';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnboardingDone, setFitnessData, setFitnessPermission, setWeatherData } = useApp();
  const [step, setStep] = useState(0);
  const [health, setHealth] = useState<'idle' | 'busy' | 'on' | 'off'>('idle');
  const [weather, setWeather] = useState<'idle' | 'busy' | 'on' | 'off'>('idle');
  const [insight, setInsight] = useState<string | null>(null);

  const connectHealth = async () => {
    setHealth('busy');
    try {
      const perm = await requestFitnessPermissions();
      setFitnessPermission(perm);
      if (!perm.granted || perm.source === 'mock') { setHealth('off'); return; }
      const data = await fetchFitnessDataAndSync(60);
      setFitnessData(data);
      setHealth('on');
      const sleeps = data.map(d => d.sleepHours).filter((x): x is number => !!x);
      const steps = data.map(d => d.steps).filter(Boolean);
      if (sleeps.length >= 5) setInsight(`You've averaged ${fmtHours(sleeps.reduce((a, b) => a + b, 0) / sleeps.length)} of sleep over ${sleeps.length} nights. Once you log a few days, we'll show exactly how sleep moves your mood.`);
      else if (steps.length >= 5) setInsight(`About ${Math.round(steps.reduce((a, b) => a + b, 0) / steps.length).toLocaleString()} steps a day lately. We'll show how movement lines up with your mood as you log.`);
    } catch { setHealth('off'); }
  };
  const connectWeather = async () => {
    setWeather('busy');
    try { const w = await fetchWeather(); if (w) { setWeatherData(w); setWeather('on'); } else setWeather('off'); } catch { setWeather('off'); }
  };
  const finish = async () => {
    tap('success');
    await markOnboardingDone();
    setOnboardingDone(true);
    router.replace('/(tabs)');
    setTimeout(() => router.push('/log'), 350);
  };

  const Status = ({ s }: { s: 'idle' | 'busy' | 'on' | 'off' }) => s === 'on'
    ? <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityLabel="Connected"><Circle cx={12} cy={12} r={10} fill={C.mind} /><Path d="M7.5 12.5l3 3 6-6" fill="none" stroke={C.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
    : <Small color={s === 'off' ? C.muted : C.mindInk}>{s === 'busy' ? 'Connecting…' : s === 'off' ? 'Not now' : 'Connect'}</Small>;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.xl, paddingHorizontal: S.xl, gap: S.xl }}>
      {step === 0 ? (
        <>
          <View style={{ alignItems: 'center', paddingTop: S.xl }}>
            <MoodPrint ridges={9} avg={72} volatility="breeze" energy={0.6} size={260} />
          </View>
          <View style={{ gap: S.md }}>
            <Text style={[T.hero, { color: C.ink }]}>Your mood, mapped.</Text>
            <Body color={C.muted}>Three seconds a day. Watch your days become living art, learn what actually moves you, and share it with the people who help.</Body>
          </View>
          <View style={{ flex: 1 }} />
          <Button label="Get started" onPress={() => { tap(); setStep(1); }} />
        </>
      ) : (
        <>
          <View style={{ gap: S.sm }}>
            <Eyebrow color={C.mindInk}>Step 2 of 3</Eyebrow>
            <Text style={[T.h1, { color: C.ink }]}>Your map starts before your first log.</Text>
            <Body color={C.muted}>Connect what you already track and we'll start finding patterns today — not in a month.</Body>
          </View>
          <View style={{ gap: S.sm }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <BodySemi>{Platform.OS === 'android' ? 'Health Connect' : Platform.OS === 'ios' ? 'Apple Health' : 'Health data'}</BodySemi>
                <Small color={C.muted}>{Platform.OS === 'web' ? 'Available in the iPhone and Android apps' : 'Sleep, steps, heart rate'}</Small>
              </View>
              {Platform.OS === 'web' ? <Small color={C.faint}>App only</Small> : <Button label={health === 'on' ? '✓' : 'Connect'} kind="ghost" onPress={connectHealth} disabled={health === 'busy' || health === 'on'} style={{ height: 40, paddingHorizontal: 14 }} />}
            </Card>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <BodySemi>Local weather</BodySemi>
                <Small color={C.muted}>Light, pressure, temperature</Small>
              </View>
              {weather === 'on' ? <Status s="on" /> : <Button label="Connect" kind="ghost" onPress={connectWeather} disabled={weather === 'busy'} style={{ height: 40, paddingHorizontal: 14 }} />}
            </Card>
          </View>
          {insight ? (
            <View style={{ borderRadius: R.xl, padding: S.xl, backgroundColor: '#121426', borderWidth: 1, borderColor: C.lineStrong, gap: S.sm }}>
              <Eyebrow color={C.mindInk}>Already learning</Eyebrow>
              <Body>{insight}</Body>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <View style={{ gap: S.md }}>
            <Button label="Log how I feel right now" onPress={finish} />
            <Small color={C.faint} style={{ textAlign: 'center' }}>Your health data stays on your device and your account. No ads, ever.</Small>
          </View>
        </>
      )}
    </View>
  );
}
