/**
 * Health service — iOS (Apple Health).
 * Reads: sleep (asleep stages only, overlaps merged), steps, exercise minutes, workouts, active energy,
 *        resting heart rate, heart rate, HRV (SDNN), mindful minutes, time in daylight (iOS 17+).
 * Writes: each mood log as a State of Mind sample (iOS 18+), only when the user turned that on.
 * HealthKit rule: querying a type before requestAuthorization() crashes, so every read goes through ensureAuthorized().
 */
import {
  isHealthDataAvailableAsync, isObjectTypeAvailable, requestAuthorization,
  queryStatisticsCollectionForQuantity, queryCategorySamples, queryWorkoutSamples, saveStateOfMindSample,
  StateOfMindKind, StateOfMindLabel, StateOfMindAssociation,
} from '@kingstinct/react-native-healthkit';
import type { MoodLogEntry } from '@/constants/moodlog';
import {
  DailyFitnessEntry, FitnessPermissionStatus, NOT_CONNECTED, emptyDays, localDay, startOfLocalDay, mergedMinutes,
  hasAnyValue, sortDesc, cacheFitnessData, getFitnessPermissionStatus, saveFitnessPermissionStatus,
  getMoodWriteEnabled, storeMoodWriteEnabled, syncInBackground,
} from './fitnessShared';

export * from './fitnessShared';

const STATE_OF_MIND = 'HKStateOfMindTypeIdentifier' as const;
const DAYLIGHT = 'HKQuantityTypeIdentifierTimeInDaylight' as const;
const can = (id: string) => { try { return isObjectTypeAvailable(id as any); } catch { return false; } };

function readTypes() {
  const t: string[] = [
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierAppleExerciseTime',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierRestingHeartRate',
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
    'HKCategoryTypeIdentifierMindfulSession',
    'HKWorkoutTypeIdentifier',
  ];
  if (can(DAYLIGHT)) t.push(DAYLIGHT);
  return t;
}

let authorized = false;
async function ensureAuthorized(): Promise<boolean> {
  if (authorized) return true;
  if (!(await isHealthDataAvailableAsync().catch(() => false))) return false;
  // Shows Apple's sheet the first time; afterwards returns immediately. HealthKit never reveals
  // whether READ access was granted, so "authorized" means "asked"; empty data is shown honestly.
  authorized = await requestAuthorization({ toRead: readTypes() as any }).catch(() => false);
  return authorized;
}

export async function requestFitnessPermissions(): Promise<FitnessPermissionStatus> {
  if (!(await isHealthDataAvailableAsync().catch(() => false))) {
    const s = { ...NOT_CONNECTED, unavailable: true };
    await saveFitnessPermissionStatus(s); return s;
  }
  const ok = await ensureAuthorized();
  const s: FitnessPermissionStatus = ok ? { granted: true, source: 'healthkit' } : NOT_CONNECTED;
  await saveFitnessPermissionStatus(s);
  return s;
}

// ── Reads ───────────────────────────────────────────────────────────────────
async function dailyStat(id: string, stat: 'cumulativeSum' | 'discreteAverage', unit: string, start: Date, end: Date) {
  const out = new Map<string, number>();
  try {
    const rows = await queryStatisticsCollectionForQuantity(id as any, [stat], startOfLocalDay(start), { day: 1 }, { unit, filter: { date: { startDate: start, endDate: end } } } as any);
    for (const r of rows) {
      const q = stat === 'cumulativeSum' ? r.sumQuantity : r.averageQuantity;
      if (r.startDate && q && Number.isFinite(q.quantity)) out.set(localDay(new Date(r.startDate)), q.quantity);
    }
  } catch (e) { console.warn('[Health] stat', id, e); }
  return out;
}

async function category(id: string, start: Date, end: Date) {
  try { return await queryCategorySamples(id as any, { limit: 0, filter: { date: { startDate: start, endDate: end } } }); }
  catch (e) { console.warn('[Health] category', id, e); return []; }
}

// HKCategoryValueSleepAnalysis: 0 inBed, 1 asleepUnspecified, 2 awake, 3 asleepCore, 4 asleepDeep, 5 asleepREM
const ASLEEP = new Set([1, 3, 4, 5]);

export async function fetchFitnessData(days = 30): Promise<DailyFitnessEntry[]> {
  if (!(await ensureAuthorized())) return [];
  const end = new Date();
  const start = startOfLocalDay(new Date(end.getTime() - (days - 1) * 86400000));
  const sleepStart = new Date(start.getTime() - 18 * 3600000); // catch the night before day 1
  const byDay = emptyDays(days, end);

  const [steps, exercise, energy, resting, hr, hrv, daylight, sleep, mindful, workouts] = await Promise.all([
    dailyStat('HKQuantityTypeIdentifierStepCount', 'cumulativeSum', 'count', start, end),
    dailyStat('HKQuantityTypeIdentifierAppleExerciseTime', 'cumulativeSum', 'min', start, end),
    dailyStat('HKQuantityTypeIdentifierActiveEnergyBurned', 'cumulativeSum', 'kcal', start, end),
    dailyStat('HKQuantityTypeIdentifierRestingHeartRate', 'discreteAverage', 'count/min', start, end),
    dailyStat('HKQuantityTypeIdentifierHeartRate', 'discreteAverage', 'count/min', start, end),
    dailyStat('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'discreteAverage', 'ms', start, end),
    can(DAYLIGHT) ? dailyStat(DAYLIGHT, 'cumulativeSum', 'min', start, end) : Promise.resolve(new Map<string, number>()),
    category('HKCategoryTypeIdentifierSleepAnalysis', sleepStart, end),
    category('HKCategoryTypeIdentifierMindfulSession', start, end),
    queryWorkoutSamples({ limit: 0, filter: { date: { startDate: start, endDate: end } } } as any).catch(() => [] as any[]),
  ]);

  for (const [k, e] of Object.entries(byDay)) {
    e.steps = Math.round(steps.get(k) ?? 0);
    e.activeMinutes = Math.round(exercise.get(k) ?? 0);
    e.caloriesBurned = Math.round(energy.get(k) ?? 0);
    const r = resting.get(k); e.restingHeartRate = r != null ? Math.round(r) : null;
    const h = hr.get(k); e.avgHeartRate = h != null ? Math.round(h) : null;
    const v = hrv.get(k); e.hrvMs = v != null ? Math.round(v) : null;
    const dl = daylight.get(k); e.daylightMinutes = dl != null ? Math.round(dl) : null;
  }

  // Sleep: asleep stages only, merged across sources, credited to the day you woke up.
  const nights = new Map<string, { start: number; end: number }[]>();
  for (const s of sleep as any[]) {
    if (!ASLEEP.has(Number(s.value))) continue;
    const k = localDay(new Date(s.endDate));
    if (!byDay[k]) continue;
    (nights.get(k) ?? nights.set(k, []).get(k)!).push({ start: +new Date(s.startDate), end: +new Date(s.endDate) });
  }
  for (const [k, iv] of nights) { const h = mergedMinutes(iv) / 60; if (h >= 0.5 && h <= 16) byDay[k].sleepHours = +h.toFixed(1); }

  const mind = new Map<string, { start: number; end: number }[]>();
  for (const s of mindful as any[]) { const k = localDay(new Date(s.startDate)); if (byDay[k]) (mind.get(k) ?? mind.set(k, []).get(k)!).push({ start: +new Date(s.startDate), end: +new Date(s.endDate) }); }
  for (const [k, iv] of mind) byDay[k].mindfulMinutes = Math.round(mergedMinutes(iv));

  for (const w of workouts as any[]) {
    const k = localDay(new Date(w.startDate)); const e = byDay[k]; if (!e) continue;
    e.workouts = (e.workouts ?? 0) + 1;
    e.workoutMinutes += Math.round((+new Date(w.endDate) - +new Date(w.startDate)) / 60000);
  }

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
  if (!s.granted || s.source !== 'healthkit') return null;
  return fetchFitnessDataAndSync(days);
}

// ── Writes: State of Mind (iOS 18+) ─────────────────────────────────────────
export const healthMoodWriteSupported = () => can(STATE_OF_MIND);

export async function requestMoodWriteAccess(): Promise<boolean> {
  if (!healthMoodWriteSupported() || !(await isHealthDataAvailableAsync().catch(() => false))) return false;
  try { await requestAuthorization({ toShare: [STATE_OF_MIND], toRead: readTypes() as any }); authorized = true; return true; }
  catch { return false; }
}

/** Turning on asks Apple for write access first. Returns the resulting setting. */
export async function setMoodWriteEnabled(on: boolean): Promise<boolean> {
  if (on && !(await requestMoodWriteAccess())) { await storeMoodWriteEnabled(false); return false; }
  await storeMoodWriteEnabled(on);
  return on;
}

const L = StateOfMindLabel, A = StateOfMindAssociation;
const TAG_LABELS: Record<string, StateOfMindLabel[]> = {
  anxious: [L.anxious], social_anxiety: [L.anxious], depressed_feeling: [L.sad], grief_loss: [L.sad],
  angry: [L.angry], conflict: [L.frustrated], overwhelmed: [L.overwhelmed], calm_content: [L.calm, L.content],
  excited_happy: [L.excited, L.happy], hopeful: [L.hopeful], lonely: [L.lonely], ignored: [L.lonely],
  accomplished: [L.proud], gratitude: [L.grateful], deadline: [L.stressed], financial_stress: [L.worried],
  overworked: [L.drained], social_draining: [L.drained], big_event_done: [L.relieved], financial_win: [L.satisfied],
  feeling_strong: [L.confident], bad_news: [L.disappointed], positive_news: [L.hopeful],
};
const TAG_ASSOC: [RegExp, StateOfMindAssociation][] = [
  [/^(work_|deadline|procrastinated|accomplished|overworked|commute_)/, A.work],
  [/^financial_/, A.money],
  [/^quality_family$/, A.family],
  [/^romantic_/, A.partner],
  [/^(social_|deep_connection|helped_someone|received_support|too_much_social)/, A.friends],
  [/^(exercise|light_movement|no_exercise|feeling_strong|cold_shower)/, A.fitness],
  [/^(sleep_|napped|illness|headache|chronic_pain|injury|menstrual_pain|medication_taken|missed_meds|hormonal_good)/, A.health],
  [/^(meditation|breathing_ex|journalled|gratitude|therapy_coaching|rest_day|leisure_time|digital_detox)/, A.selfCare],
  [/^(weather_|sunlight|no_sunlight)/, A.weather],
  [/^travel$/, A.travel],
  [/^(positive_news|bad_news)$/, A.currentEvents],
  [/^learned_something$/, A.education],
  [/^(creative_work|nature_time)$/, A.hobbies],
  [/^(clean_space|home_stress)$/, A.tasks],
];

export async function writeMoodToHealth(entry: MoodLogEntry): Promise<void> {
  if (!healthMoodWriteSupported() || !(await getMoodWriteEnabled())) return;
  const tags = [entry.primaryTag, ...(entry.additionalTags ?? [])].filter(Boolean);
  const labels = [...new Set(tags.flatMap(t => TAG_LABELS[t] ?? []))];
  const assoc = [...new Set(tags.map(t => TAG_ASSOC.find(([re]) => re.test(t))?.[1]).filter((x): x is StateOfMindAssociation => x != null))];
  const valence = Math.max(-1, Math.min(1, (entry.score - 50) / 50));
  try {
    await saveStateOfMindSample(new Date(entry.timestamp), StateOfMindKind.momentaryEmotion, valence, labels, assoc, { MyMoodMappEntryId: entry.id } as any);
  } catch (e) { console.warn('[Health] State of Mind save failed:', e); }
}
