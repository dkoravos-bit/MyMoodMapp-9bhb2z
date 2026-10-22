/** Circle: buddies see a coarse "glow" (bright / steady / quiet) — never scores, notes or tags. */
import { getSupabaseClient } from '@/template';
import { getMyBuddies, getPeopleIMonitor, addBuddy } from '@/services/accountability';
import { localDate } from './insight';

export type Glow = 'bright' | 'steady' | 'quiet';
export const glowFor = (score: number): Glow => (score >= 70 ? 'bright' : score >= 45 ? 'steady' : 'quiet');

export async function publishGlow(todayAvg: number) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_profiles').update({ glow: glowFor(todayAvg), glow_date: localDate() }).eq('id', user.id).eq('share_glow', true);
  } catch {}
}

export interface CirclePerson {
  rowId: string; userId: string | null; name: string; email: string;
  status: 'pending' | 'active'; glow: Glow | null; loggedToday: boolean; daysQuiet: number | null; direction: 'mine' | 'theirs';
}

export async function loadCircle(userId: string): Promise<CirclePerson[]> {
  const [mine, theirs] = await Promise.all([getMyBuddies(userId).catch(() => []), getPeopleIMonitor(userId).catch(() => [])]);
  const rows = [
    ...mine.filter(r => r.status === 'active' || r.status === 'pending').map(r => ({ r, uid: r.buddy_id, direction: 'mine' as const })),
    ...theirs.map(r => ({ r, uid: r.user_id, direction: 'theirs' as const })),
  ];
  const ids = [...new Set(rows.map(x => x.uid).filter(Boolean))] as string[];
  const supabase = getSupabaseClient();
  const { data: profiles } = ids.length
    ? await supabase.from('user_profiles').select('id, display_name, username, email, glow, glow_date, last_logged_at, share_glow').in('id', ids)
    : { data: [] as any[] };
  const today = localDate();
  const seen = new Set<string>();
  const out: CirclePerson[] = [];
  for (const { r, uid, direction } of rows) {
    const key = uid ?? r.buddy_email;
    if (seen.has(key)) continue; seen.add(key);
    const p: any = (profiles ?? []).find((x: any) => x.id === uid);
    const last = p?.last_logged_at ? new Date(p.last_logged_at) : null;
    const daysQuiet = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
    out.push({
      rowId: r.id, userId: uid ?? null,
      name: p?.display_name ?? p?.username ?? r.buddy_name ?? (direction === 'mine' ? r.buddy_email : 'Friend'),
      email: p?.email ?? r.buddy_email,
      status: r.status as 'pending' | 'active',
      glow: p?.share_glow !== false && p?.glow_date === today ? p?.glow : null,
      loggedToday: p?.glow_date === today || (last ? last.toDateString() === new Date().toDateString() : false),
      daysQuiet, direction,
    });
  }
  return out;
}

export { addBuddy };
