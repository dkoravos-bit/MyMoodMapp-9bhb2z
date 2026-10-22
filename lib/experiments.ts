/** 7-day experiments: pick a driver, try it for a week, get a straight answer. */
import { getSupabaseClient } from '@/template';
import { MoodLogEntry } from '@/constants/moodlog';
import { Driver, byDay, addDays, localDate } from './insight';

export interface Experiment {
  id: string; user_id: string; driver_key: string; title: string; rule: string | null;
  starts_on: string; ends_on: string; status: 'active' | 'completed' | 'ended';
  baseline_avg: number | null; result_avg: number | null; result_summary: string | null; created_at: string;
}

const TEMPLATES: Record<string, { title: string; rule: string }> = {
  sleep7: { title: 'Lights out by 11 pm', rule: 'Aim for 7+ hours of sleep every night this week.' },
  'tag:sleep_great': { title: 'Lights out by 11 pm', rule: 'Protect your sleep every night this week.' },
  'tag:sleep_good': { title: 'Lights out by 11 pm', rule: 'Protect your sleep every night this week.' },
  'tag:sleep_bad': { title: 'A wind-down hour', rule: 'Screens off an hour before bed.' },
  steps7k: { title: 'A 20-minute walk every day', rule: 'Get to 7,000 steps — a daily walk does most of it.' },
  'tag:exercise': { title: 'Move every day', rule: '20 minutes of movement you enjoy, daily.' },
  'tag:exercise_intense': { title: 'Three hard sessions', rule: 'Three proper workouts this week.' },
  'tag:sunlight': { title: '10 minutes outside before noon', rule: 'Morning light, every day.' },
  'tag:sunlight_long': { title: 'An hour outside daily', rule: 'Get outside for an hour each day.' },
  'tag:nature_time': { title: 'Green time', rule: 'Spend time in a park or nature on 4 days.' },
  'tag:alcohol': { title: 'A week without alcohol', rule: 'Skip drinks for seven days.' },
  'tag:alcohol_heavy': { title: 'A week without alcohol', rule: 'Skip drinks for seven days.' },
  'tag:doomscrolling': { title: 'No phone in bed', rule: 'Phone stays out of the bedroom.' },
  'tag:screens': { title: 'Screen-light evenings', rule: 'No recreational screens after 9 pm.' },
  'tag:caffeine_crash': { title: 'No caffeine after noon', rule: 'Last coffee before 12.' },
  'tag:caffeine': { title: 'No caffeine after noon', rule: 'Last coffee before 12.' },
  'tag:social_fun': { title: 'One plan with people', rule: 'Make time with someone on 3 days.' },
  'tag:deep_connection': { title: 'One real conversation a day', rule: 'Call or meet someone you trust.' },
  'tag:meditation': { title: 'Ten quiet minutes', rule: 'Meditate or breathe for 10 minutes daily.' },
};

export function templateFor(d: Driver) {
  return TEMPLATES[d.key] ?? (d.effect >= 0
    ? { title: `More “${d.name}”`, rule: `Aim for “${d.name}” on at least 4 days this week.` }
    : { title: `Less “${d.name}”`, rule: `Try to avoid “${d.name}” for seven days.` });
}

export async function getActiveExperiment(userId: string): Promise<Experiment | null> {
  const { data } = await getSupabaseClient().from('experiments').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1);
  return (data?.[0] as Experiment) ?? null;
}

export async function listExperiments(userId: string): Promise<Experiment[]> {
  const { data } = await getSupabaseClient().from('experiments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return (data as Experiment[]) ?? [];
}

export async function startExperiment(userId: string, d: Driver, entries: MoodLogEntry[]): Promise<Experiment> {
  const today = localDate();
  const days = [...byDay(entries).values()].filter(x => x.date >= addDays(today, -14) && x.date < today);
  const baseline = days.length ? days.reduce((s, x) => s + x.avg, 0) / days.length : null;
  const t = templateFor(d);
  const { data, error } = await getSupabaseClient().from('experiments').insert({
    user_id: userId, driver_key: d.key, title: t.title, rule: t.rule,
    starts_on: today, ends_on: addDays(today, 6), status: 'active',
    baseline_avg: baseline != null ? Math.round(baseline * 10) / 10 : null,
  }).select('*').single();
  if (error) throw error;
  return data as Experiment;
}

export interface ExperimentProgress {
  days: { date: string; label: string; avg: number | null; state: 'done' | 'today' | 'future' | 'missed' }[];
  soFar: number | null; baseline: number | null; loggedDays: number; finished: boolean;
  verdict: { title: string; text: string } | null;
}

export function progressOf(e: Experiment, entries: MoodLogEntry[], today = localDate()): ExperimentProgress {
  const map = byDay(entries);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(e.starts_on, i); const d = map.get(date);
    const label = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
    const state: 'done' | 'today' | 'future' | 'missed' = date === today ? 'today' : date > today ? 'future' : d ? 'done' : 'missed';
    return { date, label, avg: d?.avg ?? null, state };
  });
  const logged = days.filter(d => d.avg != null) as { avg: number }[];
  const soFar = logged.length ? Math.round(logged.reduce((s, d) => s + d.avg, 0) / logged.length) : null;
  const baseline = e.baseline_avg != null ? Math.round(e.baseline_avg) : null;
  const finished = today > e.ends_on;
  let verdict: ExperimentProgress['verdict'] = null;
  if (soFar != null && baseline != null) {
    const diff = soFar - baseline;
    if (logged.length < 4) verdict = { title: 'Too early to call', text: `${logged.length} ${logged.length === 1 ? 'day' : 'days'} in. We'll give you a straight answer once there are at least four.` };
    else if (diff >= 5) verdict = { title: finished ? 'It helped' : 'Looking good', text: `Your days averaged ${soFar}, about ${diff} points above your usual ${baseline}.` };
    else if (diff <= -5) verdict = { title: finished ? "It didn't help" : 'Not helping so far', text: `Your days averaged ${soFar}, about ${Math.abs(diff)} points below your usual ${baseline}. That's useful to know too.` };
    else verdict = { title: 'No clear change', text: `Your days averaged ${soFar} vs your usual ${baseline} — within normal ups and downs.` };
  }
  return { days, soFar, baseline, loggedDays: logged.length, finished, verdict };
}

export async function closeExperiment(e: Experiment, status: 'completed' | 'ended', p: ExperimentProgress) {
  await getSupabaseClient().from('experiments').update({ status, result_avg: p.soFar, result_summary: p.verdict ? `${p.verdict.title}. ${p.verdict.text}` : null }).eq('id', e.id);
}
