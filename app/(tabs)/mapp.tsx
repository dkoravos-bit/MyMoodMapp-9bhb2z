/**
 * Mapp — your mood, painted. Four layers: Now · Rhythm · Month · Print.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { C, R, S, T } from '@/ui/tokens';
import { Body, Small, SmallSemi, Eyebrow, Card, Row, Button, H1, H2, H3, Tiny, tap } from '@/ui/primitives';
import { MoodField } from '@/art/MoodField';
import { MoodPrint } from '@/art/MoodPrint';
import { Compass } from '@/art/Compass';
import { useMoodArt } from '@/lib/useMoodArt';
import { byDay, computeDrivers, computeRhythm, localDate, SCALE_INDEX, addDays } from '@/lib/insight';
import { useRealFitness } from '@/lib/insight';
import { getScoreLabel, CONTEXT_TAGS } from '@/constants/moodlog';
import { ProGate } from '@/ui/ProGate';

type Layer = 'now' | 'rhythm' | 'month' | 'print';
const LAYERS: { id: Layer; label: string }[] = [{ id: 'now', label: 'Now' }, { id: 'rhythm', label: 'Rhythm' }, { id: 'month', label: 'Month' }, { id: 'print', label: 'Print' }];

function Pills({ layer, setLayer, onArt }: { layer: Layer; setLayer: (l: Layer) => void; onArt?: boolean }) {
  return (
    <Row gap={6}>
      {LAYERS.map(l => {
        const on = layer === l.id;
        return (
          <Pressable key={l.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { tap(); setLayer(l.id); }}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.ink : onArt ? C.scrim : 'transparent', borderWidth: on ? 0 : 1, borderColor: C.lineStrong }}>
            <Text style={[T.smallSemi, { color: on ? C.bg : C.inkSoft }]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export default function Mapp() {
  const [layer, setLayer] = useState<Layer>('now');
  const insets = useSafeAreaInsets();
  if (layer === 'now') return <NowLayer layer={layer} setLayer={setLayer} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: layer === 'print' ? '#000' : C.bg }} contentContainerStyle={{ paddingTop: insets.top + S.lg, paddingHorizontal: S.xl, paddingBottom: 120, gap: S.lg }}>
      <Pills layer={layer} setLayer={setLayer} />
      {layer === 'rhythm'
        ? <ProGate title="Your rhythm for the day" text="See when you usually peak and dip, adjusted for last night's sleep."><RhythmLayer /></ProGate>
        : layer === 'month' ? <MonthLayer />
        : <ProGate title="Your Mood Print" text="A fingerprint that grows a ridge every day you log, sealed into a 12-piece year."><PrintLayer /></ProGate>}
    </ScrollView>
  );
}

// ── Now ───────────────────────────────────────────────────────────────────────
function NowLayer({ layer, setLayer }: { layer: Layer; setLayer: (l: Layer) => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { todayMoodLogEntries } = useApp();
  const art = useMoodArt('now', { fetchPlate: true });
  const [open, setOpen] = useState(false);
  const fieldH = height - 84 - insets.bottom;
  if (!art.palette || !art.traits || !art.input) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + S.lg, paddingHorizontal: S.xl, gap: S.lg }}>
        <Pills layer={layer} setLayer={setLayer} />
        <Card style={{ gap: S.md }}>
          <H3>Your Mapp paints itself from your logs.</H3>
          <Body color={C.muted}>Log once and your first living piece appears — a sky, a sea and a compass that breathe with how you feel.</Body>
          <Button label="Log how I feel" onPress={() => router.push('/log')} />
        </Card>
      </View>
    );
  }
  const score = todayMoodLogEntries.length ? Math.round(todayMoodLogEntries.reduce((s, e) => s + e.score, 0) / todayMoodLogEntries.length) : art.input.score;
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MoodField palette={art.palette} traits={art.traits} plateUrl={art.plateUrl} accessibilityLabel={art.alt}
        dims={{ mind: art.input.mind, energy: art.input.energy, body: art.input.body, focus: art.input.focus }}
        height={fieldH} width={width} compassSize={Math.min(260, width * 0.65)}>
        <View style={{ position: 'absolute', top: insets.top + S.md, left: S.lg, right: S.lg }}>
          <Pills layer={layer} setLayer={setLayer} onArt />
        </View>
        <View style={{ position: 'absolute', left: S.xl, right: S.xl, bottom: S.xl, gap: S.md }}>
          <View style={{ gap: 4 }}>
            <Eyebrow color={C.inkSoft}>{weekday} · {score} · {getScoreLabel(score)}</Eyebrow>
            <Text style={[T.hero, { color: C.ink, fontSize: 30, lineHeight: 34 }]}>{art.name}</Text>
          </View>
          {open && art.legend ? (
            <View style={{ backgroundColor: 'rgba(7,8,15,0.75)', borderRadius: R.lg, borderWidth: 1, borderColor: C.lineStrong, padding: S.lg, gap: 8 }}>
              {art.legend.map((row, i) => (
                <Row key={i} style={{ justifyContent: 'space-between' }}>
                  <SmallSemi color={row.key === 'mind' ? C.mindInk : row.key === 'energy' ? C.energyInk : row.key === 'body' ? C.bodyInk : row.key === 'focus' ? C.focusInk : C.inkSoft}>{row.label}</SmallSemi>
                  <Small color={C.inkSoft}>{row.meaning}</Small>
                </Row>
              ))}
              {!art.plateUrl ? <Tiny color={C.faint}>The painted layer appears once today's piece is ready.</Tiny> : null}
            </View>
          ) : null}
          <Row>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { tap(); setOpen(o => !o); }}
              style={{ flex: 1, height: 46, borderRadius: R.md, backgroundColor: C.scrim, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <SmallSemi>{open ? 'Hide the legend' : 'Read your art'}</SmallSemi>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={() => { tap(); router.push('/wrapped'); }}
              style={{ height: 46, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.scrim, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <SmallSemi>Share</SmallSemi>
            </Pressable>
          </Row>
        </View>
      </MoodField>
    </View>
  );
}

// ── Rhythm ────────────────────────────────────────────────────────────────────
function RhythmLayer() {
  const { moodLogEntries } = useApp();
  const fitnessData = useRealFitness();
  const { width } = useWindowDimensions();
  const drivers = useMemo(() => computeDrivers(moodLogEntries, fitnessData), [moodLogEntries, fitnessData]);
  const rh = useMemo(() => computeRhythm(moodLogEntries, fitnessData, drivers), [moodLogEntries, fitnessData, drivers]);
  const w = Math.min(width, 480) - 64; const h = 180;
  if (!rh.ready) return (
    <Card style={{ gap: S.md }}>
      <H2>Your rhythm</H2>
      <Body color={C.muted}>After a week of logs we can show how a typical day flows for you — when you peak and when you dip. {7 - rh.daysUsed} more {7 - rh.daysUsed === 1 ? 'day' : 'days'} to go.</Body>
    </Card>
  );
  const x = (hour: number) => ((hour - 6) / 18) * w;
  const y = (v: number) => h - (v / 100) * h;
  const pts = rh.points;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.hour)} ${y(p.value)}`).join(' ');
  const band = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.hour)} ${y(Math.min(100, p.value + p.band))}`).join(' ') + ' ' +
    [...pts].reverse().map(p => `L${x(p.hour)} ${y(Math.max(0, p.value - p.band))}`).join(' ') + ' Z';
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  return (
    <>
      <View style={{ gap: 4 }}>
        <H1>Your rhythm today</H1>
        <Body color={C.muted}>How a day like today usually goes for you, adjusted for last night.</Body>
      </View>
      <View style={{ borderRadius: R.xl, padding: S.lg, backgroundColor: '#1A1530', borderWidth: 1, borderColor: C.line }}>
        <Svg width={w} height={h + 22} accessibilityLabel={`Expected mood: lowest ${rh.low?.label.toLowerCase()} around ${rh.low?.value}, best ${rh.best?.label.toLowerCase()} around ${rh.best?.value}`}>
          {[25, 50, 75].map(g => <Line key={g} x1={0} x2={w} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" />)}
          <Path d={band} fill="rgba(245,181,74,0.16)" />
          <Path d={line} stroke={C.energy} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(p => <Circle key={p.label} cx={x(p.hour)} cy={y(p.value)} r={4} fill={C.energy} />)}
          {nowH >= 6 ? <Line x1={x(Math.min(24, nowH))} x2={x(Math.min(24, nowH))} y1={0} y2={h} stroke="rgba(255,255,255,0.4)" strokeDasharray="3 4" /> : null}
          {pts.map(p => <SvgText key={`t${p.label}`} x={x(p.hour)} y={h + 18} fill={C.muted} fontSize={11} textAnchor="middle">{p.label}</SvgText>)}
        </Svg>
      </View>
      <Row>
        <Card style={{ flex: 1 }}><Small color={C.muted}>Low point</Small><H3>{rh.low?.label} · {rh.low?.value}</H3></Card>
        <Card style={{ flex: 1 }}><Small color={C.muted}>Best window</Small><H3>{rh.best?.label} · {rh.best?.value}</H3></Card>
      </Row>
      <Card>
        <Eyebrow color={C.energyInk}>What's shaping today</Eyebrow>
        {rh.factors.map(f => (
          <Row key={f.label} style={{ justifyContent: 'space-between' }}>
            <Body>{f.label}</Body>
            <SmallSemi color={f.delta > 0 ? C.mindInk : f.delta < 0 ? C.energyInk : C.muted}>{f.delta > 0 ? `+${f.delta}` : f.delta < 0 ? `−${Math.abs(f.delta)}` : '±0'}</SmallSemi>
          </Row>
        ))}
        <Small color={C.faint}>Built from {rh.daysUsed} days of your logs. Usually within ±{rh.typicalError} points — it's a rhythm, not a prophecy.</Small>
      </Card>
    </>
  );
}

// ── Month ─────────────────────────────────────────────────────────────────────
function MonthLayer() {
  const { moodLogEntries } = useApp();
  const { width } = useWindowDimensions();
  const art = useMoodArt('month', { fetchPlate: true });
  const days = useMemo(() => byDay(moodLogEntries), [moodLogEntries]);
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1); const nDays = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const [sel, setSel] = useState<string>(localDate());
  const monthDays = [...days.values()].filter(d => d.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`));
  const avg = monthDays.length ? Math.round(monthDays.reduce((s, d) => s + d.avg, 0) / monthDays.length) : null;
  const prevKey = `${m === 0 ? y - 1 : y}-${String(m === 0 ? 12 : m).padStart(2, '0')}`;
  const prevDays = [...days.values()].filter(d => d.date.startsWith(prevKey));
  const prevAvg = prevDays.length ? Math.round(prevDays.reduce((s, d) => s + d.avg, 0) / prevDays.length) : null;
  const cell = Math.floor((Math.min(width, 480) - 40 - 6 * 6) / 7);
  const selDay = days.get(sel);
  return (
    <>
      {art.palette && art.traits && art.input ? (
        <MoodField palette={art.palette} traits={art.traits} plateUrl={art.plateUrl} showCompass={false} height={210} width={Math.min(width, 480) - 40}
          dims={{ mind: art.input.mind, energy: art.input.energy, body: art.input.body, focus: art.input.focus }} style={{ borderRadius: R.xl }} accessibilityLabel={`Your ${now.toLocaleDateString(undefined, { month: 'long' })} landscape`}>
          <View style={{ position: 'absolute', left: S.lg, bottom: S.md, gap: 2 }}>
            <Small color={C.inkSoft}>{now.toLocaleDateString(undefined, { month: 'long' })} · your landscape</Small>
            <Text style={[T.hero, { color: C.ink, fontSize: 32 }]}>{avg ?? '—'}{prevAvg != null && avg != null ? <Text style={[T.smallSemi, { color: avg >= prevAvg ? C.mindInk : C.energyInk }]}>  {avg >= prevAvg ? '↑' : '↓'} {Math.abs(avg - prevAvg)} vs last month</Text> : null}</Text>
          </View>
        </MoodField>
      ) : null}
      <View style={{ gap: 6 }}>
        <Row gap={6}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Tiny key={i} color={C.faint} style={{ width: cell, textAlign: 'center' }}>{d}</Tiny>)}</Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: lead }, (_, i) => <View key={`l${i}`} style={{ width: cell, height: cell }} />)}
          {Array.from({ length: nDays }, (_, i) => {
            const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            const d = days.get(date); const isSel = date === sel;
            const bg = d ? C.scale[SCALE_INDEX(d.avg)] : 'transparent';
            const ink = d ? (SCALE_INDEX(d.avg) < 2 ? C.ink : C.bg) : C.faint;
            return (
              <Pressable key={date} accessibilityRole="button" accessibilityLabel={d ? `${date}, score ${d.avg}` : `${date}, no log`} onPress={() => { tap(); setSel(date); }}
                style={{ width: cell, height: cell, borderRadius: 10, backgroundColor: bg, borderWidth: isSel ? 2 : d ? 0 : 1, borderStyle: d || isSel ? 'solid' : 'dashed', borderColor: isSel ? C.ink : C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[T.smallSemi, { color: ink }]}>{i + 1}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Card>
        <Row gap={S.md}>
          {selDay ? <Compass size={64} rings={false} mind={selDay.dims.mind} energy={selDay.dims.energy} body={selDay.dims.body} focus={selDay.dims.focus} /> : null}
          <View style={{ flex: 1, gap: 2 }}>
            <H3>{new Date(sel + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{selDay ? ` · ${selDay.avg}` : ''}</H3>
            <Small color={C.muted}>{selDay ? [...selDay.tags].map(t => CONTEXT_TAGS.find(x => x.id === t)?.label).filter(Boolean).slice(0, 4).join(' · ') || `${selDay.count} log${selDay.count > 1 ? 's' : ''}` : 'Nothing logged this day.'}</Small>
          </View>
        </Row>
      </Card>
    </>
  );
}

// ── Print ─────────────────────────────────────────────────────────────────────
function PrintLayer() {
  const router = useRouter();
  const { moodLogEntries } = useApp();
  const { width } = useWindowDimensions();
  const art = useMoodArt('month');
  const days = useMemo(() => byDay(moodLogEntries), [moodLogEntries]);
  const now = new Date(); const y = now.getFullYear();
  const monthKey = `${y}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ridges = [...days.keys()].filter(d => d.startsWith(monthKey)).length;
  const year = Array.from({ length: 12 }, (_, i) => {
    const key = `${y}-${String(i + 1).padStart(2, '0')}`;
    const ds = [...days.values()].filter(d => d.date.startsWith(key));
    return { i, avg: ds.length ? Math.round(ds.reduce((s, d) => s + d.avg, 0) / ds.length) : null, current: i === now.getMonth(), future: i > now.getMonth() };
  });
  const sealed = year.filter(x => x.avg != null && !x.current && !x.future).length;
  const nextFirst = new Date(y, now.getMonth() + 1, 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!art.traits || !art.input || !art.archetype) return <Card><H3>Your Mood Print grows a ridge every day you log.</H3><Body color={C.muted}>Log a few days and your emotional fingerprint begins to take shape.</Body></Card>;
  return (
    <>
      <View style={{ alignItems: 'center', paddingTop: S.sm }}>
        <MoodPrint ridges={ridges} avg={art.input.score} volatility={art.traits.air} energy={art.input.energy} size={Math.min(width, 480) - 70} />
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Eyebrow color={C.muted}>{now.toLocaleDateString(undefined, { month: 'long' }).toUpperCase()} PRINT · {ridges} {ridges === 1 ? 'RIDGE' : 'RIDGES'} · SEALS {nextFirst.toUpperCase()}</Eyebrow>
        <H2>{art.archetype.name}</H2>
        <Small color={C.muted}>{art.archetype.line}</Small>
      </View>
      <Card style={{ backgroundColor: '#0D0E16' }}>
        <Row style={{ justifyContent: 'space-between' }}><Small color={C.muted}>Ridge warmth</Small><Small>Average {art.input.score}</Small></Row>
        <Row style={{ justifyContent: 'space-between' }}><Small color={C.muted}>Symmetry</Small><Small>{art.traits.air === 'still' ? 'Even days · steady' : art.traits.air === 'breeze' ? 'Some swings' : 'Big swings'}</Small></Row>
        <Row style={{ justifyContent: 'space-between' }}><Small color={C.muted}>Ridge weight</Small><Small>Energy {Math.round(art.input.energy * 100)}</Small></Row>
        <Row style={{ justifyContent: 'space-between' }}><Small color={C.muted}>Ridges</Small><Small>One per day you logged</Small></Row>
      </Card>
      <View style={{ gap: S.sm }}>
        <Row style={{ justifyContent: 'space-between' }}><Small color={C.muted}>Your {y} collection</Small><Small color={C.muted}>{sealed} of 12 sealed</Small></Row>
        <Row gap={4}>
          {year.map(m => (
            <View key={m.i} accessibilityLabel={`Month ${m.i + 1}: ${m.avg != null ? `average ${m.avg}` : m.future ? 'to come' : 'no logs'}`}
              style={{ flex: 1, height: 28, borderRadius: 6, backgroundColor: m.avg != null && !m.current ? C.scale[SCALE_INDEX(m.avg)] : 'transparent', borderWidth: m.current ? 1.5 : m.avg == null ? 1 : 0, borderColor: m.current ? C.mind : 'rgba(255,255,255,0.2)', borderStyle: m.current || m.avg != null ? 'solid' : 'dashed' }} />
          ))}
        </Row>
        <Tiny color={C.faint}>Every log adds a ridge. On the 1st your print is sealed into the year.</Tiny>
      </View>
      <Button label="Make my Wrapped" onPress={() => router.push('/wrapped')} />
    </>
  );
}
