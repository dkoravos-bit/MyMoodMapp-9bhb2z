/**
 * Mood Art Spec — the single source of truth for MyMoodMapp's art.
 *
 * Shared by the app (imported via '@/supabase/functions/_shared/moodArtSpec')
 * and by the generate-mood-art edge function. Pure TypeScript, no imports, so
 * it runs unchanged in React Native, the browser and Deno.
 *
 * One trait vector drives everything: the live Mood Field, the palette, the
 * AI plate prompt, the legend, the alt text, the day name and the archetype.
 * Because every output reads the same vector, the legend can never drift from
 * the art (the bug in the previous version).
 *
 * Rules (see "Mood art wow factor" research):
 *  - Low mood is night / harbour / rest — never black, grey, red, cracks or ruins.
 *  - Volatility is wind and tide — never lightning or strobing.
 *  - Rewards logging, not being happy. Missed days leave no mark.
 *  - No raw health labels are ever sent to an image provider — only shapes and colours.
 *  - Missing health data is never drawn as a bad value: unknown sleep shows faint neutral stars,
 *    unknown daylight / HRV simply leave their element out.
 *
 * v2 (Oct 2026): sun = time in daylight, halo/mist = HRV vs your own baseline,
 * trails = steps + workouts, and the legend knows when sleep isn't connected.
 */

export const SPEC_VERSION = 2;
/** Composition seed version — kept at 1 so each user's composition stays theirs across spec updates. */
const SEED_VERSION = 1;

export type Tone = 'mirror' | 'calm' | 'lift';
export type ArtLayer = 'now' | 'week' | 'month';

/** Raw inputs, already normalised by the caller. */
export interface ArtInput {
  /** 0–100 overall score */
  score: number;
  /** 0–1 each */
  mind: number;
  energy: number;
  body: number;
  focus: number;
  /** Standard deviation of recent scores (0–100 scale). */
  volatilitySd: number;
  /** Slope of recent daily averages, points per day. */
  trendPerDay: number;
  /** Context tag ids from the log(s). */
  tags: string[];
  sleepHours?: number | null;
  steps?: number | null;
  /** Minutes in daylight (Apple Watch, iOS 17+). */
  daylightMinutes?: number | null;
  /** Workout minutes in the window (per day when averaged). */
  workoutMinutes?: number | null;
  /** Heart rate variability and the user's own typical level (ms). */
  hrvMs?: number | null;
  hrvBaselineMs?: number | null;
  /** Free-form weather condition, e.g. 'clear', 'rain', 'cloudy'. */
  weather?: string | null;
  /** Total number of logs the user has ever made. */
  logCount: number;
}

export interface Traits {
  v: number;
  /** Score bucketed to 5 points (used for colour + cache). */
  scoreBucket: number;
  /** Dimensions as deciles 0–10. */
  mind: number;
  energy: number;
  body: number;
  focus: number;
  air: 'still' | 'breeze' | 'wind';
  trend: 'rising' | 'steady' | 'settling';
  motifs: string[];
  /** 0–3 */
  stars: number;
  /** 0–3 */
  trails: number;
  /** false when there is no sleep data (stars are then neutral, not "bad sleep"). */
  sleepKnown: boolean;
  /** Time in daylight 0–3, null when unknown. */
  sun: number | null;
  /** HRV vs the user's own baseline, null when unknown. */
  recovery: 'low' | 'usual' | 'high' | null;
  sky: 'clear' | 'cloud' | 'rain' | 'snow' | 'fog' | null;
  tone: Tone;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const decile = (v: number) => clamp(Math.round(v * 10), 0, 10);

/** Tag id → a small recognisable motif in the scene. Curated, never free text. */
const MOTIFS: Record<string, string> = {
  sunlight: 'sailboat', sunlight_long: 'sailboat', nature_time: 'pine',
  exercise: 'trail', exercise_intense: 'trail', light_movement: 'trail',
  deep_connection: 'birds', social_energizing: 'birds', social_fun: 'birds', quality_family: 'birds',
  romantic_positive: 'birds', helped_someone: 'birds', received_support: 'birds',
  meditation: 'lantern', breathing_ex: 'lantern', journalled: 'lantern', gratitude: 'lantern', therapy_coaching: 'lantern',
  creative_work: 'kite', accomplished: 'kite', big_event_done: 'kite', learned_something: 'kite',
  sleep_great: 'moon', sleep_good: 'moon', napped: 'moon', rest_day: 'moon',
  travel: 'bridge', clean_space: 'house', leisure_time: 'kite', alone_time: 'lantern',
};

export const MOTIF_LABEL: Record<string, string> = {
  sailboat: 'The little boat — you got outside',
  pine: 'The pines — time in nature',
  trail: 'The trail — you moved your body',
  birds: 'The birds — time with people',
  lantern: 'The lantern — a mindful moment',
  kite: 'The kite — something you made or did',
  moon: 'The moon — real rest',
  bridge: 'The bridge — you travelled',
  house: 'The house — your space felt good',
};

function weatherBucket(w?: string | null): Traits['sky'] {
  if (!w) return null;
  const s = w.toLowerCase();
  if (/snow|sleet/.test(s)) return 'snow';
  if (/rain|drizzle|shower|storm|thunder/.test(s)) return 'rain';
  if (/fog|mist|haze/.test(s)) return 'fog';
  if (/cloud|overcast/.test(s)) return 'cloud';
  return 'clear';
}

export function toTraits(input: ArtInput, tone: Tone = 'mirror'): Traits {
  const motifs: string[] = [];
  for (const t of input.tags) {
    const m = MOTIFS[t];
    if (m && !motifs.includes(m)) motifs.push(m);
    if (motifs.length >= 3) break;
  }
  const sd = input.volatilitySd;
  const sleep = input.sleepHours ?? null;
  const steps = input.steps ?? null;
  const workout = input.workoutMinutes ?? null;
  const daylight = input.daylightMinutes ?? null;
  const hrv = input.hrvMs ?? null, base = input.hrvBaselineMs ?? null;
  const stepTrails = steps == null ? 0 : steps >= 10000 ? 3 : steps >= 6000 ? 2 : steps >= 2500 ? 1 : 0;
  const workoutTrails = workout == null ? 0 : workout >= 45 ? 3 : workout >= 20 ? 2 : workout > 0 ? 1 : 0;
  return {
    v: SPEC_VERSION,
    scoreBucket: clamp(Math.round(input.score / 5) * 5, 0, 100),
    mind: decile(input.mind),
    energy: decile(input.energy),
    body: decile(input.body),
    focus: decile(input.focus),
    air: sd < 8 ? 'still' : sd < 16 ? 'breeze' : 'wind',
    trend: input.trendPerDay > 0.8 ? 'rising' : input.trendPerDay < -0.8 ? 'settling' : 'steady',
    motifs,
    stars: sleep == null ? 1 : sleep >= 7.5 ? 3 : sleep >= 6.5 ? 2 : sleep >= 5 ? 1 : 0,
    trails: Math.max(stepTrails, workoutTrails),
    sleepKnown: sleep != null,
    sun: daylight == null ? null : daylight >= 60 ? 3 : daylight >= 30 ? 2 : daylight >= 10 ? 1 : 0,
    recovery: hrv == null || base == null || base <= 0 ? null : hrv >= base * 1.1 ? 'high' : hrv <= base * 0.9 ? 'low' : 'usual',
    sky: weatherBucket(input.weather),
    tone,
  };
}

// ── Colour ────────────────────────────────────────────────────────────────────

export const BRAND = {
  night: '#07080F',
  ink: '#F4F1EA',
  mind: '#3DD6C6',
  energy: '#F5B54A',
  body: '#FF8A70',
  focus: '#A88BFF',
};

const RAMP = { violet: '#4A3496', teal: '#1F8C83', amber: '#E9A23B' };

function hexToRgb(h: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
export function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a); const pb = hexToRgb(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join('');
}

/** The score used for colour after the user's chosen tone (palette only — never the data). */
export function toneScore(t: Traits): number {
  const s = t.scoreBucket;
  if (t.tone === 'calm') return Math.round(s + (55 - s) * 0.5);
  if (t.tone === 'lift') return Math.min(95, s + 18);
  return s;
}

export interface Palette {
  base: string; deep: string; light: string; accent: string; horizon: string;
  /** The three hexes sent to the image model. */
  hexes: string[];
}

export function palette(t: Traits): Palette {
  const s = toneScore(t);
  const base = s < 50 ? mixHex(RAMP.violet, RAMP.teal, s / 50) : mixHex(RAMP.teal, RAMP.amber, (s - 50) / 50);
  const deep = mixHex(base, BRAND.night, 0.7);
  const light = mixHex(base, BRAND.ink, 0.35);
  const accent = s < 50 ? BRAND.focus : s < 70 ? BRAND.mind : BRAND.body;
  const horizon = t.trend === 'rising' ? mixHex(base, RAMP.amber, 0.45) : t.trend === 'settling' ? mixHex(base, RAMP.violet, 0.35) : light;
  return { base, deep, light, accent, horizon, hexes: [deep, base, horizon] };
}

// ── Words ─────────────────────────────────────────────────────────────────────

const COLOR_WORD = (s: number) => s < 35 ? 'violet' : s < 50 ? 'dusk' : s < 65 ? 'teal' : s < 80 ? 'sea-gold' : 'amber';
const TEXTURE = (t: Traits) => {
  if (t.scoreBucket < 35) return t.air === 'wind' ? 'Night-tide' : 'Quiet-harbour';
  if (t.scoreBucket < 55) return t.air === 'still' ? 'Slow-tide' : 'Soft-wind';
  if (t.scoreBucket < 75) return t.focus >= 6 ? 'Clear-current' : 'Wandering-current';
  return t.energy >= 6 ? 'Bright-wind' : 'Warm-light';
};
const PART_OF_DAY = (h: number) => h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Rule-built day name, Daylist-style. Never uses clinical or judgemental words. */
export function dayName(t: Traits, at: Date = new Date()): string {
  const useDay = (at.getDate() + t.scoreBucket) % 2 === 0;
  const when = useDay ? WEEKDAY[at.getDay()] : PART_OF_DAY(at.getHours());
  return `${TEXTURE(t)} ${COLOR_WORD(toneScore(t))} ${when}`;
}

export interface Archetype { id: string; name: string; line: string }

/** Monthly archetype from the month's traits (top two characteristics). */
export function archetype(t: Traits): Archetype {
  const s = t.scoreBucket;
  if (s < 45) {
    if (t.air === 'wind') return { id: 'lighthouse', name: 'The Lighthouse', line: 'Steady light through rough water' };
    return { id: 'night-harbour', name: 'The Night Harbour', line: 'A month of rest and shelter' };
  }
  if (s < 65) {
    if (t.focus >= 6) return { id: 'tidekeeper', name: 'The Tidekeeper', line: 'Steady teal, clear focus' };
    if (t.trend === 'rising') return { id: 'first-light', name: 'First Light', line: 'Quietly brightening' };
    return { id: 'wanderer', name: 'The Wanderer', line: 'Curious, unhurried, open' };
  }
  if (s < 80) {
    if (t.energy >= 7) return { id: 'current', name: 'The Current', line: 'Moving with purpose' };
    if (t.body >= 7) return { id: 'hearth', name: 'The Hearth', line: 'Warm and grounded' };
    return { id: 'tidekeeper', name: 'The Tidekeeper', line: 'Steady teal, clear focus' };
  }
  if (t.air === 'wind') return { id: 'ember', name: 'The Ember', line: 'Bright, quick, alive' };
  if (t.energy >= 7) return { id: 'sunrunner', name: 'The Sunrunner', line: 'Golden and in motion' };
  return { id: 'daybreak', name: 'Daybreak', line: 'Warm light, open sky' };
}

const AIR_WORD = { still: 'calm water', breeze: 'a gentle breeze', wind: 'wind and tide' } as const;
const DECILE_WORD = (d: number, lo: string, mid: string, hi: string) => d >= 7 ? hi : d >= 4 ? mid : lo;

export interface LegendRow { label: string; meaning: string; key: 'mind' | 'energy' | 'body' | 'focus' | 'air' | 'stars' | 'trails' | 'sun' | 'recovery' | 'motif' }

const SUN_LABEL = ['A hidden sun', 'A low sun', 'Bright sun', 'Brilliant sun'];

/** The legend, generated from the same traits as the art. */
export function legend(t: Traits, layer: ArtLayer = 'now'): LegendRow[] {
  const day = layer === 'now';
  const rows: LegendRow[] = [
    { key: 'mind', label: DECILE_WORD(t.mind, 'Hazy sky', 'Soft sky', 'Clear sky'), meaning: `Mind ${t.mind * 10}` },
    { key: 'energy', label: DECILE_WORD(t.energy, 'Slow current', 'Unhurried current', 'Quick current'), meaning: `Energy ${t.energy * 10}` },
    { key: 'body', label: DECILE_WORD(t.body, 'Cool glow', 'Soft glow', 'Warm glow'), meaning: `Body ${t.body * 10}` },
    { key: 'focus', label: DECILE_WORD(t.focus, 'Scattered strokes', 'Loose streams', 'Smooth streams'), meaning: `Focus ${t.focus * 10}` },
    { key: 'air', label: AIR_WORD[t.air][0].toUpperCase() + AIR_WORD[t.air].slice(1), meaning: t.air === 'still' ? 'Even days lately' : t.air === 'breeze' ? 'Some ups and downs' : 'Big swings lately' },
    t.sleepKnown
      ? { key: 'stars', label: ['No stars', 'A few stars', 'Starry', 'Full of stars'][t.stars], meaning: day ? 'Last night\'s sleep' : 'Your sleep' }
      : { key: 'stars', label: 'Faint stars', meaning: 'Sleep isn\'t connected — connect Apple Health or Health Connect' },
  ];
  if (t.sun != null) rows.push({ key: 'sun', label: SUN_LABEL[t.sun], meaning: day ? 'Time in daylight today' : 'Time in daylight' });
  if (t.trails > 0) rows.push({ key: 'trails', label: ['', 'A faint path', 'A clear path', 'Many paths'][t.trails], meaning: day ? 'Steps and workouts today' : 'Steps and workouts' });
  if (t.recovery === 'high') rows.push({ key: 'recovery', label: 'A soft halo', meaning: 'Well rested — heart rate variability above your usual' });
  if (t.recovery === 'low') rows.push({ key: 'recovery', label: 'Low mist', meaning: 'Recovering — heart rate variability below your usual' });
  for (const m of t.motifs) rows.push({ key: 'motif', label: MOTIF_LABEL[m]?.split(' — ')[0] ?? m, meaning: MOTIF_LABEL[m]?.split(' — ')[1] ?? '' });
  return rows;
}

export function altText(t: Traits): string {
  const p = COLOR_WORD(toneScore(t));
  return `Mood art: a ${p} sea and sky with ${AIR_WORD[t.air]}, ${t.sleepKnown ? ['no', 'a few', 'many', 'countless'][t.stars] : 'a few faint'} stars` +
    (t.sun != null ? `, ${SUN_LABEL[t.sun].toLowerCase()}` : '') +
    (t.trails > 0 ? `, ${['', 'a faint path', 'a clear path', 'many paths'][t.trails]}` : '') +
    (t.motifs.length ? `, and ${t.motifs.join(', ')}` : '') + '.';
}

// ── AI plate prompt ───────────────────────────────────────────────────────────

const MOTIF_PROMPT: Record<string, string> = {
  sailboat: 'one tiny sailboat far away on the water', pine: 'a small stand of pine trees on the shore',
  trail: 'a thin winding footpath along the shore', birds: 'two small birds flying together',
  lantern: 'a single warm lantern glowing on a distant jetty', kite: 'a small kite high in the sky',
  moon: 'a slim crescent moon', bridge: 'a delicate distant footbridge', house: 'a tiny lit cabin on the far shore',
};

/** Structured prompt for FLUX.2 [klein]. Contains no health words — only scene, shape and colour. */
export function platePrompt(t: Traits, layer: ArtLayer): string {
  const p = palette(t);
  const s = toneScore(t);
  const time = s < 40 ? 'deep blue night' : s < 55 ? 'late dusk' : s < 72 ? 'clear early evening' : 'golden sunrise';
  const sky = DECILE_WORD(t.mind, 'soft haze over the sky', 'thin high clouds', 'crystal clear sky');
  const water = t.air === 'still' ? 'mirror-calm water' : t.air === 'breeze' ? 'gently rippling water' : 'long rolling swells, no storm';
  const flow = DECILE_WORD(t.focus, 'loose scattered brushstrokes', 'flowing brushstrokes', 'smooth laminar streams of light');
  const glow = DECILE_WORD(t.body, 'cool soft light', 'gentle glow', 'warm luminous glow');
  const stars = t.sleepKnown ? ['no stars', 'a few faint stars', 'many stars', 'a dense field of stars'][t.stars] : 'a few faint stars';
  const motifs = t.motifs.map(m => MOTIF_PROMPT[m]).filter(Boolean);
  if (t.trails > 0) motifs.push(['', 'one thin glowing path winding along the shore', 'two glowing paths winding along the shore', 'several glowing paths winding through the hills and shore'][t.trails]);
  const sun = t.sun == null ? null : ['the sun hidden low behind soft cloud', 'a low soft sun near the horizon', 'bright sunlight glittering across the water', 'brilliant sunlight and sparkling water'][t.sun];
  const atmosphere = t.recovery === 'high' ? 'deep stillness, a soft luminous halo glowing in the sky'
    : t.recovery === 'low' ? 'a light veil of low mist drifting over the water' : null;
  const scene = layer === 'now'
    ? 'wide coastal seascape seen from a quiet shore'
    : layer === 'week' ? 'panoramic aerial coastline with seven gentle headlands receding into distance'
      : 'grand panoramic landscape of sea, hills and sky, poster composition';
  return JSON.stringify({
    style: 'MyMoodMapp house style: luminous painterly digital art, soft gradients, gentle bloom, dreamy and calm, high detail, no text',
    scene,
    time_of_day: time,
    sky: `${sky}, ${stars}`,
    water,
    light: glow,
    texture: flow,
    ...(sun ? { sunlight: sun } : {}),
    ...(atmosphere ? { atmosphere } : {}),
    horizon: t.trend === 'rising' ? 'horizon warming and brightening' : t.trend === 'settling' ? 'horizon cooling into soft violet' : 'balanced even horizon',
    details: motifs,
    palette_hex: p.hexes,
    accent_hex: p.accent,
    avoid: 'text, letters, people, faces, lightning, fire, ruins, cracks, skulls, dead trees, grey or black dominant tones',
  });
}

/** Deterministic cache key — same traits ⇒ same file, no regeneration. */
export function cacheKey(userId: string, layer: ArtLayer, t: Traits, period: string): string {
  const sig = [t.v, layer, period, t.scoreBucket, t.mind, t.energy, t.body, t.focus, t.air, t.trend, t.stars, t.trails, t.sky ?? '-', t.tone,
    t.sleepKnown ? 1 : 0, t.sun ?? '-', t.recovery ?? '-', ...t.motifs].join('.');
  let h = 2166136261;
  for (let i = 0; i < sig.length; i++) { h ^= sig.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${userId}/${layer}/${period}-${(h >>> 0).toString(36)}`;
}

/** Stable per-user, per-layer seed (Fidenza-style: each user's composition is their own). */
export function seedFor(userId: string, layer: ArtLayer): number {
  let h = 5381;
  const s = `${userId}:${layer}:${SEED_VERSION}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h % 2147483647;
}
