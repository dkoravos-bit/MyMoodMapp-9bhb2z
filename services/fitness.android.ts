/**
 * Health service — Android (Health Connect).
 * Reads: sleep (asleep stages, overlaps merged), steps, active calories, exercise sessions,
 *        resting heart rate, HRV (RMSSD).
 * Writes: none — Health Connect has no mood / state-of-mind data type.
 * Needs minSdk 26 (expo-build-properties) and the health READ_* permissions in app.json.
 */
import {
  getSdkStatus, initialize, requestPermission, getGrantedPermissions, readRecords, aggregateGroupByDuration,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { MoodLogEntry } from '@/constants/moodlog';
import {
  DailyFitnessEntry, FitnessPermissionStatus, NOT_CONNECTED, emptyDays, localDay, startOfLocalDay, mergedMinutes,
  hasAnyValue, sortDesc, cacheFitnessData, getFitnessPermissionStatus, saveFitnessPermissionStatus,
  storeMoodWriteEnabled, syncInBackground,
} from './fitnessShared';

export * from './fitnessShared';

const READ = ['Steps', 'SleepSession', 'ExerciseSession', 'HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'ActiveCaloriesBurned'] as const;
type ReadType = typeof READ[number];

let ready = false;
async function ensureReady(): Promise<boolean> {
  if (ready) return true;
  try {
    if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    ready = await initialize();
    return ready;
  } catch { return false; }
}

async function grantedTypes(): Promise<Set<string>> {
  try { return new Set((await getGrantedPermissions()).filter((p: any) => p.accessType === 'read').map((p: any) => p.recordType)); }
  catch { return new Set(); }
}

export async function requestFitnessPermissions(): Promise<FitnessPermissionStatus> {
  if (!(await ensureReady())) {
    // Health Connect isn't installed / supported on this phone.
    const s = { ...NOT_CONNECTED, unavailable: true };
    await saveFitnessPermissionStatus(s); return s;
  }
  try { await requestPermission(READ.map(recordType => ({ accessType: 'read' as const, recordType }))); } catch {}
  const granted = await grantedTypes();
  const s: FitnessPermissionStatus = granted.size > 0 ? { granted: true, source: 'health_connect' } : NOT_CONNECTED;
  await saveFitnessPermissionStatus(s);
  return s;
}

async function readAll(type: ReadType, start: Date, end: Date): Promise<any[]> {
  const out: any[] = []; let pageToken: string | undefined;
  try {
    do {
      const r: any = await readRecords(type as any, { timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() }, pageSize: 1000, pageToken });
      out.push(...(r.records ?? [])); pageToken = r.pageToken || undefined;
    } while (pageToken && out.length < 20000);
  } catch (e) { console.warn('[Health] read', type, e); }
  return out;
}

async function dailyAggregate(type: 'Steps' | 'ActiveCaloriesBurned', start: Date, end: Date) {
  const out = new Map<string, number>();
  try {
    const groups: any[] = await aggregateGroupByDuration({ recordType: type, timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() }, timeRangeSlicer: { duration: 'DAYS', length: 1 } } as any);
    for (const g of groups) {
      const v = type === 'Steps' ? g.result?.COUNT_TOTAL : g.result?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
      if (Number.isFinite(v)) out.set(localDay(new Date(g.startTime)), v);
    }
  } catch (e) { console.warn('[Health] aggregate', type, e); }
  return out;
}

// SleepStage: 1 awake, 2 sleeping, 3 out of bed, 4 light, 5 deep, 6 REM, 7 awake in bed
const ASLEEP = new Set([2, 4, 5, 6]);

export async function fetchFitnessData(days = 30): Promise<DailyFitnessEntry[]> {
  if (!(await ensureReady())) return [];
  const granted = await grantedTypes();
  if (granted.size === 0) return [];
  const has = (t: ReadType) => granted.has(t);
  const end = new Date();
  const start = startOfLocalDay(new Date(end.getTime() - (days - 1) * 86400000));
  const sleepStart = new Date(start.getTime() - 18 * 3600000);
  const byDay = emptyDays(days, end);
  const none = Promise.resolve([] as any[]);

  const [steps, energy, sleep, exercise, resting, hrv, hr] = await Promise.all([
    has('Steps') ? dailyAggregate('Steps', start, end) : Promise.resolve(new Map<string, number>()),
    has('ActiveCaloriesBurned') ? dailyAggregate('ActiveCaloriesBurned', start, end) : Promise.resolve(new Map<string, number>()),
    has('SleepSession') ? readAll('SleepSession', sleepStart, end) : none,
    has('ExerciseSession') ? readAll('ExerciseSession', start, end) : none,
    has('RestingHeartRate') ? readAll('RestingHeartRate', start, end) : none,
    has('HeartRateVariabilityRmssd') ? readAll('HeartRateVariabilityRmssd', start, end) : none,
    has('HeartRate') ? readAll('HeartRate', start, end) : none,
  ]);

  for (const [k, e] of Object.entries(byDay)) {
    e.steps = Math.round(steps.get(k) ?? 0);
    e.caloriesBurned = Math.round(energy.get(k) ?? 0);
  }

  const nights = new Map<string, { start: number; end: number }[]>();
  for (const s of sleep) {
    const k = localDay(new Date(s.endTime)); if (!byDay[k]) continue;
    const parts = s.stages?.length
      ? s.stages.filter((st: any) => ASLEEP.has(Number(st.stage))).map((st: any) => ({ start: +new Date(st.startTime), end: +new Date(st.endTime) }))
      : [{ start: +new Date(s.startTime), end: +new Date(s.endTime) }];
    (nights.get(k) ?? nights.set(k, []).get(k)!).push(...parts);
  }
  for (const [k, iv] of nights) { const h = mergedMinutes(iv) / 60; if (h >= 0.5 && h <= 16) byDay[k].sleepHours = +h.toFixed(1); }

  for (const x of exercise) {
    const k = localDay(new Date(x.startTime)); const e = byDay[k]; if (!e) continue;
    const min = Math.round((+new Date(x.endTime) - +new Date(x.startTime)) / 60000);
    e.workouts = (e.workouts ?? 0) + 1; e.workoutMinutes += min; e.activeMinutes += min;
  }

  const avgBy = (rows: any[], val: (r: any) => number | undefined) => {
    const m = new Map<string, number[]>();
    for (const r of rows) { const v = val(r); if (!Number.isFinite(v)) continue; const k = localDay(new Date(r.time)); (m.get(k) ?? m.set(k, []).get(k)!).push(v!); }
    return m;
  };
  for (const [k, v] of avgBy(resting, r => r.beatsPerMinute)) if (byDay[k]) byDay[k].restingHeartRate = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  for (const [k, v] of avgBy(hrv, r => r.heartRateVariabilityMillis)) if (byDay[k]) byDay[k].hrvMs = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  const hrSamples = hr.flatMap((r: any) => (r.samples ?? []).map((s: any) => ({ time: s.time, beatsPerMinute: s.beatsPerMinute })));
  for (const [k, v] of avgBy(hrSamples, r => r.beatsPerMinute)) if (byDay[k]) byDay[k].avgHeartRate = Math.round(v.reduce((a, b) => a + b, 0) / v.length);

  const rows = sortDesc(Object.values(byDay));
  await cacheFitnessData(rows);
  return rows;
}

export async function fetchFitnessDataAndSync(days = 30): Promise<DailyFitnessEntry[]> {
  const rows = await fetchFitnessData(days);
  if (rows.some(hasAnyValue)) syncInBackground(rows);
  return rows;
}

export async function refreshHealthIfConnected(days = 60): Promise<DailyFitnessEntry[] | null> {
  const s = await getFitnessPermissionStatus();
  if (!s.granted || s.source !== 'health_connect') return null;
  return fetchFitnessDataAndSync(days);
}

// Health Connect has no mood type, so there's nothing to write on Android.
export const healthMoodWriteSupported = () => false;
export async function requestMoodWriteAccess(): Promise<boolean> { return false; }
export async function setMoodWriteEnabled(_on: boolean): Promise<boolean> { await storeMoodWriteEnabled(false); return false; }
export async function writeMoodToHealth(_entry: MoodLogEntry): Promise<void> {}
