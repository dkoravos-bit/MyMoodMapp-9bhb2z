/**
 * Shared, platform-neutral pieces of the health service.
 *
 * Platform files (Metro picks one by extension):
 *   fitness.ios.ts      Apple Health via @kingstinct/react-native-healthkit (read + State of Mind write)
 *   fitness.android.ts  Health Connect via react-native-health-connect (read only — no mood type exists)
 *   fitness.ts          web / fallback: reads what the phone synced to the cloud
 *
 * There is no mock or sample data anywhere: if health data isn't connected, the app gets [].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';

export interface DailyFitnessEntry {
  date: string;                 // local YYYY-MM-DD
  steps: number;
  activeMinutes: number;        // exercise minutes (Apple Exercise ring / Health Connect sessions)
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  caloriesBurned: number;       // active energy, kcal
  workoutMinutes: number;
  sleepHours: number | null;    // time actually asleep, credited to the day you woke up
  hrvMs?: number | null;        // heart rate variability (SDNN on iOS, RMSSD on Android)
  mindfulMinutes?: number | null;
  daylightMinutes?: number | null; // iOS 17+ with an Apple Watch
  workouts?: number;
  heartRateSamples?: number[];
}

export interface FitnessSummary {
  avgDailySteps: number;
  avgActiveMinutes: number;
  avgRestingHR: number | null;
  avgSleepHours: number | null;
  workoutCount: number;
  highExerciseDays: number;
  lowExerciseDays: number;
  totalSteps: number;
  peakHRDay: string | null;
}

/** 'cloud' = data the phone synced, shown on web. 'none' = not connected. */
export type HealthSource = 'healthkit' | 'health_connect' | 'cloud' | 'none';
export interface FitnessPermissionStatus {
  granted: boolean;
  source: HealthSource;
  /** Set when the platform can't provide health data at all (e.g. Health Connect missing). */
  unavailable?: boolean;
}

export const NOT_CONNECTED: FitnessPermissionStatus = { granted: false, source: 'none' };

// New keys on purpose: the old app cached generated sample data under the old keys.
const DATA_KEY = 'health_daily_v2';
const STATUS_KEY = 'health_status_v2';
const WRITE_MOODS_KEY = 'health_write_moods';

export const localDay = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const startOfLocalDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function emptyDays(days: number, now = new Date()): Record<string, DailyFitnessEntry> {
  const out: Record<string, DailyFitnessEntry> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const k = localDay(d);
    out[k] = { date: k, steps: 0, activeMinutes: 0, restingHeartRate: null, avgHeartRate: null, caloriesBurned: 0, workoutMinutes: 0, sleepHours: null, hrvMs: null, mindfulMinutes: null, daylightMinutes: null, workouts: 0 };
  }
  return out;
}

/** Total minutes covered by a set of intervals, overlaps counted once (iPhone + Watch both record sleep). */
export function mergedMinutes(intervals: { start: number; end: number }[]): number {
  const s = intervals.filter(i => i.end > i.start).sort((a, b) => a.start - b.start);
  let total = 0, curS = -1, curE = -1;
  for (const i of s) {
    if (i.start > curE) { if (curE > curS) total += curE - curS; curS = i.start; curE = i.end; }
    else curE = Math.max(curE, i.end);
  }
  if (curE > curS) total += curE - curS;
  return total / 60000;
}

export const hasAnyValue = (e: DailyFitnessEntry) =>
  e.steps > 0 || e.sleepHours != null || e.restingHeartRate != null || e.avgHeartRate != null ||
  e.hrvMs != null || (e.mindfulMinutes ?? 0) > 0 || (e.daylightMinutes ?? 0) > 0 || e.workoutMinutes > 0;

export const sortDesc = (rows: DailyFitnessEntry[]) => rows.sort((a, b) => b.date.localeCompare(a.date));

// ── Local cache ──────────────────────────────────────────────────────────────
export async function getCachedFitnessData(): Promise<DailyFitnessEntry[]> {
  try { const raw = await AsyncStorage.getItem(DATA_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export async function cacheFitnessData(rows: DailyFitnessEntry[]) {
  try { await AsyncStorage.setItem(DATA_KEY, JSON.stringify(rows)); } catch {}
}
export async function getFitnessPermissionStatus(): Promise<FitnessPermissionStatus> {
  try { const raw = await AsyncStorage.getItem(STATUS_KEY); return raw ? JSON.parse(raw) : NOT_CONNECTED; } catch { return NOT_CONNECTED; }
}
export async function saveFitnessPermissionStatus(s: FitnessPermissionStatus) {
  try { await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(s)); } catch {}
}

// ── "Save moods to Apple Health" preference (off until the user turns it on) ──
export async function getMoodWriteEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(WRITE_MOODS_KEY)) === '1'; } catch { return false; }
}
export async function storeMoodWriteEnabled(on: boolean) {
  try { await AsyncStorage.setItem(WRITE_MOODS_KEY, on ? '1' : '0'); } catch {}
}

// ── Cloud (so the web app and the art pipeline see the same numbers) ─────────
export async function syncFitnessDataToCloud(entries: DailyFitnessEntry[], userId: string): Promise<void> {
  const rows = entries.filter(hasAnyValue).map(e => ({
    user_id: userId, date: e.date, steps: e.steps, active_minutes: e.activeMinutes,
    resting_heart_rate: e.restingHeartRate, avg_heart_rate: e.avgHeartRate, calories_burned: e.caloriesBurned,
    workout_minutes: e.workoutMinutes, sleep_hours: e.sleepHours,
    hrv_ms: e.hrvMs ?? null, mindful_minutes: e.mindfulMinutes ?? null, daylight_minutes: e.daylightMinutes ?? null,
    workouts: e.workouts ?? 0, synced_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const sb = getSupabaseClient();
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await sb.from('fitness_data').upsert(rows.slice(i, i + 50), { onConflict: 'user_id,date' });
    if (error) { console.warn('[Health] cloud sync failed:', error.message); return; }
  }
}

export async function fetchCloudFitnessData(userId: string, days = 30): Promise<DailyFitnessEntry[]> {
  try {
    const d = new Date(); d.setDate(d.getDate() - days);
    const { data, error } = await getSupabaseClient().from('fitness_data').select('*')
      .eq('user_id', userId).gte('date', localDay(d)).order('date', { ascending: false }).limit(days + 1);
    if (error || !data) return [];
    const num = (v: any) => (v == null ? null : Number(v));
    return data.map((r: any): DailyFitnessEntry => ({
      date: r.date, steps: r.steps ?? 0, activeMinutes: r.active_minutes ?? 0,
      restingHeartRate: num(r.resting_heart_rate), avgHeartRate: num(r.avg_heart_rate),
      caloriesBurned: r.calories_burned ?? 0, workoutMinutes: r.workout_minutes ?? 0, sleepHours: num(r.sleep_hours),
      hrvMs: num(r.hrv_ms), mindfulMinutes: num(r.mindful_minutes), daylightMinutes: num(r.daylight_minutes), workouts: r.workouts ?? 0,
    }));
  } catch { return []; }
}

export async function syncInBackground(rows: DailyFitnessEntry[]) {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (user?.id) await syncFitnessDataToCloud(rows, user.id);
  } catch {}
}

// ── Summaries (used by notifications) ────────────────────────────────────────
export function summarizeFitnessData(data: DailyFitnessEntry[]): FitnessSummary {
  if (data.length === 0) return { avgDailySteps: 0, avgActiveMinutes: 0, avgRestingHR: null, avgSleepHours: null, workoutCount: 0, highExerciseDays: 0, lowExerciseDays: 0, totalSteps: 0, peakHRDay: null };
  const totalSteps = data.reduce((s, d) => s + d.steps, 0);
  const hr = data.filter(d => d.restingHeartRate != null);
  const sl = data.filter(d => d.sleepHours != null);
  const peak = data.reduce<DailyFitnessEntry | null>((m, d) => d.avgHeartRate != null && (!m || d.avgHeartRate > (m.avgHeartRate ?? 0)) ? d : m, null);
  return {
    avgDailySteps: Math.round(totalSteps / data.length),
    avgActiveMinutes: Math.round(data.reduce((s, d) => s + d.activeMinutes, 0) / data.length),
    avgRestingHR: hr.length ? Math.round(hr.reduce((s, d) => s + d.restingHeartRate!, 0) / hr.length) : null,
    avgSleepHours: sl.length ? parseFloat((sl.reduce((s, d) => s + d.sleepHours!, 0) / sl.length).toFixed(1)) : null,
    workoutCount: data.filter(d => d.workoutMinutes > 0).length,
    highExerciseDays: data.filter(d => d.steps >= 8000 || d.workoutMinutes >= 30).length,
    lowExerciseDays: data.filter(d => d.steps < 3000 && d.workoutMinutes === 0).length,
    totalSteps, peakHRDay: peak?.date ?? null,
  };
}
export function getTodayFitness(data: DailyFitnessEntry[]) { return data.find(d => d.date === localDay(new Date())) ?? null; }
export function getDateRangeFitness(data: DailyFitnessEntry[], days: number) {
  const d = new Date(); d.setDate(d.getDate() - days);
  const cutoff = localDay(d);
  return data.filter(x => x.date >= cutoff);
}
