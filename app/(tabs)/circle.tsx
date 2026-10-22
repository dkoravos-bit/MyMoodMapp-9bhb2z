/**
 * Circle — your people see a glow, never your scores or notes. Plus Care: your therapist.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, TextInput, Share } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { useAuth } from '@/template';
import { C, R, S, T } from '@/ui/tokens';
import { Screen, H1, Body, Small, SmallSemi, BodySemi, Card, Row, Eyebrow, Button, tap } from '@/ui/primitives';
import { loadCircle, CirclePerson, addBuddy } from '@/lib/circle';
import { getMyTherapistLinks } from '@/services/therapist';
import type { TherapistClient } from '@/services/therapist';

const GLOW = { bright: { color: C.energy, label: 'Bright today', ink: C.energyInk }, steady: { color: C.mind, label: 'Steady', ink: C.mindInk }, quiet: { color: C.focus, label: 'A quiet day', ink: C.focusInk } } as const;

function Orb({ p }: { p: CirclePerson }) {
  const g = p.glow ? GLOW[p.glow] : null;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      {g ? (
        <Svg width={64} height={64} style={{ position: 'absolute' }}>
          <Defs><RadialGradient id={`o${p.rowId}`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={g.color} stopOpacity="1" /><Stop offset="0.55" stopColor={g.color} stopOpacity="0.3" /><Stop offset="0.75" stopColor={g.color} stopOpacity="0" /></RadialGradient></Defs>
          <SvgCircle cx={32} cy={32} r={32} fill={`url(#o${p.rowId})`} />
        </Svg>
      ) : <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.lineStrong }} />}
      <Text style={[T.h3, { color: g ? C.bg : C.muted }]}>{p.name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export default function CircleTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [people, setPeople] = useState<CirclePerson[] | null>(null);
  const [therapists, setTherapists] = useState<TherapistClient[]>([]);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user?.id) return;
    loadCircle(user.id).then(setPeople).catch(() => setPeople([]));
    getMyTherapistLinks(user.id, user.email ?? undefined).then(setTherapists).catch(() => setTherapists([]));
  }, [user?.id]);
  useFocusEffect(load);

  const quiet = (people ?? []).filter(p => p.status === 'active' && (p.daysQuiet ?? 0) >= 2);

  const nudge = async (p: CirclePerson, kind: 'nudge' | 'heart') => {
    tap();
    const text = kind === 'nudge' ? `Hey ${p.name.split(' ')[0]} — thinking of you. Want to check in today?` : `Thinking of you, ${p.name.split(' ')[0]}.`;
    try { await Share.share({ message: text }); } catch {}
  };

  const invite = async () => {
    if (!user?.id || !email.trim()) return;
    try { await addBuddy(user.id, email, name || email.split('@')[0]); setMsg(`Invite sent to ${email}.`); setInviting(false); setEmail(''); setName(''); load(); }
    catch (e: any) { setMsg(e?.message ?? 'Could not invite.'); }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Your circle</H1>
        <Pressable accessibilityRole="button" onPress={() => { tap(); setInviting(v => !v); }} style={{ height: 40, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center' }}>
          <SmallSemi>{inviting ? 'Cancel' : 'Invite'}</SmallSemi>
        </Pressable>
      </Row>

      {inviting ? (
        <Card style={{ gap: S.md }}>
          <Body>Invite a friend or partner. They'll see your glow — never your scores, notes or tags.</Body>
          <TextInput value={name} onChangeText={setName} placeholder="Their name" placeholderTextColor={C.faint} accessibilityLabel="Their name"
            style={[T.body, { color: C.ink, backgroundColor: C.surface2, borderRadius: R.md, paddingHorizontal: S.lg, height: 48 }]} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Their email" placeholderTextColor={C.faint} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Their email"
            style={[T.body, { color: C.ink, backgroundColor: C.surface2, borderRadius: R.md, paddingHorizontal: S.lg, height: 48 }]} />
          <Button label="Send invite" onPress={invite} disabled={!email.includes('@')} />
        </Card>
      ) : null}
      {msg ? <Small color={C.muted}>{msg}</Small> : null}

      {people && people.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {people.map(p => (
            <View key={p.rowId} style={{ width: '31.5%', backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: S.lg, alignItems: 'center', gap: 6 }}
              accessible accessibilityLabel={`${p.name}: ${p.status === 'pending' ? 'invite pending' : p.glow ? GLOW[p.glow].label : 'not checked in yet today'}`}>
              <Orb p={p} />
              <SmallSemi numberOfLines={1}>{p.name.split(' ')[0]}</SmallSemi>
              <Small color={p.glow ? GLOW[p.glow].ink : C.muted}>{p.status === 'pending' ? 'Invite pending' : p.glow ? GLOW[p.glow].label : 'Not yet today'}</Small>
            </View>
          ))}
        </View>
      ) : people ? (
        <Card><Body color={C.muted}>Add a friend, partner or family member. You'll each see a gentle glow when the other checks in — and can send a nudge when someone goes quiet.</Body></Card>
      ) : null}

      {quiet.map(p => (
        <Card key={`q${p.rowId}`}>
          <Body>{p.name.split(' ')[0]} hasn't checked in for {p.daysQuiet} days.</Body>
          <Row>
            <Button label="Send a nudge" onPress={() => nudge(p, 'nudge')} style={{ height: 42, flex: 1 }} />
            <Button label="Thinking of you" kind="ghost" onPress={() => nudge(p, 'heart')} style={{ height: 42, flex: 1 }} />
          </Row>
        </Card>
      ))}

      <View style={{ gap: S.sm }}>
        <Eyebrow>Care</Eyebrow>
        {therapists.length ? therapists.map(t => (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => { tap(); router.push({ pathname: '/share-care', params: { link: t.id } }); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: 'rgba(61,214,198,0.3)' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <BodySemi>Your therapist</BodySemi>
              <Small color={C.muted}>{t.status === 'pending' ? 'Invite waiting for you — tap to review' : 'Choose what they see'}</Small>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        )) : (
          <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/share-care'); }}
            style={{ backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, gap: 2 }}>
            <BodySemi>Share with a therapist</BodySemi>
            <Small color={C.muted}>Send a report before your next session — you choose exactly what's in it.</Small>
          </Pressable>
        )}
      </View>

      <Small color={C.faint}>Friends see a glow — never your scores, notes or tags. You can turn the glow off in Settings.</Small>
    </Screen>
  );
}
