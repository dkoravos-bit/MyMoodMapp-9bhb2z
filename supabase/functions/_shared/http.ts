/**
 * Small shared helpers for edge functions: JSON responses with CORS on every
 * path, and an authenticated-user guard.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

/**
 * Resolves the calling user from the `Authorization: Bearer <jwt>` header.
 * Returns the user id, or a 401 Response to send back as-is.
 */
export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Not authenticated' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'Server not configured' }, 500);

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return json({ error: 'Not authenticated' }, 401);
  return { userId: data.user.id };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
