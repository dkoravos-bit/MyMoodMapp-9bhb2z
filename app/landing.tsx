// @ts-nocheck
/**
 * MyMoodMapp — Landing Page (Reimagined)
 * Premium dark marketing page — full-bleed hero image, immersive sections.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Platform, Linking, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:           '#050508',
  card:         '#0E0E14',
  cardHover:    '#141420',
  border:       'rgba(255,255,255,0.07)',
  borderMed:    'rgba(255,255,255,0.12)',
  primary:      '#F5A623',
  primaryDim:   'rgba(245,166,35,0.12)',
  primaryMid:   'rgba(245,166,35,0.25)',
  secondary:    '#7C6FF7',
  teal:         '#2DD4C0',
  rose:         '#FF4466',
  purple:       '#A78BFA',
  white:        '#FFFFFF',
  white60:      'rgba(255,255,255,0.60)',
  white35:      'rgba(255,255,255,0.35)',
  white15:      'rgba(255,255,255,0.15)',
  white07:      'rgba(255,255,255,0.07)',
  green:        '#34D399',
};

const MOODPRINT    = require('@/assets/moodprint-icon.png');
const DARK_MAPP    = { uri: 'https://cdn-ai.onspace.ai/onspace/files/DB3YfdGqKwFTxrBSfaGMLH/dark_05_mapp.jpg' };
const DARK_DASH    = { uri: 'https://cdn-ai.onspace.ai/onspace/files/kgVXndHKcmab9bb7uKdVjz/dark_01_dashboard.jpg' };
const APP_STORE    = 'https://apps.apple.com/app/mymoodmapp/id000000000';
const PLAY_STORE   = 'https://play.google.com/store/apps/details?id=com.mymoodmapp';

// ─── Layout ───────────────────────────────────────────────────────────────────
function useLayout() {
  const [w, setW] = useState(() => Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub?.remove();
  }, []);
  return { w, isMobile: w < 640, isTablet: w >= 640 && w < 1080, isDesktop: w >= 1080 };
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: 'mood',             color: C.primary,   title: 'Smart Mood Logging',       desc: 'Log in 10 seconds — body, mind, energy + tags. Emoji, voice notes, selfie capture.' },
  { icon: 'psychology',       color: C.secondary, title: 'AI Wellness Reports',       desc: 'Daily, weekly and monthly reports powered by mood, fitness, weather, cycle and cosmic data.' },
  { icon: 'bar-chart',        color: C.teal,      title: 'Pattern Intelligence',      desc: 'Discover which tags, times and events move your score. Time-of-day deep-dives.' },
  { icon: 'fitness-center',   color: '#7C83FF',   title: 'Health Data Fusion',        desc: 'Steps, sleep, heart rate from Apple Health & Google Fit — synced to the web app.' },
  { icon: 'wb-sunny',         color: '#FFD166',   title: 'Weather Correlation',       desc: 'Auto-correlates mood with local weather, UV index, pressure and humidity.' },
  { icon: 'water-drop',       color: C.rose,      title: 'Cycle Tracking',            desc: 'Period tracking with phase-aware mood correlation across all four phases.' },
  { icon: 'explore',          color: C.secondary, title: 'Mapp Visualisation',        desc: 'Six-layer AI canvas: Today, Week, Month, Drivers, Forecast and Mood Print.' },
  { icon: 'auto-awesome',     color: C.purple,    title: 'Vibe Cards',                desc: 'AI-generated daily art cards fusing your mood score with visual metaphors.' },
  { icon: 'stars',            color: '#F59E0B',   title: 'Astrology & Schumann',      desc: 'Sun sign, moon phase, planetary retrogrades and live Schumann resonance.' },
  { icon: 'music-note',       color: C.teal,      title: '24 Ambient Soundscapes',    desc: '24 recorded soundscapes — rain, ocean, forest, fire, urban, space. Gapless loops.' },
  { icon: 'waves',            color: C.green,     title: '28+ Healing Frequencies',   desc: '28+ solfeggio tones, binaural beats and brainwave frequencies — all on-device.' },
  { icon: 'self-improvement', color: C.purple,    title: '19 Guided Meditations',     desc: '19 curated sessions — sleep, anxiety, mindfulness and focus.' },
  { icon: 'games',            color: '#F472B6',   title: '7 Stress Relief Games',     desc: 'Breathing Bubble, Bubble Wrap, Zen Sand, 2048, Dot Mandala, Pixel Art, MoodBeat.' },
  { icon: 'group',            color: C.primary,   title: 'Accountability Buddies',    desc: 'Connect with friends or therapist. Get notified when either misses a daily log.' },
  { icon: 'analytics',        color: C.secondary, title: 'Therapist Dashboard',       desc: 'Client dashboard, 14-day trends, overdue alerts, intake scoring, private notes.' },
  { icon: 'cloud-sync',       color: C.teal,      title: 'Cross-Platform Sync',       desc: 'Seamless sync between iPhone, Android and web. Data encrypted end-to-end.' },
  { icon: 'notifications',    color: '#FFD166',   title: 'Smart Reminders',           desc: 'Customisable daily reminders with Apple Watch quick-log and snooze actions.' },
  { icon: 'description',      color: '#F472B6',   title: 'Export & Reports',          desc: 'Full mood CSV and wellness PDF export. Includes intake questionnaire scores.' },
];

const PHONE_SHOTS = [
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/kgVXndHKcmab9bb7uKdVjz/dark_01_dashboard.jpg',  label: 'Dashboard',    theme: 'Dark' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/QyZi7SHaDtxZMGBKUKJKmG/dark_02_log.jpg',         label: "Log",          theme: 'Dark' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/huXmgFBoTW5uxM9bEjH4PW/dark_03_patterns.jpg',    label: 'Patterns',     theme: 'Dark' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/j8V63eSB83yCWuCTxCaoHQ/dark_04_moodlab.jpg',     label: 'Mood Lab',     theme: 'Dark' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/DB3YfdGqKwFTxrBSfaGMLH/dark_05_mapp.jpg',         label: 'Mapp',         theme: 'Dark' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/kjNYqYtUwtcH5J3R3Woo2n/light_01_dashboard.jpg',  label: 'Dashboard',    theme: 'Light' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/HHxDSaffYHRvfAfJX46EsR/light_02_log.jpg',         label: "Log",          theme: 'Light' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/HRbSWKp6zBkKjxh6f6SwnT/light_03_patterns.jpg',   label: 'Patterns',     theme: 'Light' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/8KMRbVPw3s25N3YPGK9UNe/light_04_moodlab.jpg',    label: 'Mood Lab',     theme: 'Light' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/MyQGw2HE8vAYLvnhfsHmCa/light_05_mapp.jpg',        label: 'Mapp',         theme: 'Light' },
];

const WEB_SHOTS = [
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/GqdHxjkJryK7j9dK28yAGw/ipad_01_dashboard.jpg',  label: 'Dashboard' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/4Xx6iqS7r9Eamk7hMAZKQR/ipad_02_log.jpg',         label: "Today's Log" },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/Ng3Lsg4cwXukAi6uKHTLJr/ipad_03_patterns.jpg',    label: 'Patterns' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/S3mPeXsUe9HTFMqWnVyaep/ipad_04_moodlab.jpg',     label: 'Mood Lab' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/Ea6CEp4ULLLRyT4dvY6eQZ/ipad_05_mapp.jpg',         label: 'Mapp' },
  { uri: 'https://cdn-ai.onspace.ai/onspace/files/BPeocBPVMDVLzkz3vNccyX/ipad_06_me.jpg',           label: 'Me' },
];

const TESTIMONIALS = [
  { quote: "I finally understand why Mondays wreck me — it's not the meetings, it's the weather plus low sleep.", author: 'Alex M.', role: 'Pro user', rating: 5 },
  { quote: 'The AI reports are genuinely insightful. My therapist now uses them to prep for our sessions.',         author: 'Jordan K.', role: 'Therapist Pro', rating: 5 },
  { quote: 'Cycle phase tracking + mood correlation changed everything for me. This app is a game-changer.',       author: 'Sofia R.', role: 'Pro user', rating: 5 },
  { quote: 'The Sound Lab alone is worth it. The breathing bubble replaced my Xanax for mild anxiety.',            author: 'Marcus T.', role: 'Pro user', rating: 5 },
  { quote: "Having a dashboard of all my clients' check-ins saves me 30 minutes before every session.",            author: 'Dr. Patel', role: 'Therapist Pro', rating: 5 },
  { quote: 'The Mapp visualisation is beautiful. I look at it every morning like a forecast for my soul.',         author: 'Lily C.', role: 'Pro user', rating: 5 },
];

const PRICING = [
  {
    tier: 'Free', price: '$0', period: '', accent: C.white35, icon: 'person',
    features: ['Unlimited mood logs', '30-day history', '1 accountability buddy', '15 min soundscape sessions', 'Breathing Bubble + Bubble Wrap', 'Pattern previews'],
  },
  {
    tier: 'Pro', price: '$3.99', period: '/mo', accent: C.primary, icon: 'star', highlight: true, trial: true,
    features: ['Everything in Free', 'AI wellness reports (daily / weekly / monthly)', 'Full mood history & CSV export', 'All 24 soundscapes — unlimited', 'All 28+ healing frequencies', 'All 19 guided meditations', 'All 7 stress relief games', 'Unlimited accountability buddies', 'Tag & time-of-day pattern deep-dives', 'Mapp AI canvas — all 6 layers', 'Wellness PDF export'],
  },
  {
    tier: 'Therapist Pro', price: '$9.99', period: '/mo', accent: C.secondary, icon: 'psychology', trial: true,
    features: ['Everything in Pro', 'Unlimited client slots', 'Full client dashboard', 'Invite-link onboarding', '14-day mood trend per client', 'Overdue log alerts', 'Private session notes', 'Client intake scores (PHQ-9, GAD-7)', 'Access to client AI reports'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ alignSelf: 'center', backgroundColor: color + '18', borderRadius: 99, borderWidth: 1, borderColor: color + '35', paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 0.6, includeFontPadding: false }}>{label}</Text>
    </View>
  );
}
function SectionHead({ title, sub, isMobile }: { title: string; sub?: string; isMobile: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, marginBottom: isMobile ? 28 : 44, paddingHorizontal: 8 }}>
      <Text style={{ fontSize: isMobile ? 22 : 32, fontWeight: '800', color: C.white, textAlign: 'center', lineHeight: isMobile ? 30 : 42, includeFontPadding: false }}>{title}</Text>
      {sub ? <Text style={{ fontSize: isMobile ? 14 : 16, color: C.white60, textAlign: 'center', lineHeight: isMobile ? 21 : 25, maxWidth: 560, includeFontPadding: false }}>{sub}</Text> : null}
    </View>
  );
}

// ─── Native Hero ─────────────────────────────────────────────────────────────
function NativeHero({ w, isMobile, isTablet, isDesktop, pad, maxW, onWeb, onAppStore, onPlayStore }: any) {
  // Phone mockup width
  const phoneW = isMobile ? Math.min(w * 0.44, 170) : isTablet ? 200 : 240;
  const phoneH = phoneW * (16 / 9);

  // Mini bar chart data
  const bars = [38, 62, 45, 78, 55, 82, 70];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const barMaxH = 36;
  const barW = isMobile ? 9 : 11;

  return (
    <View style={{ width: '100%', backgroundColor: '#050508', overflow: 'hidden' }}>

      {/* ── Background glow orbs ─── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/* Deep teal glow — right */}
        <View style={{
          position: 'absolute', right: isMobile ? -80 : 0, top: isMobile ? 20 : -20,
          width: isMobile ? 280 : 420, height: isMobile ? 280 : 420,
          borderRadius: 999,
          backgroundColor: 'rgba(45,212,192,0.07)',
          // blur effect via nested semi-transparent views
        }} />
        <View style={{
          position: 'absolute', right: isMobile ? -40 : 40, top: isMobile ? 40 : 0,
          width: isMobile ? 200 : 300, height: isMobile ? 200 : 300,
          borderRadius: 999,
          backgroundColor: 'rgba(45,212,192,0.09)',
        }} />
        {/* Purple glow — left */}
        <View style={{
          position: 'absolute', left: isMobile ? -60 : -40, top: isMobile ? 60 : 40,
          width: isMobile ? 200 : 320, height: isMobile ? 200 : 320,
          borderRadius: 999,
          backgroundColor: 'rgba(124,111,247,0.08)',
        }} />
        {/* Amber glow — bottom-centre */}
        <View style={{
          position: 'absolute',
          left: isMobile ? w * 0.2 : w * 0.35,
          bottom: isMobile ? 80 : 60,
          width: isMobile ? 180 : 260,
          height: isMobile ? 100 : 140,
          borderRadius: 999,
          backgroundColor: 'rgba(245,166,35,0.06)',
        }} />
      </View>

      {/* ── Main content row ─── */}
      <View style={{
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        paddingHorizontal: pad,
        paddingTop: isMobile ? 36 : 56,
        paddingBottom: isMobile ? 28 : 48,
        maxWidth: maxW,
        width: '100%',
        alignSelf: 'center',
        gap: isMobile ? 32 : 48,
      }}>

        {/* LEFT — copy */}
        <View style={{ flex: isMobile ? undefined : 1, gap: isMobile ? 14 : 18 }}>
          {/* AI badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(245,166,35,0.10)',
            borderRadius: 99, borderWidth: 1, borderColor: 'rgba(245,166,35,0.28)',
            paddingHorizontal: 12, paddingVertical: 5,
          }}>
            <MaterialIcons name="auto-awesome" size={11} color={C.primary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 0.4, includeFontPadding: false }}>AI-Powered Wellbeing Intelligence</Text>
          </View>

          {/* Headline */}
          <View style={{ gap: 0 }}>
            <Text style={{
              fontSize: isMobile ? 34 : isTablet ? 44 : 56,
              fontWeight: '900',
              color: C.white,
              lineHeight: isMobile ? 40 : isTablet ? 52 : 64,
              includeFontPadding: false,
            }}>Know your vibe.</Text>
            <Text style={{
              fontSize: isMobile ? 34 : isTablet ? 44 : 56,
              fontWeight: '900',
              color: C.primary,
              lineHeight: isMobile ? 42 : isTablet ? 54 : 66,
              includeFontPadding: false,
            }}>Understand yourself.</Text>
          </View>

          {/* Sub */}
          <Text style={{
            fontSize: isMobile ? 14 : 16,
            color: 'rgba(255,255,255,0.72)',
            lineHeight: isMobile ? 22 : 26,
            maxWidth: 480,
            includeFontPadding: false,
          }}>
            MyMoodMapp fuses mood logging, AI insights, fitness data,{isMobile ? ' ' : '\n'}weather, astrology, cycle tracking and healing soundscapes{isMobile ? ' ' : '\n'}into one intelligent wellbeing picture.
          </Text>

          {/* Feature pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Mood Logging', 'Emotional Mapping', 'Healing Sounds', 'AI Insights'].map(pill => (
              <View key={pill} style={{
                borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', includeFontPadding: false }}>{pill}</Text>
              </View>
            ))}
          </View>

          {/* Score widget */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
            backgroundColor: 'rgba(15,15,22,0.9)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
            paddingHorizontal: 14, paddingVertical: 10,
          }}>
            {/* Amber orb */}
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,166,35,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245,166,35,0.30)' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, opacity: 0.9 }} />
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, lineHeight: 26, includeFontPadding: false }}>74</Text>
              <Text style={{ fontSize: 11, color: C.white35, fontWeight: '600', includeFontPadding: false }}>Good</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 }} />
            <View style={{ gap: 4 }}>
              {[{ l: 'Mind', v: 72, c: C.secondary }, { l: 'Energy', v: 80, c: C.teal }].map(d => (
                <View key={d.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 10, color: C.white35, width: 36, includeFontPadding: false }}>{d.l}</Text>
                  <View style={{ width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${d.v}%` as any, height: '100%', backgroundColor: d.c, borderRadius: 2 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* CTAs — mobile only inline here; desktop in dedicated strip below */}
          {isMobile && (
            <View style={{ gap: 10, width: '100%', marginTop: 4 }}>
              <Pressable onPress={onWeb} style={({ pressed }) => [st.ctaPrimary, { justifyContent: 'center' }, pressed && { opacity: 0.88 }]}>
                <MaterialIcons name="language" size={18} color="#000" />
                <Text style={st.ctaPrimaryText}>Use Web App — Free</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={onAppStore} style={({ pressed }) => [st.ctaGhost, { flex: 1, justifyContent: 'center' }, pressed && { opacity: 0.75 }]}>
                  <MaterialIcons name="apple" size={17} color={C.white} />
                  <Text style={st.ctaGhostText}>App Store</Text>
                </Pressable>
                <Pressable onPress={onPlayStore} style={({ pressed }) => [st.ctaGhost, { flex: 1, justifyContent: 'center', borderColor: C.teal + '55' }, pressed && { opacity: 0.75 }]}>
                  <MaterialIcons name="android" size={17} color={C.teal} />
                  <Text style={[st.ctaGhostText, { color: C.teal }]}>Google Play</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {['✓ 30-day free trial', '✓ No credit card', '✓ Cancel anytime'].map(t => (
                  <Text key={t} style={{ fontSize: 11, color: C.teal, fontWeight: '600', includeFontPadding: false }}>{t}</Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* RIGHT — phone mockup */}
        <View style={{ alignItems: 'center', position: 'relative' }}>
          {/* Glow behind phone */}
          <View style={{
            position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
            borderRadius: 999,
            backgroundColor: 'rgba(45,212,192,0.12)',
          }} />

          {/* Phone frame */}
          <View style={{
            width: phoneW, height: phoneH,
            borderRadius: isMobile ? 28 : 36,
            backgroundColor: '#080810',
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)',
            overflow: 'hidden',
            shadowColor: '#2DD4C0',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 32,
            elevation: 20,
          }}>
            <Image
              source={DARK_MAPP}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              contentPosition="top"
              transition={300}
            />
          </View>

          {/* Floating score badge */}
          <View style={{
            position: 'absolute',
            bottom: isMobile ? 28 : 36,
            left: isMobile ? -14 : -28,
            backgroundColor: 'rgba(8,8,18,0.92)',
            borderRadius: 12,
            borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)',
            padding: 10,
            alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, lineHeight: 24, includeFontPadding: false }}>74</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: C.primary, includeFontPadding: false }}>GOOD</Text>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
              {[{ l: 'M', c: C.secondary }, { l: 'F', c: C.teal }, { l: 'B', c: C.primary }].map(d => (
                <View key={d.l} style={{ backgroundColor: d.c + '25', borderRadius: 4, borderWidth: 1, borderColor: d.c + '50', paddingHorizontal: 4, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: d.c, includeFontPadding: false }}>{d.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Floating mini log widget */}
          {!isMobile && (
            <View style={{
              position: 'absolute', top: 24, right: -40,
              backgroundColor: 'rgba(8,8,18,0.90)',
              borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
              padding: 10, gap: 4, minWidth: 130,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: C.white35, letterSpacing: 0.8, includeFontPadding: false }}>LOG ENTRY</Text>
              {[{ l: 'God', v: '4.6%', c: C.teal }, { l: 'Gay Miry', v: '24.2%', c: C.primary }, { l: 'App Entry', v: '', c: C.white35 }].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: row.c }} />
                  <Text style={{ fontSize: 10, color: C.white60, flex: 1, includeFontPadding: false }}>{row.l}</Text>
                  {row.v ? <Text style={{ fontSize: 10, color: row.c, fontWeight: '700', includeFontPadding: false }}>{row.v}</Text> : <MaterialIcons name="chevron-right" size={12} color={C.white35} />}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── Mini dashboard widgets row ─── */}
      <View style={{
        width: '100%', paddingHorizontal: pad,
        paddingBottom: isMobile ? 28 : 36,
        maxWidth: maxW, alignSelf: 'center',
      }}>
        <View style={{ flexDirection: 'row', gap: isMobile ? 8 : 12 }}>

          {/* 7-Day Trends card */}
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(12,12,20,0.95)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            padding: isMobile ? 10 : 14,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.white, includeFontPadding: false }}>7-Day Trends</Text>
              <View style={{ backgroundColor: 'rgba(245,166,35,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: C.primary, fontWeight: '700', includeFontPadding: false }}>Patterns</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: isMobile ? 3 : 4, height: barMaxH + 14 }}>
              {bars.map((h, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  <View style={{
                    width: '100%', height: Math.round(h / 100 * barMaxH),
                    backgroundColor: i === 6 ? C.primary : i === 5 ? C.secondary : 'rgba(255,255,255,0.18)',
                    borderRadius: 3,
                  }} />
                  <Text style={{ fontSize: 8, color: C.white35, includeFontPadding: false }}>{days[i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Log Entry card */}
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(12,12,20,0.95)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            padding: isMobile ? 10 : 14,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.white, includeFontPadding: false }}>Log Entry</Text>
              <MaterialIcons name="chevron-right" size={14} color={C.white35} />
            </View>
            {[{ l: 'God', v: '4.6%', c: C.teal }, { l: 'Gay Miry', v: '24.2%', c: C.primary }, { l: 'App Entry', v: '', c: C.white35 }, { l: 'Mood Lab', v: '', c: C.white35 }].map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: row.v ? row.c : 'rgba(255,255,255,0.15)' }} />
                  <Text style={{ fontSize: isMobile ? 10 : 11, color: C.white60, includeFontPadding: false }}>{row.l}</Text>
                </View>
                {row.v
                  ? <Text style={{ fontSize: isMobile ? 10 : 11, color: row.c, fontWeight: '700', includeFontPadding: false }}>{row.v}</Text>
                  : <MaterialIcons name="chevron-right" size={10} color={C.white35} />}
              </View>
            ))}
          </View>

          {/* Score card */}
          <View style={{
            width: isMobile ? 90 : 110,
            backgroundColor: 'rgba(12,12,20,0.95)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            padding: isMobile ? 10 : 14,
            alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <Text style={{ fontSize: isMobile ? 24 : 30, fontWeight: '900', color: C.white, includeFontPadding: false }}>74</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: C.primary, letterSpacing: 0.5, includeFontPadding: false }}>GOOD</Text>
            <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[{ l: 'Mind', c: C.secondary }, { l: 'Focus', c: C.teal }, { l: 'Body', c: C.primary }].map(d => (
                <View key={d.l} style={{ backgroundColor: d.c + '20', borderRadius: 4, borderWidth: 1, borderColor: d.c + '45', paddingHorizontal: 4, paddingVertical: 2 }}>
                  <Text style={{ fontSize: isMobile ? 7 : 8, fontWeight: '800', color: d.c, includeFontPadding: false }}>{d.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── Desktop CTAs ─── */}
      {!isMobile && (
        <View style={{ width: '100%', paddingHorizontal: pad, paddingBottom: 48, maxWidth: maxW, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pressable onPress={onWeb} style={({ pressed }) => [st.ctaPrimary, pressed && { opacity: 0.88 }]}>
              <MaterialIcons name="language" size={18} color="#000" />
              <Text style={st.ctaPrimaryText}>Use Web App — Free</Text>
            </Pressable>
            <Pressable onPress={onAppStore} style={({ pressed }) => [st.ctaGhost, pressed && { opacity: 0.75 }]}>
              <MaterialIcons name="apple" size={18} color={C.white} />
              <Text style={st.ctaGhostText}>App Store</Text>
            </Pressable>
            <Pressable onPress={onPlayStore} style={({ pressed }) => [st.ctaGhost, { borderColor: C.teal + '55' }, pressed && { opacity: 0.75 }]}>
              <MaterialIcons name="android" size={18} color={C.teal} />
              <Text style={[st.ctaGhostText, { color: C.teal }]}>Google Play</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 16, marginLeft: 8, flexWrap: 'wrap' }}>
              {['✓ 30-day free trial', '✓ No credit card', '✓ Cancel anytime'].map(t => (
                <Text key={t} style={{ fontSize: 12, color: C.teal, fontWeight: '600', includeFontPadding: false }}>{t}</Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Bottom edge fade into page */}
      <LinearGradient
        colors={['transparent', 'rgba(5,5,8,0.6)', '#050508']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 }}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingScreen() {
  const router = useRouter();
  const { w, isMobile, isTablet, isDesktop } = useLayout();
  const pad = isMobile ? 20 : isDesktop ? 48 : 32;
  const maxW = 1200;

  // Entrance fade
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>

        {/* ══════════════════════════ NAV ══════════════════════════════════ */}
        <View style={[st.nav, { width: '100%', paddingHorizontal: pad }]}>
          <View style={[st.navRow, { maxWidth: maxW, width: '100%', alignSelf: 'center' }]}>
            {/* Brand */}
            <View style={st.navBrand}>
              <Image source={MOODPRINT} style={st.navIcon} contentFit="cover" />
              <Text style={[st.navName, isMobile && { fontSize: 15 }]}>MyMoodMapp</Text>
            </View>
            {/* Links + CTA */}
            <View style={st.navActions}>
              {!isMobile && (
                <View style={st.navLinks}>
                  {['Features', 'Screenshots', 'Pricing'].map(l => (
                    <Text key={l} style={st.navLink}>{l}</Text>
                  ))}
                </View>
              )}
              {!isMobile && (
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.navGhost, pressed && { opacity: 0.7 }]}>
                  <Text style={st.navGhostText}>Sign in</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.navBtn, isMobile && { paddingHorizontal: 14, paddingVertical: 8 }, pressed && { opacity: 0.85 }]}>
                <Text style={[st.navBtnText, isMobile && { fontSize: 13 }]}>Try free</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ══════════════════════════ RIBBON ═══════════════════════════════ */}
        <View style={[st.ribbon, { width: '100%', paddingHorizontal: pad }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Text style={st.ribbonText}>🎉 <Text style={{ fontWeight: '800', color: C.primary }}>30-day free trial</Text>{isMobile ? '' : ' on Pro & Therapist Pro'} — no card required</Text>
            <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.ribbonBtn, pressed && { opacity: 0.8 }]}>
              <Text style={st.ribbonBtnText}>Start free →</Text>
            </Pressable>
          </View>
        </View>

        {/* ══════════════════════════ HERO — fully native ═══════════════════════ */}
        <Animated.View style={{ width: '100%', opacity: fade }}>
          <NativeHero
            w={w}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
            pad={pad}
            maxW={maxW}
            onWeb={() => router.push('/login')}
            onAppStore={() => Linking.openURL(APP_STORE)}
            onPlayStore={() => Linking.openURL(PLAY_STORE)}
          />
        </Animated.View>

        {/* ══════════════════════════ STATS BAR ════════════════════════════ */}
        <View style={[st.statsBar, { width: '100%', paddingHorizontal: pad }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { v: '10s',    l: 'Avg log time'  },
              { v: '6+',     l: 'Data layers'   },
              { v: '24',     l: 'Soundscapes'   },
              { v: '28+',    l: 'Frequencies'   },
              { v: '7',      l: 'Stress games'  },
              { v: '30-day', l: 'Free trial'    },
            ].map((s, i) => (
              <View key={i} style={[st.statItem, isMobile && { width: '33.33%' }]}>
                <Text style={[st.statVal, isMobile && { fontSize: 20 }]}>{s.v}</Text>
                <Text style={[st.statLbl, isMobile && { fontSize: 10 }]}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════ APP SCREENSHOTS ══════════════════════ */}
        <View style={[st.section, { width: '100%', backgroundColor: '#07070C', paddingBottom: 0 }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center', paddingHorizontal: pad }}>
            <Badge label="Screenshots" color={C.primary} />
            <SectionHead title="Every screen. Dark & light." sub="Real screenshots — iPhone, Android and web browser. No mockups." isMobile={isMobile} />
          </View>

          {/* Web screenshots */}
          <View style={{ width: '100%', maxWidth: maxW, alignSelf: 'center', paddingHorizontal: pad, marginBottom: 12 }}>
            <Text style={st.groupLabel}>Web App · mymoodmapp.com</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: pad, gap: isMobile ? 10 : 16, paddingBottom: 4 }}>
            {WEB_SHOTS.map((sc, i) => (
              <View key={i} style={[st.webThumb, isMobile && { width: Math.min(w * 0.75, 300) }]}>
                <View style={st.browserBar}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[C.rose, '#FFD166', C.green].map((c, j) => <View key={j} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />)}
                  </View>
                  <View style={st.browserUrl}>
                    <MaterialIcons name="lock" size={8} color={C.teal} />
                    <Text style={st.browserUrlText}>mymoodmapp.com</Text>
                  </View>
                </View>
                <Image source={{ uri: sc.uri }} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="cover" transition={250} />
                <View style={st.thumbFooter}>
                  <Text style={st.thumbLabel}>{sc.label}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Phone screenshots */}
          <View style={{ width: '100%', maxWidth: maxW, alignSelf: 'center', paddingHorizontal: pad, marginTop: 32, marginBottom: 12 }}>
            <Text style={st.groupLabel}>iPhone & Android — Dark & Light</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: pad, gap: isMobile ? 10 : 14, paddingBottom: 40 }}>
            {PHONE_SHOTS.map((sc, i) => (
              <View key={i} style={[st.phoneThumb, { width: phoneW, borderRadius: isMobile ? 16 : 22 }]}>
                <Image source={{ uri: sc.uri }} style={{ width: '100%', aspectRatio: 9 / 16 }} contentFit="cover" contentPosition="top" transition={200} />
                <View style={[st.thumbFooter, { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <Text style={[st.thumbLabel, isMobile && { fontSize: 11 }]}>{sc.label}</Text>
                  <Text style={[st.thumbSub, isMobile && { fontSize: 9 }]}>{sc.theme}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ══════════════════════════ FEATURE GRID ═════════════════════════ */}
        <View style={[st.section, { width: '100%', paddingHorizontal: pad }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center' }}>
            <Badge label="Features" color={C.teal} />
            <SectionHead title="Everything you need." sub="18 features across mood intelligence, health fusion, sound therapy and social accountability." isMobile={isMobile} />
            <View style={[st.featureGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[st.featureCard, {
                  width: isDesktop ? '31%' : isMobile ? '100%' : '47%',
                }]}>
                  <View style={[st.featureIcon, { backgroundColor: f.color + '14' }]}>
                    <MaterialIcons name={f.icon as any} size={20} color={f.color} />
                  </View>
                  <Text style={st.featureTitle}>{f.title}</Text>
                  <Text style={st.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ══════════════════════════ MOOD LAB SPOTLIGHT ═══════════════════ */}
        <View style={[st.spotlight, { width: '100%', backgroundColor: '#060E0C', paddingHorizontal: pad }]}>
          <View style={[st.spotRow, { maxWidth: maxW, width: '100%', alignSelf: 'center', flexDirection: isDesktop ? 'row' : 'column' }]}>
            <View style={[st.spotCopy, { flex: isDesktop ? 1 : undefined, alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <View style={[st.spotBadge, { borderColor: C.teal + '35', backgroundColor: C.teal + '12' }]}>
                <MaterialIcons name="waves" size={11} color={C.teal} />
                <Text style={[st.spotBadgeText, { color: C.teal }]}>Mood Lab</Text>
              </View>
              <Text style={[st.spotTitle, { textAlign: isDesktop ? 'left' : 'center', fontSize: isDesktop ? 36 : isMobile ? 22 : 28 }]}>
                Your personal{'\n'}sound sanctuary.
              </Text>
              <Text style={[st.spotSub, { textAlign: isDesktop ? 'left' : 'center' }]}>
                24 ambient soundscapes. 28+ healing frequencies. 19 guided meditations. 7 stress relief games.
              </Text>
              <View style={{ gap: 10, width: '100%' }}>
                {[
                  { icon: 'music-note', color: C.teal, label: '24 Ambient Soundscapes', sub: 'Rain, ocean, forest, fire, urban, space — gapless' },
                  { icon: 'waves', color: C.green, label: '28+ Healing Frequencies', sub: 'Solfeggio, binaural, brainwave — fully on-device' },
                  { icon: 'self-improvement', color: C.purple, label: '19 Guided Meditations', sub: 'Sleep, anxiety, mindfulness, focus' },
                  { icon: 'games', color: '#F472B6', label: '7 Stress Relief Games', sub: 'Breathing, tactile, puzzle, pixel art, MoodBeat' },
                ].map((item, i) => (
                  <View key={i} style={st.spotFeatureRow}>
                    <View style={[st.spotFeatureIcon, { backgroundColor: item.color + '16' }]}>
                      <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.spotFeatureLabel}>{item.label}</Text>
                      <Text style={st.spotFeatureSub}>{item.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={[st.spotPhone, isMobile && { width: Math.min(w - pad * 2, 200) }]}>
              <Image source={{ uri: 'https://cdn-ai.onspace.ai/onspace/files/j8V63eSB83yCWuCTxCaoHQ/dark_04_moodlab.jpg' }} style={{ width: '100%', aspectRatio: 9 / 16 }} contentFit="cover" contentPosition="top" transition={300} />
            </View>
          </View>
        </View>

        {/* ══════════════════════════ MAPP SPOTLIGHT ═══════════════════════ */}
        <View style={[st.spotlight, { width: '100%', backgroundColor: '#07070E', paddingHorizontal: pad }]}>
          <View style={[st.spotRow, { maxWidth: maxW, width: '100%', alignSelf: 'center', flexDirection: isDesktop ? 'row-reverse' : 'column' }]}>
            <View style={[st.spotCopy, { flex: isDesktop ? 1 : undefined, alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <View style={[st.spotBadge, { borderColor: C.secondary + '35', backgroundColor: C.secondary + '12' }]}>
                <MaterialIcons name="explore" size={11} color={C.secondary} />
                <Text style={[st.spotBadgeText, { color: C.secondary }]}>Mapp</Text>
              </View>
              <Text style={[st.spotTitle, { textAlign: isDesktop ? 'left' : 'center', fontSize: isDesktop ? 36 : isMobile ? 22 : 28 }]}>
                Your emotions,{'\n'}visualised as art.
              </Text>
              <Text style={[st.spotSub, { textAlign: isDesktop ? 'left' : 'center' }]}>
                A living AI canvas that transforms your mood data into beautiful generative artwork. Six layers reveal your emotional landscape.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: isDesktop ? 'flex-start' : 'center' }}>
                {['Today', 'Week', 'Month', 'Drivers', 'Forecast', 'Mood Print'].map(l => (
                  <View key={l} style={{ borderRadius: 99, borderWidth: 1, borderColor: C.secondary + '40', backgroundColor: C.secondary + '10', paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.secondary, includeFontPadding: false }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[st.spotPhone, isMobile && { width: Math.min(w - pad * 2, 200) }]}>
              <Image source={{ uri: 'https://cdn-ai.onspace.ai/onspace/files/DB3YfdGqKwFTxrBSfaGMLH/dark_05_mapp.jpg' }} style={{ width: '100%', aspectRatio: 9 / 16 }} contentFit="cover" contentPosition="top" transition={300} />
            </View>
          </View>
        </View>

        {/* ══════════════════════════ THERAPIST ════════════════════════════ */}
        <View style={[st.section, { width: '100%', backgroundColor: '#08080E', paddingHorizontal: pad }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center' }}>
            <Badge label="For Therapists" color={C.secondary} />
            <SectionHead title="Built for mental health professionals." sub="Therapist Pro gives you a real-time window into your clients' daily wellbeing." isMobile={isMobile} />
            <View style={[st.featureGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {[
                { icon: 'group',         color: C.secondary, title: 'Unlimited Clients',       desc: 'Invite clients via link. Their data flows to your dashboard automatically.' },
                { icon: 'bar-chart',     color: C.primary,   title: '14-Day Mood Trends',      desc: "See each client's score, body, mind and energy dimensions at a glance." },
                { icon: 'notifications', color: C.teal,      title: 'Overdue Log Alerts',      desc: 'Get notified when a client misses their daily check-in so you can follow up.' },
                { icon: 'note',          color: '#F472B6',   title: 'Private Notes',           desc: 'Keep private session notes per client — never visible to them.' },
                { icon: 'description',   color: '#FFD166',   title: 'AI Wellness Reports',     desc: 'Access full AI-generated wellness reports for every client before sessions.' },
                { icon: 'psychology',    color: C.purple,    title: 'Clinical Questionnaires', desc: 'PHQ-9, GAD-7, AUDIT-C and sleep scoring shared during client onboarding.' },
              ].map((f, i) => (
                <View key={i} style={[st.featureCard, { width: isDesktop ? '31%' : isMobile ? '100%' : '47%' }]}>
                  <View style={[st.featureIcon, { backgroundColor: f.color + '14' }]}>
                    <MaterialIcons name={f.icon as any} size={20} color={f.color} />
                  </View>
                  <Text style={st.featureTitle}>{f.title}</Text>
                  <Text style={st.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ══════════════════════════ TESTIMONIALS ═════════════════════════ */}
        <View style={[st.section, { width: '100%', paddingHorizontal: 0, paddingBottom: 0 }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center', paddingHorizontal: pad }}>
            <Badge label="Reviews" color={C.primary} />
            <SectionHead title="Loved by users worldwide." isMobile={isMobile} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: pad, gap: 12, paddingBottom: 48 }}>
            {TESTIMONIALS.map((t, i) => (
              <View key={i} style={[st.testimonialCard, isMobile && { width: Math.min(w * 0.8, 260) }]}>
                <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                  {Array.from({ length: t.rating }, (_, j) => <MaterialIcons key={j} name="star" size={13} color={C.primary} />)}
                </View>
                <Text style={[st.testimonialQ, isMobile && { fontSize: 12 }]}>&ldquo;{t.quote}&rdquo;</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 'auto' as any }}>
                  <View style={st.testimonialAvatar}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.primary, includeFontPadding: false }}>{t.author[0]}</Text>
                  </View>
                  <View>
                    <Text style={st.testimonialName}>{t.author}</Text>
                    <Text style={st.testimonialRole}>{t.role}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ══════════════════════════ PRICING ══════════════════════════════ */}
        <View style={[st.section, { width: '100%', backgroundColor: '#06060A', paddingHorizontal: pad }]}>
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center' }}>
            <Badge label="Pricing" color={C.primary} />
            <SectionHead title="30 days free. Then simple." sub="No credit card required. Billing begins day 31 only if you choose to continue." isMobile={isMobile} />

            {/* Trial timeline */}
            <View style={st.trialBox}>
              {[
                { icon: 'login',       step: 'Day 1',     desc: 'Sign up, choose Pro or Therapist Pro' },
                { icon: 'star',        step: 'Days 1–30', desc: 'Full access at zero cost' },
                { icon: 'credit-card', step: 'Day 31+',   desc: 'Auto-billed monthly · cancel any time' },
              ].map((item, i) => (
                <View key={i} style={st.trialRow}>
                  {i > 0 && <View style={st.trialLine} />}
                  <View style={st.trialDot}>
                    <MaterialIcons name={item.icon as any} size={14} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.trialStep}>{item.step}</Text>
                    <Text style={st.trialDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Plans */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 20 }}>
              {PRICING.map((plan: any, i: number) => (
                <View key={i} style={[st.planCard, { flex: isMobile ? undefined : 1 }, plan.highlight && { borderColor: plan.accent + '55', backgroundColor: '#121218' }]}>
                  {plan.highlight && (
                    <View style={st.popularPill}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#000', includeFontPadding: false }}>Most Popular</Text>
                    </View>
                  )}
                  <View style={[st.planIconWrap, { backgroundColor: plan.accent + '14' }]}>
                    <MaterialIcons name={plan.icon} size={22} color={plan.accent} />
                  </View>
                  <Text style={[st.planTier, { color: plan.accent }]}>{plan.tier}</Text>
                  {plan.trial && (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: C.primaryDim, borderRadius: 99, borderWidth: 1, borderColor: C.primary + '35', paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, includeFontPadding: false }}>30-day free trial</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                    <Text style={st.planPrice}>{plan.price}</Text>
                    {plan.period ? <Text style={st.planPeriod}>{plan.period}</Text> : null}
                  </View>
                  {plan.trial && <Text style={st.planNote}>Free for 30 days, then {plan.price}{plan.period}</Text>}
                  <View style={{ height: 1, backgroundColor: C.border, marginVertical: 6 }} />
                  {plan.features.map((f: string, j: number) => (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="check" size={13} color={plan.accent} style={{ marginTop: 2 }} />
                      <Text style={st.planFeature}>{f}</Text>
                    </View>
                  ))}
                  <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.planCta, { backgroundColor: plan.highlight ? plan.accent : 'transparent', borderColor: plan.accent }, pressed && { opacity: 0.85 }]}>
                    <Text style={[st.planCtaText, { color: plan.highlight ? '#000' : plan.accent }]}>
                      {plan.tier === 'Free' ? 'Get started free' : 'Start 30-day trial'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: C.white35, textAlign: 'center', includeFontPadding: false }}>
              No credit card required. Cancel any time before day 31 — you will never be charged.
            </Text>
          </View>
        </View>

        {/* ══════════════════════════ FINAL CTA ════════════════════════════ */}
        <View style={[st.finalSection, { width: '100%', paddingHorizontal: pad }]}>
          {/* Background */}
          <LinearGradient
            colors={['rgba(94,92,230,0.08)', 'rgba(245,166,35,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center', alignItems: 'center', gap: isMobile ? 16 : 22 }}>
            <Image source={MOODPRINT} style={[st.finalIcon, { borderRadius: 24 }]} contentFit="cover" />
            <Text style={[st.finalTitle, { fontSize: isDesktop ? 46 : isMobile ? 26 : 36, textAlign: 'center' }]}>
              Try Pro free for 30 days
            </Text>
            <Text style={[st.finalSub, { textAlign: 'center', maxWidth: 480, fontSize: isMobile ? 14 : 16 }]}>
              No credit card. Full access from day one. Web, iOS and Android.
            </Text>
            {isMobile ? (
              <View style={{ width: '100%', gap: 10 }}>
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.ctaPrimary, { justifyContent: 'center' }, pressed && { opacity: 0.88 }]}>
                  <MaterialIcons name="language" size={18} color="#000" />
                  <Text style={st.ctaPrimaryText}>Open Web App — Free</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => Linking.openURL(APP_STORE)} style={({ pressed }) => [st.ctaGhost, { flex: 1, justifyContent: 'center' }, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name="apple" size={17} color={C.white} />
                    <Text style={st.ctaGhostText}>App Store</Text>
                  </Pressable>
                  <Pressable onPress={() => Linking.openURL(PLAY_STORE)} style={({ pressed }) => [st.ctaGhost, { flex: 1, justifyContent: 'center', borderColor: C.teal + '55' }, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name="android" size={17} color={C.teal} />
                    <Text style={[st.ctaGhostText, { color: C.teal }]}>Google Play</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [st.ctaPrimary, pressed && { opacity: 0.88 }]}>
                  <MaterialIcons name="language" size={18} color="#000" />
                  <Text style={st.ctaPrimaryText}>Open Web App — Free</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(APP_STORE)} style={({ pressed }) => [st.ctaGhost, pressed && { opacity: 0.75 }]}>
                  <MaterialIcons name="apple" size={18} color={C.white} />
                  <Text style={st.ctaGhostText}>App Store</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(PLAY_STORE)} style={({ pressed }) => [st.ctaGhost, { borderColor: C.teal + '55' }, pressed && { opacity: 0.75 }]}>
                  <MaterialIcons name="android" size={18} color={C.teal} />
                  <Text style={[st.ctaGhostText, { color: C.teal }]}>Google Play</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════ FOOTER ═══════════════════════════════ */}
        <View style={[st.footer, { width: '100%', paddingHorizontal: pad }]}>
          <View style={[st.footerRow, { maxWidth: maxW, width: '100%', alignSelf: 'center', flexDirection: isMobile ? 'column' : 'row' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={MOODPRINT} style={st.footerIcon} contentFit="cover" />
              <Text style={st.footerName}>MyMoodMapp</Text>
            </View>
            <Text style={st.footerTagline}>Track what moves you.</Text>
            <View style={[st.footerLinks, { marginLeft: isMobile ? 0 : 'auto' as any }]}>
              {[{ l: 'Privacy', r: '/privacy' }, { l: 'Terms', r: '/support' }, { l: 'Contact', r: '/support' }].map(item => (
                <Pressable key={item.l} onPress={() => router.push(item.r as any)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <Text style={st.footerLink}>{item.l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[st.footerBottom, { maxWidth: maxW, width: '100%', alignSelf: 'center' }]}>
            <Text style={st.footerCopy}>© {new Date().getFullYear()} MyMoodMapp. All rights reserved.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Nav
  nav:         { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 13, backgroundColor: 'rgba(5,5,8,0.96)', alignItems: 'center' },
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBrand:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navIcon:     { width: 34, height: 34, borderRadius: 9 },
  navName:     { fontSize: 17, fontWeight: '800', color: C.white, includeFontPadding: false },
  navActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLinks:    { flexDirection: 'row', gap: 24, marginRight: 10 },
  navLink:     { fontSize: 14, color: C.white60, fontWeight: '500', includeFontPadding: false },
  navGhost:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.borderMed },
  navGhostText:{ fontSize: 14, color: C.white60, fontWeight: '600', includeFontPadding: false },
  navBtn:      { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: C.primary },
  navBtnText:  { fontSize: 14, fontWeight: '700', color: '#000', includeFontPadding: false },
  // Ribbon
  ribbon:      { backgroundColor: 'rgba(245,166,35,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,166,35,0.2)', paddingVertical: 9, alignItems: 'center' },
  ribbonText:  { fontSize: 13, color: C.white60, includeFontPadding: false },
  ribbonBtn:   { backgroundColor: C.primary, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  ribbonBtnText: { fontSize: 12, fontWeight: '800', color: '#000', includeFontPadding: false },
  // CTA buttons
  ctaPrimary:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 13, paddingHorizontal: 24, paddingVertical: 14, minHeight: 50 },
  ctaPrimaryText: { fontSize: 15, fontWeight: '800', color: '#000', includeFontPadding: false },
  ctaGhost:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white07, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderColor: C.white15, minHeight: 50 },
  ctaGhostText:{ fontSize: 15, fontWeight: '700', color: C.white, includeFontPadding: false },
  // Stats
  statsBar:    { backgroundColor: '#0A0A10', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 18, alignItems: 'center' },
  statItem:    { alignItems: 'center', gap: 3, paddingHorizontal: 22, paddingVertical: 8 },
  statVal:     { fontSize: 26, fontWeight: '900', color: C.primary, includeFontPadding: false },
  statLbl:     { fontSize: 11, color: C.white35, textAlign: 'center', includeFontPadding: false },
  // Sections
  section:     { paddingVertical: 64, paddingHorizontal: 24 },
  groupLabel:  { fontSize: 10, fontWeight: '700', color: C.white35, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 0, includeFontPadding: false },
  // Screenshots
  webThumb:    { width: 480, borderRadius: 10, backgroundColor: '#000', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  browserBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#13131A', paddingHorizontal: 11, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  browserUrl:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white07, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 200, alignSelf: 'center' },
  browserUrlText: { fontSize: 10, color: C.white35, fontWeight: '600', includeFontPadding: false },
  phoneThumb:  { backgroundColor: '#000', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  thumbFooter: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, gap: 2, backgroundColor: '#0C0C12' },
  thumbLabel:  { fontSize: 12, fontWeight: '700', color: C.white, includeFontPadding: false },
  thumbSub:    { fontSize: 10, color: C.white35, includeFontPadding: false },
  // Feature grid
  featureGrid: { gap: 10, justifyContent: 'center' },
  featureCard: { backgroundColor: C.card, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.border, gap: 7, margin: 2 },
  featureIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  featureTitle:{ fontSize: 14, fontWeight: '700', color: C.white, includeFontPadding: false },
  featureDesc: { fontSize: 12, color: C.white60, lineHeight: 17, includeFontPadding: false },
  // Spotlight
  spotlight:   { paddingVertical: 64, paddingHorizontal: 24 },
  spotRow:     { gap: 40, alignItems: 'center' },
  spotCopy:    { gap: 16, flex: 1 },
  spotBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  spotBadgeText: { fontSize: 11, fontWeight: '700', includeFontPadding: false },
  spotTitle:   { fontWeight: '800', color: C.white, lineHeight: 42, includeFontPadding: false },
  spotSub:     { fontSize: 15, color: C.white60, lineHeight: 23, includeFontPadding: false },
  spotFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  spotFeatureIcon:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  spotFeatureLabel: { fontSize: 14, fontWeight: '700', color: C.white, includeFontPadding: false },
  spotFeatureSub: { fontSize: 11, color: C.white35, includeFontPadding: false, marginTop: 2 },
  spotPhone:   { width: 220, backgroundColor: '#000', borderRadius: 26, borderWidth: 1, borderColor: C.borderMed, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20 },
  // Testimonials
  testimonialCard: { width: 270, backgroundColor: C.card, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.border, gap: 10 },
  testimonialQ:    { fontSize: 13, color: C.white60, lineHeight: 20, fontStyle: 'italic', flex: 1, includeFontPadding: false },
  testimonialAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primary + '35', alignItems: 'center', justifyContent: 'center' },
  testimonialName: { fontSize: 12, fontWeight: '700', color: C.white, includeFontPadding: false },
  testimonialRole: { fontSize: 10, color: C.white35, includeFontPadding: false },
  // Pricing
  trialBox:    { backgroundColor: C.card, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: C.primary + '25', gap: 0, marginBottom: 28 },
  trialRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 9 },
  trialLine:   { position: 'absolute', left: 15, top: -6, width: 2, height: 14, backgroundColor: C.primary + '30' },
  trialDot:    { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary + '40', flexShrink: 0 },
  trialStep:   { fontSize: 13, fontWeight: '800', color: C.primary, includeFontPadding: false },
  trialDesc:   { fontSize: 12, color: C.white60, includeFontPadding: false },
  planCard:    { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, gap: 9, position: 'relative' },
  popularPill: { position: 'absolute', top: -11, alignSelf: 'center', backgroundColor: C.primary, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 4 },
  planIconWrap:{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  planTier:    { fontSize: 16, fontWeight: '800', includeFontPadding: false },
  planPrice:   { fontSize: 30, fontWeight: '900', color: C.white, includeFontPadding: false },
  planPeriod:  { fontSize: 13, color: C.white35, paddingBottom: 4, includeFontPadding: false },
  planNote:    { fontSize: 11, color: C.white35, includeFontPadding: false, marginTop: -4 },
  planFeature: { fontSize: 12, color: C.white60, flex: 1, lineHeight: 18, includeFontPadding: false },
  planCta:     { marginTop: 8, borderRadius: 11, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  planCtaText: { fontSize: 14, fontWeight: '800', includeFontPadding: false },
  // Final CTA
  finalSection:{ paddingVertical: 80, paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: '#06060A' },
  finalIcon:   { width: 100, height: 100, borderRadius: 24, borderWidth: 2, borderColor: C.primary + '40' },
  finalTitle:  { fontWeight: '900', color: C.white, includeFontPadding: false },
  finalSub:    { color: C.white60, lineHeight: 24, includeFontPadding: false },
  // Footer
  footer:      { backgroundColor: '#030305', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 28, paddingBottom: 24, alignItems: 'center', gap: 12 },
  footerRow:   { gap: 12, alignItems: 'flex-start' },
  footerIcon:  { width: 30, height: 30, borderRadius: 8 },
  footerName:  { fontSize: 15, fontWeight: '800', color: C.white, includeFontPadding: false },
  footerTagline:{ fontSize: 13, color: C.white35, includeFontPadding: false },
  footerLinks: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  footerLink:  { fontSize: 13, color: C.white35, includeFontPadding: false },
  footerBottom:{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  footerCopy:  { fontSize: 11, color: 'rgba(255,255,255,0.18)', includeFontPadding: false },
});
