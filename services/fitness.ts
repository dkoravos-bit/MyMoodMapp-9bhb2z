/**
 * Health service — web / fallback. Native builds use fitness.ios.ts / fitness.android.ts.
 * The web can't read Apple Health or Health Connect, so it shows what the phone synced to the cloud.
 * All three files export the same API (see fitnessShared.ts for the shared parts).
 */
import type { MoodLogEntry } from '@/constants/moodlog';
import { getSupabaseClient } from '@/template';
import {
  DailyFitnessEntry, FitnessPermissionStatus, NOT_CONNECTED, cacheFitnessData, fetchCloudFitnessData,
  storeMoodWriteEnabled,
} from './fitnessShared';

export * from './fitnessShared';

export async function requestFitnessPermissions(): Promise<FitnessPermissionStatus> {
  return { ...NOT_CONNECTED, unavailable: true };
}

export async function fetchFitnessData(days = 30): Promise<DailyFitnessEntry[]> {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user?.id) return [];
    const rows = await fetchCloudFitnessData(user.id, days);
    await cacheFitnessData(rows);
    return rows;
  } catch { return []; }
}
export const fetchFitnessDataAndSync = fetchFitnessData;

/** Re-reads health data if the user connected it before. Returns null when not connected. */
export async function refreshHealthIfConnected(_days = 60): Promise<DailyFitnessEntry[] | null> { return null; }

export const healthMoodWriteSupported = () => false;
export async function requestMoodWriteAccess(): Promise<boolean> { return false; }
export async function setMoodWriteEnabled(_on: boolean): Promise<boolean> { await storeMoodWriteEnabled(false); return false; }
export async function writeMoodToHealth(_entry: MoodLogEntry): Promise<void> {}
