/**
 * Today — the living portrait, the streak, one useful nudge, and today's context.
 */
import React, { useMemo } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { C, R, S, T } from '@/ui/tokens';
import { Screen, Card, Body, Small, SmallSemi, H1, H3, Eyebrow, Row, Button, Tiny, tap } from '@/ui/primitives';
import { MoodField } from '@/art/MoodField';
import { useMoodArt } from '@/lib/useMoodArt';
import { computeDrivers, forgivingStreak, localDate, fmtHours, latestEntry } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { getScoreLabel } from '@/constants/moodlog';
import { formatTemp } from '@/services/weather';
import { Text } from 'react-native';

export default function Today() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { moodLogEntries, todayMoodLogEntries, weatherData, displayName, tempUnit } = useApp();
  const fitnessData = useRealFitness();
  const art = useMoodArt('now', { fetchPlate: true });
  const week = useMoodArt('week', { fetchPlate: true });
  const weekDays = useMemo(() => {
    const from = new Date(); from.setDate(from.getDate() - 6);
    const cutoff = localDate(from);
    return new Set(moodLogEntries.filter(e => e.date >= cutoff).map(e => e.date)).size;
  }, [moodLogEntries]);
  const streak = useMemo(() => forgivingStreak(moodLogEntries), [moodLogEntries]);
  const drivers = useMemo(() => computeDrivers(moodLogEntries, fitnessData), [moodLogEntries, fitnessData]);
  const todayFit = fitnessData.find(f => f.date === localDate()) ?? null;
  const last = latestEntry(moodLogEntries);
  const todayScore = todayMoodLogEntries.length ? Math.round(todayMoodLogEntries.reduce((s, e) => s + e.score, 0) / todayMoodLogEntries.length) : null;

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const firstName = (displayName ?? '').split(' ')[0];
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const nudge = useMemo(() => {
    const sleepD = drivers.find(d => d.key === 'sleep7' && d.confidence !== 'Hunch' && d.effect > 0);
    if (todayFit?.sleepHours != null && todayFit.sleepHours < 7 && sleepD) {
      return { text: `You slept ${fmtHours(todayFit.sleepHours)}. On short-sleep days you tend to land about ${sleepD.effect} points lower — go easy on yourself this afternoon.`, cta: 'Why?' };
    }
    const best = drivers.find(d => d.effect > 0 && d.confidence !== 'Hunch');
    if (best) return { text: `“${best.name}” lifts your days by about ${best.effect} points (${best.withDays} days of data). Room for it today?`, cta: 'See all drivers' };
    const days = new Set(moodLogEntries.map(e => e.date)).size;
    if (days < 6) return { text: `Log ${6 - days} more ${6 - days === 1 ? 'day' : 'days'} and your first drivers appear — what actually moves your mood, from your own data.`, cta: 'How it works' };
    return { text: 'Keep tagging what happens — patterns sharpen with every day you log.', cta: 'Open Learn' };
  }, [drivers, todayFit, moodLogEntries]);

  const dims = art.input ? { mind: art.input.mind, energy: art.input.energy, body: art.input.body, focus: art.input.focus } : null;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Small color={C.muted}>{dateLabel}</Small>
          <H1>{firstName ? `${greet}, ${firstName}` : greet}</H1>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={() => { tap(); router.push('/settings'); }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[T.h3, { color: C.ink }]}>{(firstName || 'Me').slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </Row>

      {art.palette && art.traits && dims ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open your Mapp. ${art.alt}`} onPress={() => router.push('/(tabs)/mapp')}>
          <MoodField palette={art.palette} traits={art.traits} dims={dims} plateUrl={art.plateUrl}
            height={320} width={width - 40} compassSize={200} style={{ borderRadius: R.xl, borderWidth: 1, borderColor: C.line }}>
            <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16, gap: 2 }}>
              <Eyebrow color={C.inkSoft}>{todayScore != null ? `Today · ${todayScore} · ${getScoreLabel(todayScore)}` : `Last log · ${last?.score ?? ''}`}</Eyebrow>
              <Text style={[T.h2, { color: C.ink }]}>{art.name}</Text>
            </View>
          </MoodField>
        </Pressable>
      ) : (
        <Card style={{ gap: S.md, paddingVertical: S.xxl }}>
          <H3>Your map starts with one log.</H3>
          <Body color={C.muted}>Three seconds: how's your mind, energy, body and focus? Your first piece of art appears right away.</Body>
          <Button label="Log how I feel" onPress={() => router.push('/log')} />
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <H3>{streak.streak > 0 ? `${streak.streak}-day streak` : 'Start a streak today'}</H3>
            <Small color={C.muted}>{streak.loggedToday ? 'Logged today — nice.' : streak.restLeft ? '1 rest day available this week. No pressure.' : 'Rest day used this week.'}</Small>
          </View>
          <Row gap={5} style={{ marginLeft: S.md }}>
            {streak.week.map(d => (
              <View key={d.date} accessibilityLabel={`${d.date}: ${d.logged ? 'logged' : d.rest ? 'rest day' : 'not logged'}`}
                style={{ width: 10, height: 26, borderRadius: 5, backgroundColor: d.logged ? C.energy : d.rest ? 'rgba(245,181,74,0.3)' : 'transparent', borderWidth: d.logged || d.rest ? 0 : 1.5, borderColor: d.today ? C.energy : C.lineStrong }} />
            ))}
          </Row>
        </Row>
      </Card>

      {/* Your week, painted — appears once there are two days to compare */}
      {week.palette && week.traits && week.input && weekDays >= 2 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Your week. ${week.alt}`} onPress={() => { tap(); router.push('/(tabs)/mapp'); }}>
          <MoodField palette={week.palette} traits={week.traits} plateUrl={week.plateUrl} showCompass={false}
            dims={{ mind: week.input.mind, energy: week.input.energy, body: week.input.body, focus: week.input.focus }}
            height={Math.round((width - 40) * 9 / 16)} width={width - 40} seed={11} style={{ borderRadius: R.xl, borderWidth: 1, borderColor: C.line }}>
            <View style={{ position: 'absolute', left: 18, right: 18, bottom: 14, gap: 2 }}>
              <Eyebrow color={C.inkSoft}>{`This week · ${weekDays} ${weekDays === 1 ? 'day' : 'days'} · ${week.input.score}`}</Eyebrow>
              <Text style={[T.h3, { color: C.ink }]}>{week.name}</Text>
            </View>
          </MoodField>
        </Pressable>
      ) : null}

      <Card>
        <Eyebrow color={C.focusInk}>Today's nudge</Eyebrow>
        <Body>{nudge.text}</Body>
        <Row>
          <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/(tabs)/learn'); }}
            style={{ height: 40, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center' }}>
            <SmallSemi>{nudge.cta}</SmallSemi>
          </Pressable>
        </Row>
      </Card>

      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {[
          { k: 'Sleep', v: todayFit?.sleepHours != null ? fmtHours(todayFit.sleepHours) : '—' },
          { k: 'Steps', v: todayFit?.steps ? todayFit.steps.toLocaleString() : '—' },
          { k: 'Weather', v: weatherData ? `${formatTemp(weatherData.temperature, tempUnit)}` : '—' },
          { k: 'Resting HR', v: todayFit?.restingHeartRate ? `${todayFit.restingHeartRate}` : '—' },
        ].map(x => (
          <View key={x.k} style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.md, padding: 10, gap: 2 }}>
            <Tiny color={C.muted}>{x.k}</Tiny>
            <SmallSemi numberOfLines={1}>{x.v}</SmallSemi>
          </View>
        ))}
      </View>
    </Screen>
  );
}
