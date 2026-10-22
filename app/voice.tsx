/**
 * Say it — speak (or type) a sentence; we turn it into scores and tags you confirm.
 * Audio is transcribed by Cloudflare Whisper, then deleted on the device. Only words and scores are kept.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { useApp } from '@/hooks/useApp';
import { C, DIM, DIM_KEYS, R, S, T } from '@/ui/tokens';
import { Screen, Row, IconButton, Small, SmallSemi, Body, Card, Eyebrow, Button, H2, tap } from '@/ui/primitives';
import { CONTEXT_TAGS } from '@/constants/moodlog';
import { callEdge } from '@/lib/edge';
import { buildMoodLogEntry, saveMoodLogEntry } from '@/services/moodlog';
import { publishGlow } from '@/lib/circle';
import { writeMoodToHealth } from '@/services/fitness';
import { honestScore, latestEntry } from '@/lib/insight';

type Parsed = { mind: number; energy: number; body: number; focus: number; tags: string[]; note: string; crisis?: boolean };

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const blob = await (await fetch(uri)).blob();
  return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(blob); });
}

export default function Voice() {
  const router = useRouter();
  const { moodLogEntries, setMoodLogEntries } = useApp();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'working' | 'review' | 'typing'>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = async (text: string) => {
    setPhase('working'); setError(null);
    try {
      const p = await callEdge<Parsed>('parse-voice-log', { transcript: text, tagIds: CONTEXT_TAGS.map(t => t.id) });
      setParsed(p); setPhase('review');
    } catch (e: any) {
      setError(e?.message ?? 'Could not read that. Try again or use the sliders.'); setPhase('idle');
    }
  };

  const startRec = async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) { setError('Microphone access is off. You can type it instead.'); setPhase('typing'); return; }
    try { await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); } catch {}
    await recorder.prepareToRecordAsync();
    recorder.record(); tap('medium'); setPhase('recording');
  };

  const stopRec = async () => {
    tap();
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) { setError('Nothing was recorded. Try again.'); setPhase('idle'); return; }
    setPhase('working');
    try {
      const audioBase64 = await uriToBase64(uri);
      const { transcript: t } = await callEdge<{ transcript: string }>('transcribe-voice', { audioBase64, mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a' });
      if (Platform.OS !== 'web') FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      setTranscript(t);
      if (!t?.trim()) { setError("I didn't catch that. Try again, or type it."); setPhase('idle'); return; }
      await parse(t);
    } catch (e: any) {
      setError(e?.message ?? 'Transcription failed.'); setPhase('idle');
    }
  };

  const save = async () => {
    if (!parsed) return;
    const d = { mind: parsed.mind / 100, energy: parsed.energy / 100, body: parsed.body / 100, focus: parsed.focus / 100 };
    const prev = latestEntry(moodLogEntries);
    const entry = buildMoodLogEntry({ mind: d.mind * 2 - 1, body: d.body * 2 - 1, energy: d.energy, focus: d.focus }, parsed.tags[0] ?? '', parsed.tags.slice(1), parsed.note);
    entry.score = honestScore(d);
    entry.transcript = transcript;
    const list = await saveMoodLogEntry(entry);
    writeMoodToHealth(entry);
    setMoodLogEntries(list);
    { const t = list.filter(e => e.date === entry.date); publishGlow(Math.round(t.reduce((s, e) => s + e.score, 0) / t.length)); }
    router.replace({ pathname: '/reveal', params: { prev: prev ? String(prev.score) : '' } });
  };

  return (
    <Screen contentStyle={{ paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Back to sliders" onPress={() => router.replace('/log')}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </IconButton>
        <Small color={C.muted}>Say it</Small>
        <View style={{ width: 44 }} />
      </Row>

      {phase !== 'review' ? (
        <View style={{ alignItems: 'center', gap: S.lg, paddingTop: S.xl }}>
          <H2 style={{ textAlign: 'center' }}>{phase === 'recording' ? "I'm listening…" : phase === 'working' ? 'Reading your words…' : 'Tell me about your day.'}</H2>
          <Body color={C.muted} style={{ textAlign: 'center' }}>Just talk. “Slept badly, work was a grind, but lunch outside helped.”</Body>
          {phase !== 'typing' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={phase === 'recording' ? 'Stop recording' : 'Start recording'}
              disabled={phase === 'working'} onPress={phase === 'recording' ? stopRec : startRec}
              style={({ pressed }) => ({ width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(61,214,198,0.16)', opacity: pressed || phase === 'working' ? 0.7 : 1 })}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: phase === 'recording' ? C.body : C.mind, alignItems: 'center', justifyContent: 'center' }}>
                {phase === 'recording'
                  ? <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: C.bg }} />
                  : <Svg width={34} height={34} viewBox="0 0 24 24"><Rect x={9} y={3} width={6} height={11} rx={3} fill="none" stroke={C.bg} strokeWidth={2} /><Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke={C.bg} strokeWidth={2} strokeLinecap="round" /></Svg>}
              </View>
            </Pressable>
          ) : (
            <View style={{ width: '100%', gap: S.md }}>
              <TextInput value={transcript} onChangeText={setTranscript} multiline placeholder="Type how today's going" placeholderTextColor={C.faint}
                style={[T.body, { color: C.ink, minHeight: 120, backgroundColor: C.surface, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.line, textAlignVertical: 'top' }]} accessibilityLabel="How today's going" />
              <Button label="Read it" onPress={() => parse(transcript)} disabled={!transcript.trim()} />
            </View>
          )}
          {phase === 'idle' ? <Pressable accessibilityRole="button" onPress={() => setPhase('typing')}><SmallSemi color={C.mindInk}>Type it instead</SmallSemi></Pressable> : null}
          {error ? <Small color={C.bodyInk} style={{ textAlign: 'center' }}>{error}</Small> : null}
        </View>
      ) : parsed ? (
        <View style={{ gap: S.lg }}>
          {transcript ? <Body color={C.inkSoft} style={{ fontSize: 18, lineHeight: 27, textAlign: 'center' }}>“{transcript}”</Body> : null}
          <Card>
            <Eyebrow color={C.mindInk}>Here's what I logged</Eyebrow>
            <Row style={{ justifyContent: 'space-between' }}>
              {DIM_KEYS.map(k => (
                <View key={k} style={{ gap: 2, alignItems: 'center', flex: 1 }}>
                  <Small color={DIM[k].ink}>{DIM[k].label}</Small>
                  <Text style={[T.h2, { color: C.ink }]}>{parsed[k]}</Text>
                </View>
              ))}
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {parsed.tags.map(id => <View key={id} style={{ paddingHorizontal: 12, height: 30, borderRadius: R.pill, backgroundColor: C.surface2, justifyContent: 'center' }}><Small>{CONTEXT_TAGS.find(t => t.id === id)?.label ?? id}</Small></View>)}
            </View>
          </Card>
          {parsed.crisis ? (
            <Card tone="outline">
              <Body>It sounds like things are really hard right now. You don't have to carry it alone.</Body>
              <Small color={C.muted}>In the US you can call or text 988 any time to reach the Suicide & Crisis Lifeline. If you're elsewhere, your local emergency number can connect you.</Small>
            </Card>
          ) : null}
          <Button label="Looks right — save" onPress={save} />
          <Button label="Start over" kind="quiet" onPress={() => { setParsed(null); setTranscript(''); setPhase('idle'); }} />
          <Small color={C.faint} style={{ textAlign: 'center' }}>Audio is transcribed, then deleted. Only the words and scores are kept.</Small>
        </View>
      ) : null}
    </Screen>
  );
}
