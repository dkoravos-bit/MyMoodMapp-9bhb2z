// @ts-nocheck
/**
 * MyMoodMapp — Login / Sign up screen
 * Artistic reimagined — split desktop layout + immersive mobile hero.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useAlert } from '@/template';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { updateUserProfile } from '@/services/sync';

type Mode = 'login' | 'register' | 'otp';
type RoleChoice = 'user' | 'therapist';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_H = 48;
const VISIBLE = 5;

function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = range(CURRENT_YEAR - 100, CURRENT_YEAR - 10).reverse();

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:         '#050508',
  glass:      'rgba(12,12,20,0.82)',
  glassBorder:'rgba(255,255,255,0.10)',
  glassBorderFocus: 'rgba(245,166,35,0.45)',
  primary:    '#F5A623',
  primaryDim: 'rgba(245,166,35,0.12)',
  secondary:  '#7C6FF7',
  teal:       '#2DD4C0',
  white:      '#FFFFFF',
  white70:    'rgba(255,255,255,0.70)',
  white40:    'rgba(255,255,255,0.40)',
  white15:    'rgba(255,255,255,0.15)',
  white08:    'rgba(255,255,255,0.08)',
};

const HERO_MOBILE  = require('@/assets/images/hero-mobile.jpg');
const HERO_DESKTOP = require('@/assets/images/hero-desktop.jpg');
const MOODPRINT    = require('@/assets/moodprint-icon.png');

// ─── Layout hook ─────────────────────────────────────────────────────────────
function useLayout() {
  const [w, setW] = useState(() => Dimensions.get('window').width);
  const [h, setH] = useState(() => Dimensions.get('window').height);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setW(window.width);
      setH(window.height);
    });
    return () => sub?.remove();
  }, []);
  return { w, h, isMobile: w < 640, isDesktop: w >= 1080 };
}

// ─── Drum-roll column ─────────────────────────────────────────────────────────
function DrumColumn<T extends number | string>({
  items, selectedIndex, onSelect, formatItem, width,
}: {
  items: T[]; selectedIndex: number; onSelect: (index: number) => void;
  formatItem?: (v: T) => string; width: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const PAD = Math.floor(VISIBLE / 2);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: true });
  }, [selectedIndex]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onSelect(clamped);
  };

  return (
    <View style={{ width, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: PAD * ITEM_H, left: 0, right: 0, height: ITEM_H,
        backgroundColor: T.primaryDim, borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: T.primary + '50', borderRadius: 8, zIndex: 1,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: PAD * ITEM_H }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={String(item)}
              onPress={() => { scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true }); onSelect(i); }}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{
                fontSize: isSelected ? 16 : 14, fontWeight: isSelected ? '700' : '400',
                color: isSelected ? T.primary : T.white40, includeFontPadding: false,
              }}>
                {formatItem ? formatItem(item) : String(item)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Birthdate picker modal ───────────────────────────────────────────────────
function BirthdatePicker({ visible, value, onConfirm, onClose }: {
  visible: boolean; value: string | null; onConfirm: (date: string | null) => void; onClose: () => void;
}) {
  const parsed = value ? new Date(value) : null;
  const [dayIdx, setDayIdx] = useState(() => (parsed ? parsed.getUTCDate() : 1) - 1);
  const [monthIdx, setMonthIdx] = useState(() => parsed ? parsed.getUTCMonth() : 0);
  const [yearIdx, setYearIdx] = useState(() => {
    if (!parsed) return 20;
    return YEARS.indexOf(parsed.getUTCFullYear());
  });

  const selectedYear = YEARS[yearIdx] ?? YEARS[0];
  const selectedMonth = monthIdx + 1;
  const maxDays = daysInMonth(selectedMonth, selectedYear);
  const days = range(1, maxDays);

  useEffect(() => { if (dayIdx >= maxDays) setDayIdx(maxDays - 1); }, [maxDays]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{
          backgroundColor: '#111118', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
          borderTopWidth: 1, borderColor: T.glassBorder, gap: 20,
        }} onPress={() => {}}>
          <View style={{ width: 40, height: 4, backgroundColor: T.white15, borderRadius: 4, alignSelf: 'center' }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: T.white, textAlign: 'center', includeFontPadding: false }}>Date of birth</Text>
          <Text style={{ fontSize: 12, color: T.white40, textAlign: 'center', marginTop: -12, includeFontPadding: false }}>Used for astrological sign and cosmic forecasts</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            <DrumColumn items={MONTHS} selectedIndex={monthIdx} onSelect={setMonthIdx} width={80} />
            <DrumColumn items={days} selectedIndex={Math.min(dayIdx, days.length - 1)} onSelect={setDayIdx} formatItem={v => String(v).padStart(2, '0')} width={64} />
            <DrumColumn items={YEARS} selectedIndex={yearIdx} onSelect={setYearIdx} width={80} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => onConfirm(null)} style={({ pressed }) => [{
              flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
              borderRadius: 14, backgroundColor: T.white08, borderWidth: 1, borderColor: T.glassBorder, minHeight: 52,
            }, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 15, color: T.white40, fontWeight: '500', includeFontPadding: false }}>Skip</Text>
            </Pressable>
            <Pressable onPress={() => {
              const d = Math.min(dayIdx + 1, maxDays);
              const mm = String(selectedMonth).padStart(2, '0');
              const dd = String(d).padStart(2, '0');
              onConfirm(`${selectedYear}-${mm}-${dd}`);
            }} style={({ pressed }) => [{
              flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
              borderRadius: 14, backgroundColor: T.primary, minHeight: 52,
            }, pressed && { opacity: 0.85 }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#000', includeFontPadding: false }}>Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Focused input ────────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, icon,
  keyboardType, autoCapitalize, secureTextEntry,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; icon: string; keyboardType?: any;
  autoCapitalize?: any; secureTextEntry?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: T.white40, letterSpacing: 0.5, includeFontPadding: false }}>{label}</Text>
      <View style={[{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12, borderWidth: 1,
        borderColor: focused ? T.glassBorderFocus : T.glassBorder,
        paddingHorizontal: 14, minHeight: 50,
      }, focused && { backgroundColor: 'rgba(245,166,35,0.04)' }]}>
        <MaterialIcons name={icon as any} size={15} color={focused ? T.primary : T.white40} style={{ marginRight: 10 }} />
        <TextInput
          style={{ flex: 1, color: T.white, fontSize: 15, includeFontPadding: false }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.white40}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          secureTextEntry={secureTextEntry}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Role chip ────────────────────────────────────────────────────────────────
function RoleChip({ icon, label, desc, active, onPress, accent }: {
  icon: string; label: string; desc: string; active: boolean; onPress: () => void; accent: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flex: 1, alignItems: 'center', gap: 5, borderRadius: 14, padding: 14,
      borderWidth: 1.5,
      backgroundColor: active ? accent + '10' : 'rgba(255,255,255,0.04)',
      borderColor: active ? accent + '60' : T.glassBorder,
    }, pressed && { opacity: 0.8 }]}>
      <MaterialIcons name={icon as any} size={22} color={active ? accent : T.white40} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? accent : T.white40, includeFontPadding: false }}>{label}</Text>
      <Text style={{ fontSize: 10, color: T.white40, textAlign: 'center', includeFontPadding: false }}>{desc}</Text>
    </Pressable>
  );
}

// ─── Left artistic panel (desktop only) ──────────────────────────────────────
function ArtPanel({ h }: { h: number }) {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -12, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, height: h, overflow: 'hidden', backgroundColor: '#030306' }}>
      {/* Hero image */}
      <Image source={HERO_DESKTOP} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" transition={400} />

      {/* Overlays */}
      <LinearGradient
        colors={['rgba(5,5,8,0.15)', 'rgba(5,5,8,0.25)', 'rgba(5,5,8,0.70)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Right-edge fade into form panel */}
      <LinearGradient
        colors={['transparent', 'rgba(5,5,8,0.85)', '#050508']}
        start={{ x: 0.5, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Floating content */}
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 48 }}>
        <Animated.View style={{ transform: [{ translateY: floatY }], gap: 16 }}>
          {/* Tagline badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
            backgroundColor: 'rgba(245,166,35,0.12)', borderRadius: 99,
            borderWidth: 1, borderColor: 'rgba(245,166,35,0.30)',
            paddingHorizontal: 13, paddingVertical: 6,
          }}>
            <MaterialIcons name="auto-awesome" size={11} color={T.primary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.primary, letterSpacing: 0.4, includeFontPadding: false }}>AI-Powered Wellbeing</Text>
          </View>

          {/* Headline */}
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 40, fontWeight: '900', color: T.white, lineHeight: 46, includeFontPadding: false }}>Know your vibe.</Text>
            <Text style={{ fontSize: 40, fontWeight: '900', color: T.primary, lineHeight: 48, includeFontPadding: false }}>Understand yourself.</Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
            {[{ v: '10s', l: 'Log time' }, { v: '6+', l: 'AI layers' }, { v: '28+', l: 'Frequencies' }].map(s => (
              <View key={s.l} style={{ gap: 2 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: T.primary, includeFontPadding: false }}>{s.v}</Text>
                <Text style={{ fontSize: 10, color: T.white40, includeFontPadding: false }}>{s.l}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Form panel ───────────────────────────────────────────────────────────────
function FormPanel({
  mode, setMode, role, setRole,
  email, setEmail, password, setPassword,
  confirmPassword, setConfirmPassword,
  displayName, setDisplayName,
  otp, setOtp,
  birthdate, setBirthdate,
  showBirthdatePicker, setShowBirthdatePicker,
  handleLogin, handleRegisterSendOTP, handleVerifyOTP,
  operationLoading, isMobile, isDesktop, formatBirthdate,
  router,
}: any) {

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: isMobile ? 24 : 48,
        paddingBottom: isMobile ? 48 : 48,
        minHeight: isMobile ? undefined : '100%',
      }}
    >
      {/* Logo + brand */}
      <View style={{ alignItems: isMobile ? 'center' : 'flex-start', marginBottom: 32, gap: 10 }}>
        <View style={{
          width: 62, height: 62, borderRadius: 16,
          overflow: 'hidden', borderWidth: 1.5,
          borderColor: 'rgba(245,166,35,0.35)',
          shadowColor: T.primary, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
        }}>
          <Image source={MOODPRINT} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
        <View style={{ alignItems: isMobile ? 'center' : 'flex-start', gap: 3 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: T.white, includeFontPadding: false }}>MyMoodMapp</Text>
          <Text style={{ fontSize: 12, color: T.white40, includeFontPadding: false }}>Track what moves you</Text>
        </View>
      </View>

      {/* Mode toggle — pill switcher */}
      {mode !== 'otp' && (
        <View style={{
          flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 14, padding: 4, marginBottom: 28,
          borderWidth: 1, borderColor: T.glassBorder,
        }}>
          {[{ id: 'login', label: 'Sign in' }, { id: 'register', label: 'Create account' }].map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setMode(tab.id as Mode)}
              style={({ pressed }) => [{
                flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
                backgroundColor: mode === tab.id ? T.primary : 'transparent',
              }, pressed && { opacity: 0.8 }]}
            >
              <Text style={{
                fontSize: 14, fontWeight: '700',
                color: mode === tab.id ? '#000' : T.white40,
                includeFontPadding: false,
              }}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── LOGIN ── */}
      {mode === 'login' && (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: T.white, includeFontPadding: false }}>Welcome back</Text>
            <Text style={{ fontSize: 13, color: T.white40, includeFontPadding: false }}>Sign in to continue your wellbeing journey</Text>
          </View>
          <View style={{ gap: 14 }}>
            <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" icon="email" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" icon="lock" />
          </View>
          <Pressable onPress={handleLogin} disabled={operationLoading} style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: T.primary, borderRadius: 14, paddingVertical: 15, minHeight: 52,
          }, pressed && { opacity: 0.88 }, operationLoading && { opacity: 0.6 }]}>
            {operationLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <><MaterialIcons name="login" size={18} color="#000" /><Text style={{ fontSize: 15, fontWeight: '800', color: '#000', includeFontPadding: false }}>Sign in</Text></>
            }
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: T.glassBorder }} />
            <Text style={{ fontSize: 11, color: T.white40, includeFontPadding: false }}>Don't have an account?</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: T.glassBorder }} />
          </View>
          <Pressable onPress={() => setMode('register')} style={({ pressed }) => [{
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 14, paddingVertical: 13, minHeight: 50,
            borderWidth: 1.5, borderColor: T.glassBorder,
            backgroundColor: T.white08,
          }, pressed && { opacity: 0.75 }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.white70, includeFontPadding: false }}>Create free account →</Text>
          </Pressable>
        </View>
      )}

      {/* ── REGISTER ── */}
      {mode === 'register' && (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: T.white, includeFontPadding: false }}>Create your account</Text>
            <Text style={{ fontSize: 13, color: T.white40, includeFontPadding: false }}>30-day free trial. No credit card required.</Text>
          </View>

          {/* Role chooser */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: T.white40, letterSpacing: 0.5, includeFontPadding: false }}>I AM A…</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <RoleChip icon="person" label="User" desc="Log my mood daily" active={role === 'user'} accent={T.primary} onPress={() => setRole('user')} />
              <RoleChip icon="psychology" label="Therapist" desc="Monitor my clients" active={role === 'therapist'} accent={T.secondary} onPress={() => setRole('therapist')} />
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 8,
              backgroundColor: role === 'therapist' ? T.secondary + '10' : T.white08,
              borderRadius: 10, padding: 11,
              borderWidth: 1, borderColor: role === 'therapist' ? T.secondary + '30' : T.glassBorder,
            }}>
              <MaterialIcons name="info-outline" size={13} color={role === 'therapist' ? T.secondary : T.white40} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 11, color: role === 'therapist' ? T.secondary : T.white40, lineHeight: 16, includeFontPadding: false }}>
                {role === 'therapist'
                  ? 'Therapist Pro ($9.99/mo) — unlimited client slots, full dashboard. Free for 30 days.'
                  : 'Start free — unlimited logs + 30-day history. Upgrade to Pro ($3.99/mo) for AI insights.'}
              </Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Field label="Display name (optional)" value={displayName} onChangeText={setDisplayName} placeholder="How should we call you?" icon="badge" />
            <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" icon="email" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" icon="lock" />
            <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repeat password" icon="lock-outline" />

            {/* Birthdate */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: T.white40, letterSpacing: 0.5, includeFontPadding: false }}>
                DATE OF BIRTH <Text style={{ fontWeight: '400' }}>(optional · astrology)</Text>
              </Text>
              <Pressable onPress={() => setShowBirthdatePicker(true)} style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12, borderWidth: 1, borderColor: T.glassBorder,
                paddingHorizontal: 14, minHeight: 50,
              }, pressed && { opacity: 0.8 }]}>
                <MaterialIcons name="cake" size={15} color={T.white40} style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, color: birthdate ? T.white : T.white40, includeFontPadding: false }}>
                  {birthdate ? formatBirthdate(birthdate) : 'Tap to select your birthday'}
                </Text>
                {birthdate
                  ? <Pressable onPress={(e) => { e.stopPropagation(); setBirthdate(null); }} hitSlop={10}><MaterialIcons name="close" size={15} color={T.white40} /></Pressable>
                  : <MaterialIcons name="chevron-right" size={15} color={T.white40} />
                }
              </Pressable>
            </View>
          </View>

          <Pressable onPress={handleRegisterSendOTP} disabled={operationLoading} style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: T.primary, borderRadius: 14, paddingVertical: 15, minHeight: 52,
          }, pressed && { opacity: 0.88 }, operationLoading && { opacity: 0.6 }]}>
            {operationLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <><MaterialIcons name="mark-email-read" size={18} color="#000" /><Text style={{ fontSize: 15, fontWeight: '800', color: '#000', includeFontPadding: false }}>Send verification code</Text></>
            }
          </Pressable>
        </View>
      )}

      {/* ── OTP ── */}
      {mode === 'otp' && (
        <View style={{ gap: 24, alignItems: 'center' }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: T.primaryDim, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: T.primary + '50',
            shadowColor: T.primary, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
          }}>
            <MaterialIcons name="mark-email-read" size={32} color={T.primary} />
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: T.white, includeFontPadding: false }}>Check your email</Text>
            <Text style={{ fontSize: 13, color: T.white40, textAlign: 'center', lineHeight: 20, includeFontPadding: false }}>
              We sent a 4-digit code to{'\n'}
              <Text style={{ color: T.primary, fontWeight: '700' }}>{email}</Text>
            </Text>
          </View>
          <TextInput
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
              borderWidth: 2, borderColor: T.primary + '60',
              paddingVertical: 16, paddingHorizontal: 32,
              fontSize: 36, fontWeight: '900', color: T.white,
              letterSpacing: 14, minWidth: 200, textAlign: 'center',
            }}
            value={otp}
            onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="• • • •"
            placeholderTextColor={T.white40}
            textAlign="center"
          />
          <Pressable onPress={handleVerifyOTP} disabled={operationLoading} style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: T.primary, borderRadius: 14, paddingVertical: 15, minHeight: 52,
            width: '100%',
          }, pressed && { opacity: 0.88 }, operationLoading && { opacity: 0.6 }]}>
            {operationLoading
              ? <ActivityIndicator color="#000" size="small" />
              : <><MaterialIcons name="check-circle" size={18} color="#000" /><Text style={{ fontSize: 15, fontWeight: '800', color: '#000', includeFontPadding: false }}>Verify & create account</Text></>
            }
          </Pressable>
          <Pressable onPress={() => { setMode('register'); setOtp(''); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="arrow-back" size={14} color={T.white40} />
            <Text style={{ fontSize: 12, color: T.white40, includeFontPadding: false }}>Back to registration</Text>
          </Pressable>
        </View>
      )}

      {/* Privacy */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 28 }}>
        <MaterialIcons name="lock-outline" size={11} color={T.white40} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 10, color: T.white40, lineHeight: 14, includeFontPadding: false }}>
          Your data is encrypted and never sold. You can delete your account any time.
        </Text>
      </View>

      {/* Back to landing */}
      <Pressable
        onPress={() => router.push('/landing')}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: isMobile ? 'center' : 'flex-start', marginTop: 12 }, pressed && { opacity: 0.7 }]}
      >
        <MaterialIcons name="arrow-back" size={13} color={T.white40} />
        <Text style={{ fontSize: 12, color: T.white40, includeFontPadding: false }}>Back to homepage</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading, user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { w, h, isMobile, isDesktop } = useLayout();

  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<RoleChoice>('user');
  const [justRegistered, setJustRegistered] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const formatBirthdate = (iso: string | null) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { showAlert('Missing fields', 'Please enter your email and password.'); return; }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('Login failed', error);
  };

  const handleRegisterSendOTP = async () => {
    if (!email.trim() || !password || !confirmPassword) { showAlert('Missing fields', 'Please fill in all fields.'); return; }
    if (password !== confirmPassword) { showAlert('Password mismatch', 'Passwords do not match.'); return; }
    if (password.length < 6) { showAlert('Password too short', 'Password must be at least 6 characters.'); return; }
    const { error } = await sendOTP(email.trim());
    if (error) { showAlert('Could not send code', error); return; }
    setMode('otp');
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) { showAlert('Enter code', 'Please enter the 4-digit code from your email.'); return; }
    const { error, user: newUser } = await verifyOTPAndLogin(email.trim(), otp, {
      password, data: { display_name: displayName.trim() || email.split('@')[0], role },
    });
    if (error) { showAlert('Verification failed', error); return; }
    if (newUser?.id) {
      await updateUserProfile(newUser.id, {
        display_name: displayName.trim() || email.split('@')[0],
        role, birthdate: birthdate ?? undefined,
      } as any);
    }
    setJustRegistered(true);
  };

  useEffect(() => {
    if (justRegistered && user && role === 'therapist') {
      setJustRegistered(false);
      setTimeout(() => { router.push('/(tabs)/profile' as any); }, 800);
    }
  }, [justRegistered, user, role]);

  const formProps = {
    mode, setMode, role, setRole,
    email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword,
    displayName, setDisplayName,
    otp, setOtp,
    birthdate, setBirthdate,
    showBirthdatePicker, setShowBirthdatePicker,
    handleLogin, handleRegisterSendOTP, handleVerifyOTP,
    operationLoading, isMobile, isDesktop, formatBirthdate, router,
  };

  // ── DESKTOP — split layout ──
  if (!isMobile && Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, flexDirection: 'row', height: h }}>
        <BirthdatePicker
          visible={showBirthdatePicker}
          value={birthdate}
          onConfirm={d => { setBirthdate(d); setShowBirthdatePicker(false); }}
          onClose={() => setShowBirthdatePicker(false)}
        />
        {/* Left: art panel — 55% */}
        <Animated.View style={{ flex: 55, opacity: fadeIn }}>
          <ArtPanel h={h} />
        </Animated.View>

        {/* Right: form panel — 45% with glass bg */}
        <Animated.View style={{ flex: 45, opacity: fadeIn, backgroundColor: T.bg, borderLeftWidth: 1, borderLeftColor: T.glassBorder }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <FormPanel {...formProps} />
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    );
  }

  // ── MOBILE / NATIVE — full-bleed hero behind form ──
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <BirthdatePicker
        visible={showBirthdatePicker}
        value={birthdate}
        onConfirm={d => { setBirthdate(d); setShowBirthdatePicker(false); }}
        onClose={() => setShowBirthdatePicker(false)}
      />

      {/* Background image — top portion */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: h * 0.42, overflow: 'hidden' }}>
        <Image source={HERO_MOBILE} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="top" transition={300} />
        <LinearGradient
          colors={['transparent', 'rgba(5,5,8,0.60)', 'rgba(5,5,8,0.95)', '#050508']}
          locations={[0, 0.45, 0.75, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={{ flex: 1, opacity: fadeIn }}>
            <FormPanel {...formProps} />
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
