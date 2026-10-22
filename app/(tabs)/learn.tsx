/**
 * Learn — what moves you. Honest drivers from your own data, each with how many
 * days back it and how sure we are. Hunches are shown faded, never as facts.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { C, R, S, T } from '@/ui/tokens';
import { Screen, H1, Body, Small, SmallSemi, BodySemi, Card, Chip, Row, Eyebrow, EffectBar, Divider, tap } from '@/ui/primitives';
import { computeDrivers, confidenceLabel, Driver } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { getActiveExperiment, templateFor, Experiment } from '@/lib/experiments';
import { Text } from 'react-native';
import { useIsPro } from '@/ui/ProGate';

type Filter = 'all' | 'body' | 'habits' | 'world';

export default function Learn() {
  const router = useRouter();
  const { user } = useAuth();
  const { moodLogEntries } = useApp();
  const fitnessData = useRealFitness();
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<Experiment | null>(null);
  const drivers = useMemo(() => computeDrivers(moodLogEntries, fitnessData), [moodLogEntries, fitnessData]);
  const isPro = useIsPro();
  const allShown = drivers.filter(d => filter === 'all' || d.group === filter);
  const shown = isPro ? allShown : allShown.slice(0, 1);
  const locked = allShown.length - shown.length;
  const nDays = useMemo(() => new Set(moodLogEntries.map(e => e.date)).size, [moodLogEntries]);

  useFocusEffect(React.useCallback(() => {
    if (user?.id) getActiveExperiment(user.id).then(setActive).catch(() => setActive(null));
  }, [user?.id]));

  const testable = drivers.find(d => d.confidence !== 'Strong') ?? drivers[0];

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>What moves you</H1>
        <Body color={C.muted}>{nDays >= 6 ? `From ${nDays} days of your logs${fitnessData.length ? ', sleep and steps' : ''}.` : 'Your drivers appear after about a week of logs.'}</Body>
      </View>

      {active ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/experiment'); }}
          style={{ borderRadius: R.lg, padding: S.lg, backgroundColor: C.surface2, borderWidth: 1, borderColor: 'rgba(168,139,255,0.4)', flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow color={C.focusInk}>Experiment running</Eyebrow>
            <BodySemi>{active.title}</BodySemi>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
      ) : null}

      <Row>
        {(['all', 'body', 'habits', 'world'] as Filter[]).map(f => <Chip key={f} label={f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)} on={filter === f} onPress={() => setFilter(f)} />)}
      </Row>

      {shown.length ? (
        <Card style={{ paddingVertical: S.xs }}>
          {shown.map((d: Driver, i) => (
            <View key={d.key}>
              <View style={{ paddingVertical: S.md, gap: 8 }} accessible accessibilityLabel={`${d.name}: ${d.effect > 0 ? 'plus' : 'minus'} ${Math.abs(d.effect)} points. ${confidenceLabel(d)}`}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <BodySemi style={{ flex: 1 }}>{d.name}</BodySemi>
                  <Text style={[T.h3, { color: d.effect > 0 ? C.mindInk : C.energyInk }]}>{d.effect > 0 ? '+' : '−'}{Math.abs(d.effect)}</Text>
                </Row>
                <EffectBar value={d.effect} faint={d.confidence === 'Hunch'} />
                <Small color={C.muted}>{confidenceLabel(d)}</Small>
              </View>
              {i < shown.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <Body color={C.muted}>{nDays >= 6 ? 'Nothing stands out in this group yet. Keep tagging what happens and patterns will show.' : `${Math.max(0, 6 - nDays)} more ${6 - nDays === 1 ? 'day' : 'days'} of logging and your first drivers appear here.`}</Body>
        </Card>
      )}

      {locked > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/plans'); }} style={{ borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: 'rgba(245,181,74,0.4)', gap: 2 }}>
          <Eyebrow color={C.energyInk}>Pro</Eyebrow>
          <BodySemi>{locked} more {locked === 1 ? 'driver' : 'drivers'} found in your data</BodySemi>
          <Small color={C.muted}>See everything that moves your mood, and test it with 7-day experiments.</Small>
        </Pressable>
      ) : null}

      {isPro && !active && testable ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.push({ pathname: '/experiment', params: { driver: testable.key } }); }}
          style={{ borderRadius: R.lg, padding: S.lg, backgroundColor: C.surface2, borderWidth: 1, borderColor: 'rgba(168,139,255,0.35)', flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow color={C.focusInk}>Test it</Eyebrow>
            <BodySemi>Try a week of: {templateFor(testable).title.toLowerCase()}</BodySemi>
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
      ) : null}

      <Small color={C.faint}>Effects compare your average on days with each thing to days without. Strong = consistent across 8+ days each way. Likely = probably real. Hunch = could be chance.</Small>
    </Screen>
  );
}
