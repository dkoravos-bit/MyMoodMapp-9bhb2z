/**
 * Four tabs plus a centre Log button: Today · Mapp · (+) · Learn · Circle.
 */
import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, T } from '@/ui/tokens';
import { tap } from '@/ui/primitives';

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={4} fill="none" stroke={c} strokeWidth={1.8} /><Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke={c} strokeWidth={1.8} strokeLinecap="round" /></Svg>
  ),
  mapp: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 3l9 9-9 9-9-9z" fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round" /><Path d="M12 8l4 4-4 4-4-4z" fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round" /></Svg>
  ),
  learn: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 19V11M10 19V5M16 19v-6M22 19H2" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" /></Svg>
  ),
  circle: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={9} cy={10} r={3.5} fill="none" stroke={c} strokeWidth={1.8} /><Circle cx={16.5} cy={11} r={2.5} fill="none" stroke={c} strokeWidth={1.8} /><Path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5M15 15c2.6-.4 4.8.8 5.5 3.5" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" /></Svg>
  ),
};
const LABELS: Record<string, string> = { index: 'Today', mapp: 'Mapp', learn: 'Learn', circle: 'Circle' };

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const routes = state.routes.filter(r => LABELS[r.name]);
  const left = routes.slice(0, 2); const right = routes.slice(2);
  const item = (r: typeof routes[number]) => {
    const focused = state.routes[state.index]?.key === r.key;
    const color = focused ? C.ink : C.faint;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={LABELS[r.name]}
        onPress={() => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
        }}
        style={{ flex: 1, alignItems: 'center', gap: 4, paddingTop: 8, minHeight: 48 }}
      >
        {ICONS[r.name](color)}
        <Text style={[T.tiny, { color }]}>{LABELS[r.name]}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.bgRaised, borderTopWidth: 1, borderTopColor: C.line, paddingBottom: Math.max(insets.bottom, 10) }}>
      {left.map(item)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log how you feel"
          onPress={() => { tap('medium'); router.push('/log'); }}
          style={({ pressed }) => ({ width: 58, height: 58, marginTop: -18, borderRadius: 29, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 })}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={C.bg} strokeWidth={2.2} strokeLinecap="round" /></Svg>
        </Pressable>
      </View>
      {right.map(item)}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mapp" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="circle" />
    </Tabs>
  );
}
