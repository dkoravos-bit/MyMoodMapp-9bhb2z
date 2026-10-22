/**
 * Honest numbers for the redesign: daily aggregation, drivers, rhythm, streaks
 * and the art inputs. Everything here is computed only from the user's own data —
 * no preset "expected" weights (the old computeTagCorrelations blended those in).
 */
import { MoodLogEntry, CONTEXT_TAGS, TimeOfDay } from '@/constants/moodlog';
import type { DailyFitnessEntry } from '@/services/fitness';
import { ArtInput } from '@/supabase/functions/_shared/moodArtSpec';

export const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
};
export const weekday = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

/** Dimensions normalised to 0–1 (body/mind are stored −1..1). */
export function dims01(e: MoodLogEntry) {
  return {
    mind: (e.dimensions.mind + 1) / 2,
    energy: e.dimensions.energy,
    body: (e.dimensions.body + 1) / 2,
    focus: e.dimensions.focus,
  };
}

/** Honest score: the four dimensions only, equal weight, 0–100. */
export function honestScore(d: { mind: number; energy: number; body: number; focus: number }) {
  return Math.round(((d.mind + d.energy + d.body + d.focus) / 4) * 100);
}

export interface Day {
  date: string;
  avg: number;
  count: number;
  dims: { mind: number; energy: number; body: number; focus: number };
  tags: Set<string>;
  entries: MoodLogEntry[];
}

export function byDay(entries: MoodLogEntry[]): Map<string, Day> {
  const map = new Map<string, Day>();
  for (const e of entries) {
    let d = map.get(e.date);
    if (!d) { d = { date: e.date, avg: 0, count: 0, dims: { mind: 0, energy: 0, body: 0, focus: 0 }, tags: new Set(), entries: [] }; map.set(e.date, d); }
    d.entries.push(e);
  }
  for (const d of map.values()) {
    d.entries.sort((a, b) => a.timestamp - b.timestamp);
    d.count = d.entries.length;
    d.avg = Math.round(d.entries.reduce((s, e) => s + e.score, 0) / d.count);
    const sum = { mind: 0, energy: 0, body: 0, focus: 0 };
    for (const e of d.entries) {
      const x = dims01(e);
      sum.mind += x.mind; sum.energy += x.energy; sum.body += x.body; sum.focus += x.focus;
      [e.primaryTag, ...(e.additionalTags ?? [])].filter(Boolean).forEach(t => d!.tags.add(t));
    }
    d.dims = { mind: sum.mind / d.count, energy: sum.energy / d.count, body: sum.body / d.count, focus: sum.focus / d.count };
  }
  return map;
}

export const sortedByTime = (entries: MoodLogEntry[]) => [...entries].sort((a, b) => a.timestamp - b.timestamp);
export const latestEntry = (entries: MoodLogEntry[]) => entries.reduce<MoodLogEntry | null>((m, e) => (!m || e.timestamp > m.timestamp ? e : m), null);

// ── Streak: forgiving — one rest day per rolling 7 days doesn't break it ──────

export function forgivingStreak(entries: MoodLogEntry[], today = localDate()) {
  const days = new Set(entries.map(e => e.date));
  // Today is still open, so the walk starts at today if logged, otherwise yesterday.
  // Counts logged days; a single missed day inside any 7-day span is a free rest day.
  let streak = 0; const rests: string[] = []; let cursor = days.has(today) ? today : addDays(today, -1);
  for (let i = 0; i < 3650; i++) {
    if (days.has(cursor)) { streak++; }
    else {
      const restNearby = rests.some(r => r <= addDays(cursor, 6));
      if (restNearby || streak === 0 || !days.has(addDays(cursor, -1))) break;
      rests.push(cursor);
    }
    cursor = addDays(cursor, -1);
  }
  const weekStart = addDays(today, -6);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: d, logged: days.has(d), today: d === today, rest: rests.includes(d) };
  });
  const restLeft = rests.some(r => r >= weekStart) ? 0 : 1;
  return { streak, week, restLeft, loggedToday: days.has(today) };
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export type Confidence = 'Strong' | 'Likely' | 'Hunch';
export interface Driver {
  key: string;
  name: string;
  group: 'body' | 'habits' | 'world';
  effect: number;         // points vs days without
  withDays: number;
  withoutDays: number;
  confidence: Confidence;
  note: string;
}

function welch(a: number[], b: number[]) {
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const v = (x: number[], m: number) => x.length > 1 ? x.reduce((s, y) => s + (y - m) ** 2, 0) / (x.length - 1) : 0;
  const ma = mean(a), mb = mean(b);
  const se = Math.sqrt(v(a, ma) / a.length + v(b, mb) / b.length) || 1;
  return { diff: ma - mb, t: (ma - mb) / se };
}

function confidenceOf(t: number, nWith: number, nWithout: number): Confidence {
  const n = Math.min(nWith, nWithout);
  if (Math.abs(t) >= 2.5 && n >= 8) return 'Strong';
  if (Math.abs(t) >= 1.8 && n >= 4) return 'Likely';
  return 'Hunch';
}

const TAG_GROUP = (cat: string): Driver['group'] => cat === 'health' ? 'body' : cat === 'environment' ? 'world' : 'habits';

/**
 * Drivers from the user's own days only. A driver needs at least 3 days with it
 * and 3 without. Health data uses next-day mood for sleep (sleep precedes the day).
 */
export function computeDrivers(entries: MoodLogEntry[], fitness: DailyFitnessEntry[] = []): Driver[] {
  const days = [...byDay(entries).values()];
  if (days.length < 6) return [];
  const out: Driver[] = [];

  const tagIds = new Set<string>();
  days.forEach(d => d.tags.forEach(t => tagIds.add(t)));
  for (const id of tagIds) {
    const w = days.filter(d => d.tags.has(id)).map(d => d.avg);
    const wo = days.filter(d => !d.tags.has(id)).map(d => d.avg);
    if (w.length < 3 || wo.length < 3) continue;
    const { diff, t } = welch(w, wo);
    const tag = CONTEXT_TAGS.find(x => x.id === id);
    if (!tag) continue;
    out.push({ key: `tag:${id}`, name: tag.label, group: TAG_GROUP(tag.category), effect: Math.round(diff), withDays: w.length, withoutDays: wo.length, confidence: confidenceOf(t, w.length, wo.length), note: `Days you tagged “${tag.label}” vs days you didn't` });
  }

  // Health drivers: compare your mood on days a health signal was "on" vs "off".
  // Only days that actually have that signal count — missing data is never treated as zero.
  const fit = new Map(fitness.map(f => [f.date, f]));
  const healthDriver = (key: string, name: string, note: string, value: (f: DailyFitnessEntry) => number | null | undefined, on: (v: number, all: number[]) => boolean) => {
    const pairs = days.map(d => { const f = fit.get(d.date); const v = f ? value(f) : null; return { d, v }; }).filter(x => x.v != null) as { d: Day; v: number }[];
    if (pairs.length < 6) return;
    const all = pairs.map(x => x.v);
    const w = pairs.filter(x => on(x.v, all)).map(x => x.d.avg); const wo = pairs.filter(x => !on(x.v, all)).map(x => x.d.avg);
    if (w.length < 3 || wo.length < 3) return;
    const { diff, t } = welch(w, wo);
    out.push({ key, name, group: 'body', effect: Math.round(diff), withDays: w.length, withoutDays: wo.length, confidence: confidenceOf(t, w.length, wo.length), note });
  };
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const synced = (f: DailyFitnessEntry) => f.steps > 0 || f.sleepHours != null || f.restingHeartRate != null || f.hrvMs != null || f.workoutMinutes > 0;
  healthDriver('sleep7', '7+ hours of sleep', 'From your sleep data, the night before', f => f.sleepHours, v => v >= 7);
  healthDriver('steps7k', '7,000+ steps', 'From your step count that day', f => (f.steps > 0 ? f.steps : null), v => v >= 7000);
  healthDriver('workout', 'A workout (20+ min)', 'Days with a logged workout vs days without', f => (synced(f) ? f.workoutMinutes : null), v => v >= 20);
  healthDriver('daylight30', '30+ min in daylight', 'Time in daylight, measured by your Apple Watch', f => f.daylightMinutes, v => v >= 30);
  healthDriver('mindful', 'Mindful minutes', 'Days with a mindfulness session vs days without', f => (synced(f) ? (f.mindfulMinutes ?? 0) : null), v => v > 0);
  healthDriver('hrvHigh', 'Higher HRV than usual', 'Heart rate variability above your own typical level — a recovery signal', f => f.hrvMs, (v, all) => v > median(all));

  // Weekends
  const we = days.filter(d => [0, 6].includes(weekday(d.date))).map(d => d.avg);
  const wd = days.filter(d => ![0, 6].includes(weekday(d.date))).map(d => d.avg);
  if (we.length >= 3 && wd.length >= 3) { const { diff, t } = welch(we, wd); out.push({ key: 'weekend', name: 'Weekends', group: 'world', effect: Math.round(diff), withDays: we.length, withoutDays: wd.length, confidence: confidenceOf(t, we.length, wd.length), note: 'Saturdays and Sundays vs weekdays' }); }

  const rank = { Strong: 0, Likely: 1, Hunch: 2 };
  return out
    .filter(d => d.effect !== 0)
    .sort((a, b) => rank[a.confidence] - rank[b.confidence] || Math.abs(b.effect) - Math.abs(a.effect));
}

export function confidenceLabel(d: Driver) {
  if (d.confidence !== 'Hunch') return `${d.withDays} days · ${d.confidence}`;
  const need = Math.max(0, 8 - Math.min(d.withDays, d.withoutDays));
  return need > 0 ? `${d.withDays} days · Hunch — ${need} more to confirm` : `${d.withDays} days · Hunch — too mixed to say`;
}

// ── Rhythm (honest forecast) ─────────────────────────────────────────────────

const SLOTS: { tod: TimeOfDay; hour: number; label: string }[] = [
  { tod: 'morning', hour: 9, label: 'Morning' },
  { tod: 'afternoon', hour: 14, label: 'Afternoon' },
  { tod: 'evening', hour: 19, label: 'Evening' },
  { tod: 'night', hour: 22, label: 'Night' },
];

export interface Rhythm {
  ready: boolean;
  daysUsed: number;
  points: { label: string; hour: number; value: number; band: number }[];
  low?: { label: string; value: number };
  best?: { label: string; value: number };
  factors: { label: string; delta: number }[];
  typicalError: number;
}

export function computeRhythm(entries: MoodLogEntry[], fitness: DailyFitnessEntry[], drivers: Driver[], today = localDate()): Rhythm {
  const days = byDay(entries);
  if (days.size < 7) return { ready: false, daysUsed: days.size, points: [], factors: [], typicalError: 0 };
  const all = entries.map(e => e.score);
  const base = all.reduce((s, v) => s + v, 0) / all.length;
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - base) ** 2, 0) / all.length);

  const wdToday = weekday(today);
  const wdEntries = entries.filter(e => weekday(e.date) === wdToday);
  const wdDelta = wdEntries.length >= 3 ? wdEntries.reduce((s, e) => s + e.score, 0) / wdEntries.length - base : 0;

  const factors: { label: string; delta: number }[] = [];
  const sleep = fitness.find(f => f.date === today)?.sleepHours ?? null;
  const sleepDriver = drivers.find(d => d.key === 'sleep7' && d.confidence !== 'Hunch');
  let sleepAdj = 0;
  if (sleep != null && sleepDriver) {
    sleepAdj = sleep >= 7 ? Math.max(0, sleepDriver.effect) / 2 : -Math.max(0, sleepDriver.effect) / 2;
    factors.push({ label: `${sleep >= 7 ? 'Good' : 'Short'} sleep (${fmtHours(sleep)})`, delta: Math.round(sleepAdj) });
  }
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wdToday];
  factors.push({ label: `Your usual ${dayName}`, delta: Math.round(wdDelta) });

  const points = SLOTS.map(s => {
    const es = entries.filter(e => e.timeOfDay === s.tod);
    const v = es.length >= 2 ? es.reduce((a, e) => a + e.score, 0) / es.length : base;
    const vsd = es.length >= 2 ? Math.sqrt(es.reduce((a, e) => a + (e.score - v) ** 2, 0) / es.length) : sd;
    return { label: s.label, hour: s.hour, value: Math.round(Math.max(0, Math.min(100, v + wdDelta + sleepAdj))), band: Math.round(Math.max(4, vsd)) };
  });
  const low = points.reduce((m, p) => (p.value < m.value ? p : m));
  const best = points.reduce((m, p) => (p.value > m.value ? p : m));
  return { ready: true, daysUsed: days.size, points, low, best, factors, typicalError: Math.round(Math.max(4, sd * 0.8)) };
}

export const fmtHours = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;

// ── Art inputs ────────────────────────────────────────────────────────────────

function slopePerDay(days: Day[]) {
  if (days.length < 3) return 0;
  const xs = days.map((_, i) => i); const ys = days.map(d => d.avg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1;
  return num / den;
}

/** Build the spec's ArtInput for a window of days ending today. */
export function artInputFor(entries: MoodLogEntry[], fitness: DailyFitnessEntry[], weather: string | null, windowDays: number, today = localDate()): ArtInput | null {
  const from = addDays(today, -(windowDays - 1));
  const inWin = entries.filter(e => e.date >= from && e.date <= today);
  const use = inWin.length ? inWin : (latestEntry(entries) ? [latestEntry(entries)!] : []);
  if (!use.length) return null;
  const n = use.length;
  const sum = { mind: 0, energy: 0, body: 0, focus: 0 };
  use.forEach(e => { const d = dims01(e); sum.mind += d.mind; sum.energy += d.energy; sum.body += d.body; sum.focus += d.focus; });
  const dims = { mind: sum.mind / n, energy: sum.energy / n, body: sum.body / n, focus: sum.focus / n };
  const recentDays = [...byDay(entries.filter(e => e.date >= addDays(today, -13))).values()].sort((a, b) => a.date.localeCompare(b.date));
  const scores = recentDays.map(d => d.avg);
  const m = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const sd = scores.length > 1 ? Math.sqrt(scores.reduce((s, v) => s + (v - m) ** 2, 0) / scores.length) : 0;
  const tagCounts = new Map<string, number>();
  use.forEach(e => [e.primaryTag, ...(e.additionalTags ?? [])].filter(Boolean).forEach(t => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const fit = fitness.find(f => f.date === today) ?? null;
  const win = fitness.filter(f => f.date >= from && f.date <= today);
  return {
    score: Math.round(use.reduce((s, e) => s + e.score, 0) / n),
    ...dims,
    volatilitySd: sd,
    trendPerDay: slopePerDay(recentDays),
    tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    sleepHours: windowDays === 1 ? fit?.sleepHours ?? null : avgOf(fitness.filter(f => f.date >= from).map(f => f.sleepHours)),
    steps: windowDays === 1 ? fit?.steps ?? null : avgOf(fitness.filter(f => f.date >= from).map(f => f.steps)),
    // Workouts: 0 is a real value on synced days, so average including zeros (only over synced days).
    workoutMinutes: windowDays === 1 ? (fit && synced(fit) ? fit.workoutMinutes : null) : meanOf(win.filter(synced).map(f => f.workoutMinutes)),
    daylightMinutes: windowDays === 1 ? fit?.daylightMinutes ?? null : meanOf(win.map(f => f.daylightMinutes)),
    hrvMs: windowDays === 1 ? fit?.hrvMs ?? null : meanOf(win.map(f => f.hrvMs)),
    hrvBaselineMs: hrvBaseline(fitness, today),
    weather,
    logCount: entries.length,
  };
}
const avgOf = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === 'number' && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const meanOf = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const synced = (f: DailyFitnessEntry) => f.steps > 0 || f.sleepHours != null || f.restingHeartRate != null || f.hrvMs != null || f.workoutMinutes > 0;
/** The user's typical HRV: median of the 30 days before today. Needs 5+ readings. */
function hrvBaseline(fitness: DailyFitnessEntry[], today: string): number | null {
  const from = addDays(today, -30);
  const v = fitness.filter(f => f.date >= from && f.date < today && f.hrvMs != null).map(f => f.hrvMs!).sort((a, b) => a - b);
  return v.length >= 5 ? v[Math.floor(v.length / 2)] : null;
}

export const SCALE_INDEX = (score: number) => score < 50 ? 0 : score < 60 ? 1 : score < 67 ? 2 : score < 76 ? 3 : 4;

// ── Health data only when the user connected it (there is no sample/mock data) ──
import { useApp } from '@/hooks/useApp';
export function useRealFitness(): DailyFitnessEntry[] {
  const { fitnessData, fitnessPermission } = useApp();
  return fitnessPermission?.granted ? fitnessData : [];
}
