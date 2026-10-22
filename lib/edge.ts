/**
 * Calls Supabase edge functions with the user's session and a long timeout.
 * (supabase.functions.invoke has a short default timeout that aborts image generation.)
 */
import { getSupabaseClient } from '@/template';
import { SUPABASE_URL } from '@/constants/supabase';

export async function callEdge<T = any>(name: string, body: unknown, timeoutMs = 90000): Promise<T> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  const base = SUPABASE_URL || (supabase as any)?.supabaseUrl || '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
