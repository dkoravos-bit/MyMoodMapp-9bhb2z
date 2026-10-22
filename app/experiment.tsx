/** A 7-day experiment: start one from a driver, follow progress, get a straight answer. */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import { C, R, S, T } from '@/ui/tokens';
import { Screen, Row, IconButton, Small, Body, H1, Eyebrow, Card, Button, tap } from '@/ui/primitives';
import { computeDrivers } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { Experiment, getActiveExperiment, progressOf, startExperiment, closeExperiment, templateFor } from '@/lib/experiments';

export default function ExperimentScreen() {
  const router = useRouter();
  const { driver } = useLocalSearchParams<{ driver?: string }>();
  const { user } = useAuth();
  const { moodLogEntries } = useApp();
  const fitnessData = useRealFitness();
  const [exp, setExp] = useState<Experiment | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const drivers = useMemo(() => computeDrivers(moodLogEntries, fitnessData), [moodLogEntries, fitnessData]);
  const candidate = drivers.find(d => d.key === driver) ?? drivers[0];

  useEffect(() => { if (user?.id) getActiveExperiment(user.id).then(setExp).catch(() => setExp(null)); }, [user?.id]);
  const prog = useMemo(() => exp ? progressOf(exp, moodLogEntries) : null, [exp, moodLogEntries]);

  const back = (
    <Row style={{ justifyContent: 'space-between' }}>
      <IconButton label="Back" onPress={() => router.back()}>
        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </IconButton>
      <Small color={C.muted}>{exp && prog ? `Experiment · day ${Math.min(7, prog.days.findIndex(d => d.state === 'today') + 1 || 7)} of 7` : 'New experiment'}</Small>
      <View style={{ width: 44 }} />
    </Row>
  );

  if (exp === undefined) return <Screen>{back}</Screen>;

  if (!exp) {
    if (!candidate) return <Screen>{back}<Card><Body>Log for about a week and you'll be able to test what moves you.</Body></Card></Screen>;
    const t = templateFor(candidate);
    return (
      <Screen>
        {back}
        <View style={{ gap: S.sm }}>
          <Eyebrow color={C.focusInk}>Because of “{candidate.name}” ({candidate.effect > 0 ? '+' : '−'}{Math.abs(candidate.effect)})</Eyebrow>
          <H1>{t.title}</H1>
          <Body color={C.muted}>{t.rule}</Body>
        </View>
        <Card>
          <Body>For seven days, keep logging as usual. At the end we compare your days with your usual and tell you straight — even if it didn't work.</Body>
        </Card>
        {err ? <Small color={C.bodyInk}>{err}</Small> : null}
        <Button label="Start this week" loading={busy} onPress={async () => {
          if (!user?.id) return; setBusy(true); setErr(null);
          try { setExp(await startExperiment(user.id, candidate, moodLogEntries)); tap('success'); } catch (e: any) { setErr(e?.message ?? 'Could not start.'); } finally { setBusy(false); }
        }} />
      </Screen>
    );
  }

  return (
    <Screen>
      {back}
      <H1>{exp.title}</H1>
      {exp.rule ? <Body color={C.muted}>{exp.rule}</Body> : null}
      <Row gap={6} style={{ justifyContent: 'space-between' }}>
        {prog!.days.map(d => (
          <View key={d.date} style={{ alignItems: 'center', gap: 6 }} accessibilityLabel={`${d.label}: ${d.state === 'done' ? `logged, ${d.avg}` : d.state}`}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: d.state === 'done' ? C.focus : d.state === 'future' ? C.surface2 : 'transparent',
              borderWidth: d.state === 'today' ? 2 : d.state === 'missed' ? 1 : 0, borderColor: d.state === 'today' ? C.focus : C.lineStrong }}>
              {d.state === 'done' ? <Text style={[T.smallSemi, { color: C.bg }]}>{d.avg}</Text> : null}
            </View>
            <Small color={d.state === 'today' ? C.ink : C.muted}>{d.state === 'today' ? 'Today' : d.label}</Small>
          </View>
        ))}
      </Row>
      <Card>
        <Eyebrow>So far</Eyebrow>
        <Row gap={S.xxl} style={{ alignItems: 'flex-end' }}>
          <View><Text style={[T.hero, { color: C.focusInk, fontSize: 34 }]}>{prog!.soFar ?? '—'}</Text><Small color={C.muted}>your days this week</Small></View>
          <View><Text style={[T.hero, { color: C.faint, fontSize: 34 }]}>{prog!.baseline ?? '—'}</Text><Small color={C.muted}>your usual</Small></View>
        </Row>
        {prog!.verdict ? <Body><Text style={T.bodySemi}>{prog!.verdict.title}. </Text>{prog!.verdict.text}</Body> : <Body color={C.muted}>Log today and the comparison starts.</Body>}
      </Card>
      {prog!.finished ? (
        <Button label="Finish and save the result" loading={busy} onPress={async () => { setBusy(true); await closeExperiment(exp, 'completed', prog!); setBusy(false); router.back(); }} />
      ) : (
        <Button label="Log today" onPress={() => router.push('/log')} />
      )}
      <Button label="End experiment early" kind="quiet" onPress={async () => { await closeExperiment(exp, 'ended', prog!); router.back(); }} />
    </Screen>
  );
}
