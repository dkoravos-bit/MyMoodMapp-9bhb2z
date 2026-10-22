/**
 * Share with my therapist — choose exactly what goes, see the report before it's sent.
 * Notes, voice transcripts and tags are off by default.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { useAuth, getSupabaseClient } from '@/template';
import { C, R, S, T } from '@/ui/tokens';
import { Screen, Row, IconButton, Small, Body, BodySemi, H1, Card, Button, Divider, tap } from '@/ui/primitives';
import { byDay, computeDrivers, addDays, localDate } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { CONTEXT_TAGS } from '@/constants/moodlog';
import { getMyTherapistLinks, respondToTherapistInvite, TherapistClient } from '@/services/therapist';

type Key = 'mood' | 'drivers' | 'health' | 'checks' | 'tags' | 'notes';
const ITEMS: { k: Key; label: string; hint: string }[] = [
  { k: 'mood', label: 'Mood scores & trend', hint: 'Daily score and the four dimensions' },
  { k: 'drivers', label: 'What moves me', hint: 'Your top drivers, with confidence' },
  { k: 'health', label: 'Sleep & activity', hint: 'From Apple Health or Health Connect' },
  { k: 'checks', label: 'Check-in questionnaires', hint: 'PHQ-9 and GAD-7 results, if you took them' },
  { k: 'tags', label: 'Tags', hint: 'Work, alcohol, friends…' },
  { k: 'notes', label: 'Notes & voice transcripts', hint: 'Private unless you turn this on' },
];

export default function ShareCare() {
  const router = useRouter();
  const { link } = useLocalSearchParams<{ link?: string }>();
  const { user } = useAuth();
  const { moodLogEntries } = useApp();
  const fitnessData = useRealFitness();
  const [on, setOn] = useState<Record<Key, boolean>>({ mood: true, drivers: true, health: true, checks: true, tags: false, notes: false });
  const [therapist, setTherapist] = useState<TherapistClient | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getMyTherapistLinks(user.id, user.email ?? undefined).then(ls => setTherapist(ls.find(l => l.id === link) ?? ls[0] ?? null)).catch(() => {});
    getSupabaseClient().from('share_grants').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).then(({ data }) => {
      const g: any = data?.[0]; if (g) setOn({ mood: g.include_mood, drivers: g.include_drivers, health: g.include_health, checks: g.include_checks, tags: g.include_tags, notes: g.include_notes });
    });
  }, [user?.id, link]);

  const from = addDays(localDate(), -13);
  const recent = moodLogEntries.filter(e => e.date >= from);
  const days = useMemo(() => [...byDay(recent).values()].sort((a, b) => a.date.localeCompare(b.date)), [recent]);
  const drivers = useMemo(() => computeDrivers(moodLogEntries, fitnessData).filter(d => d.confidence !== 'Hunch').slice(0, 4), [moodLogEntries, fitnessData]);
  const avg = days.length ? Math.round(days.reduce((s, d) => s + d.avg, 0) / days.length) : null;

  const report = useMemo(() => {
    const L: string[] = [`MyMoodMapp report — last 2 weeks (${from} to ${localDate()})`, ''];
    if (on.mood) {
      L.push(`Mood: ${days.length} days logged${avg != null ? `, average ${avg}/100` : ''}.`);
      days.forEach(d => L.push(`  ${d.date}: ${d.avg} (mind ${Math.round(d.dims.mind * 100)}, energy ${Math.round(d.dims.energy * 100)}, body ${Math.round(d.dims.body * 100)}, focus ${Math.round(d.dims.focus * 100)})`));
      L.push('');
    }
    if (on.drivers && drivers.length) { L.push('What moves me:'); drivers.forEach(d => L.push(`  ${d.name}: ${d.effect > 0 ? '+' : ''}${d.effect} (${d.withDays} days, ${d.confidence.toLowerCase()})`)); L.push(''); }
    if (on.health) {
      const f = fitnessData.filter(x => x.date >= from);
      const sl = f.map(x => x.sleepHours).filter((x): x is number => !!x); const st = f.map(x => x.steps).filter(Boolean);
      if (sl.length || st.length) L.push(`Sleep avg ${sl.length ? (sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(1) + 'h' : '—'}; steps avg ${st.length ? Math.round(st.reduce((a, b) => a + b, 0) / st.length).toLocaleString() : '—'}.`, '');
    }
    if (on.tags) {
      const counts = new Map<string, number>(); recent.forEach(e => [e.primaryTag, ...(e.additionalTags ?? [])].filter(Boolean).forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
      L.push('Most-used tags: ' + [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => `${CONTEXT_TAGS.find(x => x.id === t)?.label ?? t} ×${n}`).join(', '), '');
    }
    if (on.notes) { L.push('Notes:'); recent.filter(e => e.note || e.transcript).forEach(e => L.push(`  ${e.date}: ${e.note || e.transcript}`)); L.push(''); }
    if (on.checks) L.push('Questionnaire results are visible in your therapist dashboard if you completed them.');
    return L.join('\n');
  }, [on, days, drivers, fitnessData, recent]);

  const saveGrant = async () => {
    if (!user?.id) return;
    const row = { user_id: user.id, therapist_id: therapist?.therapist_id ?? null, therapist_email: null, include_mood: on.mood, include_drivers: on.drivers, include_health: on.health, include_checks: on.checks, include_tags: on.tags, include_notes: on.notes, range_days: 14 };
    const sb = getSupabaseClient();
    const { data } = await sb.from('share_grants').select('id').eq('user_id', user.id).limit(1);
    if (data?.[0]) await sb.from('share_grants').update(row).eq('id', data[0].id); else await sb.from('share_grants').insert(row);
  };

  const shareLive = async () => {
    tap('success');
    try {
      if (therapist?.status === 'pending') await respondToTherapistInvite(therapist.id, true);
      await saveGrant(); setMsg('Saved. Your therapist sees what you selected.');
    } catch (e: any) { setMsg(e?.message ?? 'Could not save.'); }
  };
  const sendReport = async () => { tap(); try { await saveGrant(); await Share.share({ message: report }); } catch {} };

  return (
    <Screen contentStyle={{ paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Back" onPress={() => router.back()}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </IconButton>
        <Small color={C.muted}>{therapist ? (therapist.status === 'pending' ? 'Your therapist invited you' : 'Before your next session') : 'Share a report'}</Small>
        <View style={{ width: 44 }} />
      </Row>
      <View style={{ gap: 4 }}>
        <H1>Share with my therapist</H1>
        <Body color={C.muted}>Last 2 weeks · you choose exactly what goes.</Body>
      </View>
      <Card style={{ paddingVertical: S.xs }}>
        {ITEMS.map((it, i) => (
          <View key={it.k}>
            <Row style={{ paddingVertical: S.md, justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}><BodySemi>{it.label}</BodySemi><Small color={C.muted}>{it.hint}</Small></View>
              <Switch value={on[it.k]} onValueChange={(v) => { tap(); setOn(s => ({ ...s, [it.k]: v })); }} trackColor={{ true: C.mind, false: C.surface2 }} accessibilityLabel={it.label} />
            </Row>
            {i < ITEMS.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
      <View style={{ backgroundColor: C.ink, borderRadius: R.lg, padding: S.lg, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={[T.h3, { color: C.bg }]}>Report preview</Text>
          <Small color="#4A4D5E">{Object.values(on).filter(Boolean).length} of 6 sections</Small>
        </Row>
        <Row gap={3} style={{ alignItems: 'flex-end', height: 40 }}>
          {days.map(d => <View key={d.date} style={{ flex: 1, height: `${Math.max(8, d.avg)}%`, backgroundColor: d.avg < 50 ? '#7E68D6' : d.avg < 70 ? '#2C9C91' : '#D9962A', borderRadius: 3 }} />)}
        </Row>
        <Text style={[T.small, { color: '#2B2E3A' }]} numberOfLines={6}>{report.split('\n').slice(2).filter(Boolean).slice(0, 5).join(' · ') || 'Nothing selected yet.'}</Text>
      </View>
      {therapist ? <Button label="Share live with my therapist" kind="accent" onPress={shareLive} /> : null}
      <Button label="Send as a message or file" kind={therapist ? 'ghost' : 'primary'} onPress={sendReport} />
      {msg ? <Small color={C.muted} style={{ textAlign: 'center' }}>{msg}</Small> : null}
      <Small color={C.faint}>Reports go only where you send them. MyMoodMapp never shares your data with advertisers.</Small>
    </Screen>
  );
}
