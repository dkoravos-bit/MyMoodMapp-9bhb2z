/**
 * MyMoodMapp design tokens (redesign, Oct 2026).
 *
 * One committed look: a night-sky ground with the app icon's fingerprint
 * colours given meaning — teal = Mind, amber = Energy, coral = Body, violet = Focus.
 * Every screen in the redesign takes colour, type and spacing from here.
 */
import { Platform } from 'react-native';

export const C = {
  bg: '#07080F',
  bgRaised: '#0B0C16',
  surface: '#10121C',
  surface2: '#171A27',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  ink: '#F4F1EA',
  inkSoft: '#E6E3DC',
  muted: '#A3A8BD',
  faint: '#7C8199',
  scrim: 'rgba(7,8,15,0.55)',

  mind: '#3DD6C6',
  mindInk: '#8FEBE0',
  energy: '#F5B54A',
  energyInk: '#F8CB7A',
  body: '#FF8A70',
  bodyInk: '#FFB09C',
  focus: '#A88BFF',
  focusInk: '#C4B0FF',

  /** Calendar / heat scale — low → high. Never red, never grey. */
  scale: ['#4B3C80', '#7E68D6', '#2C9C91', '#3DD6C6', '#F5B54A'],
} as const;

export const DIM = {
  mind: { label: 'Mind', color: C.mind, ink: C.mindInk },
  energy: { label: 'Energy', color: C.energy, ink: C.energyInk },
  body: { label: 'Body', color: C.body, ink: C.bodyInk },
  focus: { label: 'Focus', color: C.focus, ink: C.focusInk },
} as const;
export type DimKey = keyof typeof DIM;
export const DIM_KEYS: DimKey[] = ['mind', 'energy', 'body', 'focus'];

/** Font family names registered in app/_layout.tsx via @expo-google-fonts. */
export const F = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const T = {
  hero: { fontFamily: F.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.4 },
  h1: { fontFamily: F.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.2 },
  h2: { fontFamily: F.displaySemi, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: F.displaySemi, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  bodySemi: { fontFamily: F.bodySemi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  smallSemi: { fontFamily: F.bodySemi, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: F.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 1.1 },
  tiny: { fontFamily: F.bodySemi, fontSize: 11, lineHeight: 14 },
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const R = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const tabularNums = Platform.select({ default: { fontVariant: ['tabular-nums' as const] } });
