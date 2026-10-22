import React from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { C } from './tokens';
import { Card, Eyebrow, H3, Body, Button } from './primitives';

export function useIsPro() {
  const { subscriptionTier } = useApp();
  return subscriptionTier === 'pro' || subscriptionTier === 'therapist_pro';
}

/** Shows children for Pro users; a calm, specific upsell for everyone else. */
export function ProGate({ children, title, text }: { children: React.ReactNode; title: string; text: string }) {
  const router = useRouter();
  if (useIsPro()) return <>{children}</>;
  return (
    <Card style={{ borderColor: 'rgba(245,181,74,0.4)' }}>
      <Eyebrow color={C.energyInk}>Pro</Eyebrow>
      <H3>{title}</H3>
      <Body color={C.muted}>{text}</Body>
      <Button label="See Pro" onPress={() => router.push('/plans')} />
    </Card>
  );
}
