/**
 * Plans — Free, Pro, and Therapist Pro. iOS/Android buy through the App Store /
 * Google Play (RevenueCat) only; web uses Stripe checkout. (App Store rule 3.1.1)
 */
import React, { useEffect, useState } from 'react';
import { View, Platform, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '@/hooks/useApp';
import { C, R, S } from '@/ui/tokens';
import { Screen, Row, IconButton, H1, H3, Body, Small, SmallSemi, Card, Button, Eyebrow } from '@/ui/primitives';
import { SUBSCRIPTION_PLANS, startCheckout, openCustomerPortal } from '@/services/subscription';
import { getRevenueCatOfferings, purchaseRevenueCat, restoreRevenueCatPurchases, type RCPackage } from '@/services/revenuecat';

const FEATURES = {
  free: ['Unlimited logging, voice included', 'Your full history and export', 'The Now art and your Month calendar', 'Circle and therapist sharing'],
  pro: ['Every Mapp layer, painted fresh', 'Drivers and 7-day experiments', 'Your rhythm for the day', 'Mood Print collection and Wrapped'],
  therapist: ['Everything in Pro', 'Client dashboard with trends and missed-log alerts', 'Private session notes', 'Questionnaire scores at intake'],
};

export default function Plans() {
  const router = useRouter();
  const { subscriptionTier, refreshSubscription } = useApp();
  const [pkgs, setPkgs] = useState<{ pro: RCPackage | null; therapistPro: RCPackage | null }>({ pro: null, therapistPro: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (Platform.OS !== 'web') getRevenueCatOfferings().then(p => setPkgs(p as any)).catch(() => {}); }, []);

  const buy = async (tier: 'pro' | 'therapist_pro') => {
    setBusy(tier); setMsg(null);
    try {
      if (Platform.OS === 'web') {
        const { error } = await startCheckout(SUBSCRIPTION_PLANS[tier].priceId);
        if (error) setMsg(error); else await refreshSubscription();
        return;
      }
      let pkg = tier === 'pro' ? pkgs.pro : pkgs.therapistPro;
      if (!pkg) { const fresh: any = await getRevenueCatOfferings(); setPkgs(fresh); pkg = tier === 'pro' ? fresh.pro : fresh.therapistPro; }
      if (!pkg) { setMsg("Couldn't reach the store. Check your connection and try again."); return; }
      const { success, error } = await purchaseRevenueCat(pkg);
      if (error) setMsg(error); else if (success) { await refreshSubscription(); setMsg("You're in. Enjoy every layer."); }
    } finally { setBusy(null); }
  };
  const restore = async () => {
    setBusy('restore');
    try { const { restored, error } = await restoreRevenueCatPurchases(); setMsg(error ?? (restored ? 'Purchases restored.' : 'No purchases found for this account.')); if (restored) await refreshSubscription(); }
    finally { setBusy(null); }
  };
  const manage = async () => {
    if (Platform.OS !== 'web') { Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions').catch(() => {}); return; }
    const { error } = await openCustomerPortal(); if (error) setMsg(error);
  };

  const price = (tier: 'pro' | 'therapist_pro') => (Platform.OS !== 'web' ? (tier === "pro" ? pkgs.pro : pkgs.therapistPro)?.product?.priceString : null) ?? SUBSCRIPTION_PLANS[tier].price;
  const List = ({ items }: { items: string[] }) => <View style={{ gap: 6 }}>{items.map(i => <Row key={i} gap={8}><Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={C.mind} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg><Body style={{ flex: 1 }}>{i}</Body></Row>)}</View>;

  return (
    <Screen contentStyle={{ paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton label="Back" onPress={() => router.back()}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg></IconButton>
        <Small color={C.muted}>Your plan: {subscriptionTier === 'free' ? 'Free' : subscriptionTier === 'pro' ? 'Pro' : 'Therapist Pro'}</Small>
        <View style={{ width: 44 }} />
      </Row>
      <H1>See every layer of you.</H1>
      <Card><Eyebrow>Free</Eyebrow><List items={FEATURES.free} /></Card>
      <Card style={{ borderColor: 'rgba(245,181,74,0.45)' }}>
        <Row style={{ justifyContent: 'space-between' }}><Eyebrow color={C.energyInk}>Pro</Eyebrow><H3>{price('pro')}</H3></Row>
        <List items={FEATURES.pro} />
        {subscriptionTier === 'free' ? <Button label="Start Pro" onPress={() => buy('pro')} loading={busy === 'pro'} /> : null}
      </Card>
      <Card style={{ borderColor: 'rgba(61,214,198,0.4)' }}>
        <Row style={{ justifyContent: 'space-between' }}><Eyebrow color={C.mindInk}>Therapist Pro</Eyebrow><H3>{price('therapist_pro')}</H3></Row>
        <List items={FEATURES.therapist} />
        {subscriptionTier !== 'therapist_pro' ? <Button label="Start Therapist Pro" kind="accent" onPress={() => buy('therapist_pro')} loading={busy === 'therapist_pro'} /> : null}
      </Card>
      {msg ? <Small color={C.muted} style={{ textAlign: 'center' }}>{msg}</Small> : null}
      <Row style={{ justifyContent: 'center', gap: S.xl }}>
        {Platform.OS !== 'web' ? <Pressable accessibilityRole="button" onPress={restore}><SmallSemi color={C.muted}>Restore purchases</SmallSemi></Pressable> : null}
        {subscriptionTier !== 'free' ? <Pressable accessibilityRole="button" onPress={manage}><SmallSemi color={C.muted}>Manage subscription</SmallSemi></Pressable> : null}
      </Row>
      <Small color={C.faint} style={{ textAlign: 'center' }}>Subscriptions renew monthly until cancelled. Cancel any time in your {Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play' : 'account'} settings.</Small>
    </Screen>
  );
}
