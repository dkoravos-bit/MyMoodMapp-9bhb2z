/**
 * Settings — you, your plan, your data, your art, your privacy.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { useAuth, getSupabaseClient } from '@/template';
import { C, R, S } from '@/ui/tokens';
import { Screen, Row, IconButton, H1, Body, BodySemi, Small, Card, Divider, Eyebrow, Chip, tap } from '@/ui/primitives';
import { useTone } from '@/lib/useMoodArt';
import { exportMoodCSV } from '@/services/exportReport';
import { requestFitnessPermissions, fetchFitnessDataAndSync } from '@/services/fitness';
import { NotificationScheduler } from '@/components/feature/NotificationScheduler';

function Item({ label, hint, onPress, right }: { label: string; hint?: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}><BodySemi>{label}</BodySemi>{hint ? <Small color={C.muted}>{hint}</Small> : null}</View>
      {right ?? (onPress ? <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg> : null)}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { displayName, subscriptionTier, userRole, moodLogEntries, fitnessPermission, setFitnessPermission, setFitnessData, tempUnit, setTempUnit } = useApp();
  const { tone, setTone } = useTone();
  const [shareGlow, setShareGlow] = useState(true);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getSupabaseClient().from('user_profiles').select('share_glow').eq('id', user.id).maybeSingle().then(({ data }) => { if (data && typeof (data as any).share_glow === 'boolean') setShareGlow((data as any).share_glow); });
  }, [user?.id]);

  const toggleGlow = async (v: boolean) => {
    setShareGlow(v);
    if (user?.id) await getSupabaseClient().from('user_profiles').update({ share_glow: v, ...(v ? {} : { glow: null }) }).eq('id', user.id);
  };
  const connectHealth = async () => {
    const perm = await requestFitnessPermissions(); setFitnessPermission(perm);
    if (perm.granted) setFitnessData(await fetchFitnessDataAndSync(60));
  };

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Back" onPress={() => router.back()}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg></IconButton>
        <View style={{ width: 44 }} />
      </Row>
      <View style={{ gap: 2 }}>
        <H1>{displayName ?? 'You'}</H1>
        <Small color={C.muted}>{user?.email}</Small>
      </View>

      <Card style={{ paddingVertical: S.xs }}>
        <Item label="Plan" hint={subscriptionTier === 'free' ? 'Free — see what Pro adds' : subscriptionTier === 'pro' ? 'Pro' : 'Therapist Pro'} onPress={() => router.push('/plans')} />
        {userRole === 'therapist' || subscriptionTier === 'therapist_pro' ? <><Divider /><Item label="Therapist dashboard" hint="Your clients' trends and alerts" onPress={() => router.push('/therapist-dashboard')} /></> : null}
      </Card>

      <Eyebrow>Your art</Eyebrow>
      <Card>
        <Body>How should your art meet you on heavy days?</Body>
        <Row>{([['mirror', 'Mirror me'], ['calm', 'Calm me'], ['lift', 'Lift me']] as const).map(([id, l]) => <Chip key={id} label={l} on={tone === id} onPress={() => setTone(id)} />)}</Row>
        <Small color={C.faint}>Changes colour and motion only — your numbers stay exactly as you logged them.</Small>
      </Card>

      <Eyebrow>Your data</Eyebrow>
      <Card style={{ paddingVertical: S.xs }}>
        {Platform.OS !== 'web' ? <><Item label={Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} hint={fitnessPermission.granted && fitnessPermission.source !== 'mock' ? 'Connected' : 'Sleep, steps and heart rate'} onPress={connectHealth} /><Divider /></> : null}
        <Item label="Temperature" right={<Row>{(['C', 'F'] as const).map(u => <Chip key={u} label={`°${u}`} on={tempUnit === u} onPress={() => setTempUnit(u)} />)}</Row>} />
        <Divider />
        <Item label="Cycle tracking" hint="See how your cycle lines up with your mood" onPress={() => router.push('/cycle-tracker')} />
        <Divider />
        <Item label="Wellbeing profile" hint="Optional check-in questionnaire" onPress={() => router.push('/quiz')} />
        <Divider />
        <Item label="Export my logs" hint={`${moodLogEntries.length} entries as a CSV file`} onPress={() => exportMoodCSV(moodLogEntries).catch(() => {})} />
      </Card>

      <Eyebrow>Privacy</Eyebrow>
      <Card style={{ paddingVertical: S.xs }}>
        <Item label="Share my glow with my circle" hint="Friends see bright / steady / quiet — never scores or notes" right={<Switch value={shareGlow} onValueChange={toggleGlow} trackColor={{ true: C.mind, false: C.surface2 }} accessibilityLabel="Share my glow with my circle" />} />
        <Divider />
        <Item label="Privacy policy" onPress={() => router.push('/privacy')} />
        <Divider />
        <Item label="Terms" onPress={() => router.push('/terms')} />
      </Card>

      {Platform.OS !== 'web' ? (
        <>
          <Eyebrow>Reminders</Eyebrow>
          <Card style={{ paddingVertical: S.xs }}>
            <Item label="Daily reminders" hint="When MyMoodMapp nudges you to log" onPress={() => setShowNotif(s => !s)} />
          </Card>
          {showNotif ? <View style={{ borderRadius: R.lg, overflow: 'hidden' }}><NotificationScheduler /></View> : null}
        </>
      ) : null}

      <Card style={{ paddingVertical: S.xs }}>
        <Item label="Account" hint="Change email or delete your account" onPress={() => router.push('/account')} />
        <Divider />
        <Item label="Help & support" onPress={() => router.push('/support')} />
        <Divider />
        <Item label="Sign out" onPress={async () => { await logout(); }} right={<View />} />
      </Card>
    </Screen>
  );
}
