/**
 * The 3-second log. Pre-filled from your last log; four sliders reshape the
 * compass live; tags are optional; Save goes straight to the Reveal.
 */
import React, { useMemo, useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import { Slider } from '@/ui/Slider';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { C, DIM, DIM_KEYS, DimKey, R, S, T } from '@/ui/tokens';
import { Screen, Row, H1, Small, SmallSemi, Chip, Button, IconButton, Eyebrow, tap } from '@/ui/primitives';
import { Compass } from '@/art/Compass';
import { CONTEXT_TAGS, getScoreLabel } from '@/constants/moodlog';
import { buildMoodLogEntry, saveMoodLogEntry } from '@/services/moodlog';
import { publishGlow } from '@/lib/circle';
import { writeMoodToHealth } from '@/services/fitness';
import { dims01, honestScore, latestEntry, forgivingStreak } from '@/lib/insight';

/** The quick set shown first — the tags people use most. */
const QUICK = ['sleep_good', 'sleep_bad', 'exercise', 'sunlight', 'work_hard', 'social_fun', 'caffeine', 'alcohol', 'anxious', 'calm_content', 'screens', 'quality_family'];
const GROUPS: { id: string; label: string }[] = [
  { id: 'lifestyle', label: 'Lifestyle' }, { id: 'social', label: 'People & work' }, { id: 'environment', label: 'World' }, { id: 'health', label: 'Body & mind' },
];

export default function LogScreen() {
  const router = useRouter();
  const { moodLogEntries, setMoodLogEntries } = useApp();
  const last = latestEntry(moodLogEntries);
  const start = last ? dims01(last) : { mind: 0.6, energy: 0.5, body: 0.6, focus: 0.5 };
  const [v, setV] = useState({
    mind: Math.round(start.mind * 100), energy: Math.round(start.energy * 100),
    body: Math.round(start.body * 100), focus: Math.round(start.focus * 100),
  });
  const [tags, setTags] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const score = honestScore({ mind: v.mind / 100, energy: v.energy / 100, body: v.body / 100, focus: v.focus / 100 });
  const dayNum = useMemo(() => forgivingStreak(moodLogEntries).streak + (forgivingStreak(moodLogEntries).loggedToday ? 0 : 1), [moodLogEntries]);

  const toggle = (id: string) => setTags(t => t.includes(id) ? t.filter(x => x !== id) : t.length >= 6 ? t : [...t, id]);

  const save = async () => {
    setSaving(true);
    try {
      const entry = buildMoodLogEntry(
        { mind: v.mind / 50 - 1, body: v.body / 50 - 1, energy: v.energy / 100, focus: v.focus / 100 },
        tags[0] ?? '', tags.slice(1), note,
      );
      entry.score = score; // honest score: the four dimensions only
      const list = await saveMoodLogEntry(entry);
      writeMoodToHealth(entry);
      setMoodLogEntries(list);
      { const t = list.filter(e => e.date === entry.date); publishGlow(Math.round(t.reduce((s, e) => s + e.score, 0) / t.length)); }
      tap('success');
      router.replace({ pathname: '/reveal', params: { prev: last ? String(last.score) : '' } });
    } finally {
      setSaving(false);
    }
  };

  const tagRow = (ids: string[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
      {ids.map(id => { const t = CONTEXT_TAGS.find(x => x.id === id); return t ? <Chip key={id} label={t.label} on={tags.includes(id)} onPress={() => toggle(id)} /> : null; })}
    </View>
  );

  return (
    <Screen contentStyle={{ paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Close" onPress={() => router.back()}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={2} strokeLinecap="round" /></Svg>
        </IconButton>
        <Small color={C.muted}>{last ? 'Pre-filled from your last log' : 'Your first log'}</Small>
        <IconButton label="Say it instead" onPress={() => router.replace('/voice')}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Rect x={9} y={3} width={6} height={11} rx={3} fill="none" stroke={C.ink} strokeWidth={1.8} /><Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" /></Svg>
        </IconButton>
      </Row>

      <H1 style={{ textAlign: 'center' }}>How are you, right now?</H1>

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Compass mind={v.mind / 100} energy={v.energy / 100} body={v.body / 100} focus={v.focus / 100} size={210} />
        <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={[T.hero, { color: C.ink, fontSize: 34, lineHeight: 38 }]}>{score}</Text>
          <Small color={C.inkSoft}>{getScoreLabel(score)}</Small>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        {DIM_KEYS.map((k: DimKey) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={[T.smallSemi, { color: DIM[k].ink, width: 58 }]}>{DIM[k].label}</Text>
            <Slider value={v[k]} color={DIM[k].color} label={`${DIM[k].label}, ${v[k]} out of 100`}
              onChange={(x) => setV(s => ({ ...s, [k]: x }))} onDone={() => tap()} />
            <Text style={[T.smallSemi, { color: C.ink, width: 30, textAlign: 'right' }]}>{v[k]}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: S.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small color={C.muted}>What's going on? <Small color={C.faint}>optional</Small></Small>
          <Pressable accessibilityRole="button" onPress={() => setShowAll(s => !s)} hitSlop={8}><SmallSemi color={C.mindInk}>{showAll ? 'Fewer' : 'All tags'}</SmallSemi></Pressable>
        </Row>
        {tagRow(QUICK)}
        {showAll ? GROUPS.map(g => (
          <View key={g.id} style={{ gap: S.sm, marginTop: S.sm }}>
            <Eyebrow>{g.label}</Eyebrow>
            {tagRow(CONTEXT_TAGS.filter(t => t.category === g.id && !QUICK.includes(t.id)).map(t => t.id))}
          </View>
        )) : null}
      </View>

      <TextInput
        value={note} onChangeText={setNote} placeholder="A note, if you like" placeholderTextColor={C.faint}
        style={[T.body, { color: C.ink, backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.line }]}
        maxLength={280} multiline accessibilityLabel="Note"
      />

      <Button label={`Save · day ${Math.max(1, dayNum)}`} onPress={save} loading={saving} />
    </Screen>
  );
}
