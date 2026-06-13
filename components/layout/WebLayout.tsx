/**
 * WebLayout — responsive desktop layout for web
 *
 * On desktop (≥1024px): renders a fixed left sidebar + main content area
 * On mobile/tablet: transparent pass-through (bottom tabs handle nav)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { DarkColors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/template';

export const WEB_SIDEBAR_WIDTH = 220;
export const WEB_MAX_CONTENT_WIDTH = 960;
export const WEB_DESKTOP_BREAKPOINT = 1024;

// KAIROS brand tokens
const KB = {
  navy:       '#0D1520',
  navyLight:  '#131E2E',
  navyBorder: 'rgba(201,160,85,0.18)',
  gold:       '#C9A055',
  goldSoft:   'rgba(201,160,85,0.12)',
  teal:       '#45C4A8',
  tealSoft:   'rgba(69,196,168,0.12)',
  text:       '#FFFFFF',
  textSub:    'rgba(255,255,255,0.65)',
  textMuted:  'rgba(255,255,255,0.35)',
};

function useDimensions() {
  const [w, setW] = useState(() => Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub?.remove();
  }, []);
  return w;
}

export function useIsDesktopWeb() {
  const w = useDimensions();
  return Platform.OS === 'web' && w >= WEB_DESKTOP_BREAKPOINT;
}

const NAV_ITEMS = [
  { route: '/(tabs)', label: 'Dashboard', icon: 'home' },
  { route: '/(tabs)/checkin', label: 'Log', icon: 'add-circle' },
  { route: '/(tabs)/insights', label: 'Patterns', icon: 'bar-chart' },
  { route: '/(tabs)/sound-lab', label: 'Mood Lab', icon: 'waves' },
  { route: '/(tabs)/mapp', label: 'Mapp', icon: 'explore' },
  { route: '/(tabs)/profile', label: 'Me', icon: 'person-outline' },
  // Cycle tracker is a dashboard widget — accessible via home screen
] as const;

function makeStyles(C: typeof DarkColors) {
  return StyleSheet.create({
    sidebar: {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      bottom: 0,
      width: WEB_SIDEBAR_WIDTH,
      backgroundColor: KB.navy,
      borderRightWidth: 1,
      borderRightColor: KB.navyBorder,
      flexDirection: 'column',
      zIndex: 100,
    },
    sidebarBrand: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: Spacing.lg,
      paddingTop: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: KB.navyBorder,
    },
    brandLogo: {
      width: 56,
      height: 56,
      borderRadius: 14,
      overflow: 'hidden',
    },
    brandNameRow: {
      alignItems: 'center',
      gap: 2,
    },
    brandName: {
      fontSize: 15,
      fontWeight: '800',
      color: KB.gold,
      letterSpacing: 3,
      includeFontPadding: false,
    },
    brandSub: {
      fontSize: 9,
      fontWeight: '500',
      color: KB.textMuted,
      letterSpacing: 1.5,
      includeFontPadding: false,
    },
    navList: {
      flex: 1,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.sm,
      gap: 2,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: 11,
      borderRadius: Radius.lg,
      minHeight: 44,
    },
    navItemActive: {
      backgroundColor: KB.goldSoft,
      borderLeftWidth: 2,
      borderLeftColor: KB.gold,
    },
    navLabel: {
      fontSize: Typography.fontSizes.sm,
      fontWeight: '500',
      color: KB.textMuted,
      includeFontPadding: false,
    },
    navLabelActive: {
      color: KB.gold,
      fontWeight: '700',
    },
    sidebarFooter: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: KB.navyBorder,
      gap: Spacing.sm,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: KB.goldSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: KB.gold + '50',
    },
    userAvatarText: {
      fontSize: 13,
      fontWeight: '800',
      color: KB.gold,
      includeFontPadding: false,
    },
    userName: {
      flex: 1,
      fontSize: Typography.fontSizes.xs,
      fontWeight: '600',
      color: KB.textSub,
      includeFontPadding: false,
    },
    mainContent: {
      marginLeft: WEB_SIDEBAR_WIDTH,
      flex: 1,
      minHeight: '100vh' as any,
      overflow: 'hidden' as any,
    },
    bgWatermark: {
      position: 'absolute' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none' as any,
      zIndex: 0,
    },
    bgImage: {
      width: '50%' as any,
      height: '50%' as any,
      opacity: 0.04,
    },
  });
}

interface WebSidebarProps {
  children: React.ReactNode;
}

export function WebSidebar({ children }: WebSidebarProps) {
  const { colors: C } = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isDesktop = useIsDesktopWeb();

  // These pages have their own full-page layout — bypass the sidebar entirely
  const STANDALONE_ROUTES = ['/privacy', '/terms', '/landing', '/login', '/onboarding'];
  const isStandalone = STANDALONE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'));

  if (!isDesktop || isStandalone) return <>{children}</>;

  const isActive = (route: string) => {
    if (route === '/(tabs)') return pathname === '/' || pathname === '/index' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    return pathname.includes(route.replace('/(tabs)', ''));
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Fixed sidebar */}
      <View style={styles.sidebar}>
        {/* Brand */}
        <View style={styles.sidebarBrand}>
          <Image
            source={require('@/assets/kairos-logo.jpg')}
            style={styles.brandLogo}
            contentFit="contain"
            transition={0}
          />
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName}>KAIROS</Text>
            <Text style={styles.brandSub}>A PRODUCT BY EWIG · MYMOODMAPP</Text>
          </View>
        </View>

        {/* Navigation */}
        <ScrollView contentContainerStyle={styles.navList} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={20}
                  color={active ? KB.gold : KB.textMuted}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {active ? (
                  <View style={{ marginLeft: 'auto' as any, width: 6, height: 6, borderRadius: 3, backgroundColor: KB.gold }} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* User footer */}
        {user ? (
          <View style={styles.sidebarFooter}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile' as any)}
              style={({ pressed }) => [styles.userRow, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {(user.username ?? user.email ?? 'U')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.userName} numberOfLines={1}>
                {user.username ?? user.email?.split('@')[0] ?? 'User'}
              </Text>
              <MaterialIcons name="settings" size={16} color={KB.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Main content area (offset by sidebar) with moodprint watermark background */}
      <View style={styles.mainContent}>
        {/* Fullscreen moodprint watermark — desktop web only */}
        <View pointerEvents="none" style={styles.bgWatermark}>
          <Image
            source={require('@/assets/moodprint-icon.png')}
            style={styles.bgImage}
            contentFit="contain"
            transition={0}
          />
        </View>
        {children}
      </View>
    </View>
  );
}

/**
 * Wraps screen content with a max-width container on desktop web.
 * Use inside SafeAreaView's scroll content.
 */
export function WebMaxWidth({ children, style }: { children: React.ReactNode; style?: any }) {
  const isDesktop = useIsDesktopWeb();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={[{ width: '100%', alignSelf: 'center', maxWidth: WEB_MAX_CONTENT_WIDTH }, style]}>
      {children}
    </View>
  );
}
