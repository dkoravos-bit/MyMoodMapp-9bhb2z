/**
 * generate-mood-art v2 — the AI "plate" behind MyMoodMapp's mood art.
 *
 * Body: { layer: 'now'|'week'|'month', period: string, traits: Traits }
 *   traits are computed client-side by the shared Mood Art Spec
 *   (../_shared/moodArtSpec.ts) and re-validated/clamped here.
 *
 * Flow:
 *   1. Auth (JWT → user id).
 *   2. key = cacheKey(userId, layer, traits, period) → vibe-cards/mood-art/v2/<key>.png
 *      Already there → { artUrl, cached: true } with no generation.
 *   3. Per-user daily cap (MAX_PER_DAY), counted in public.mood_art_generations.
 *   4. Cloudflare Workers AI:
 *        primary  @cf/black-forest-labs/flux-2-klein-4b (multipart form; JSON { result: { image: base64 } })
 *        fallback @cf/black-forest-labs/flux-1-schnell  (JSON body;       JSON { result: { image: base64 } })
 *   5. Upload (upsert) to the deterministic path → { artUrl, cached: false }.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, preflight, readJson, requireUser } from '../_shared/http.ts';
import {
  type ArtLayer,
  type Tone,
  type Traits,
  cacheKey,
  MOTIF_LABEL,
  platePrompt,
  seedFor,
  SPEC_VERSION,
} from '../_shared/moodArtSpec.ts';

const BUCKET = 'vibe-cards';
const PREFIX = 'mood-art/v2';
const MAX_PER_DAY = 12;

const KLEIN_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const SCHNELL_MODEL = '@cf/black-forest-labs/flux-1-schnell';

const LAYERS: readonly ArtLayer[] = ['now', 'week', 'month'];
const TONES: readonly Tone[] = ['mirror', 'calm', 'lift'];
const AIRS: readonly Traits['air'][] = ['still', 'breeze', 'wind'];
const TRENDS: readonly Traits['trend'][] = ['rising', 'steady', 'settling'];
const SKIES: readonly NonNullable<Traits['sky']>[] = ['clear', 'cloud', 'rain', 'snow', 'fog'];

const PERIOD_RE: Record<ArtLayer, RegExp> = {
  now: /^\d{4}-\d{2}-\d{2}$/,
  week: /^\d{4}-W\d{2}$/,
  month: /^\d{4}-\d{2}$/,
};

/** Image size per layer (FLUX.2 [klein] accepts 256–1920 for each side). */
const SIZE: Record<ArtLayer, { width: number; height: number }> = {
  now: { width: 768, height: 1024 },
  week: { width: 1280, height: 720 },
  month: { width: 1280, height: 720 },
};

// ── Validation ────────────────────────────────────────────────────────────────

const int = (v: unknown, lo: number, hi: number): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, Math.round(v)));
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v as T : null;

/** Rebuilds a Traits object from untrusted input; returns an error string if unusable. */
function parseTraits(raw: unknown): Traits | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'traits must be an object';
  const r = raw as Record<string, unknown>;

  const scoreBucket = int(r.scoreBucket, 0, 100);
  const mind = int(r.mind, 0, 10);
  const energy = int(r.energy, 0, 10);
  const body = int(r.body, 0, 10);
  const focus = int(r.focus, 0, 10);
  if (scoreBucket == null || mind == null || energy == null || body == null || focus == null) {
    return 'traits.scoreBucket, mind, energy, body and focus must be numbers';
  }
  const air = oneOf(r.air, AIRS);
  const trend = oneOf(r.trend, TRENDS);
  if (!air || !trend) return 'traits.air or traits.trend is invalid';

  const known = Object.keys(MOTIF_LABEL);
  const motifs: string[] = [];
  if (Array.isArray(r.motifs)) {
    for (const m of r.motifs) {
      if (typeof m === 'string' && known.includes(m) && !motifs.includes(m)) motifs.push(m);
      if (motifs.length >= 3) break;
    }
  }

  return {
    v: SPEC_VERSION,
    scoreBucket: Math.round(scoreBucket / 5) * 5,
    mind, energy, body, focus,
    air, trend, motifs,
    stars: int(r.stars, 0, 3) ?? 1,
    trails: int(r.trails, 0, 3) ?? 0,
    sky: r.sky == null ? null : oneOf(r.sky, SKIES),
    tone: oneOf(r.tone, TONES) ?? 'mirror',
  };
}

// ── Image generation ──────────────────────────────────────────────────────────

interface GenImage { bytes: Uint8Array; contentType: string }

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]+,/, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sniffType(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  return 'image/png';
}

/** Reads a Workers AI REST response: JSON { result: { image } } or a raw image body. */
async function readImage(resp: Response, label: string): Promise<GenImage | null> {
  const ct = resp.headers.get('content-type') ?? '';
  if (ct.startsWith('image/')) {
    const bytes = new Uint8Array(await resp.arrayBuffer());
    return bytes.length > 100 ? { bytes, contentType: ct.split(';')[0] } : null;
  }
  const data = await resp.json().catch(() => null) as
    { success?: boolean; result?: { image?: string } } | null;
  const b64 = data?.result?.image;
  if (!data?.success || typeof b64 !== 'string' || b64.length < 100) {
    console.warn(`[mood-art] ${label}: no image in response`);
    return null;
  }
  const bytes = b64ToBytes(b64);
  return { bytes, contentType: sniffType(bytes) };
}

function cfEnv(): { accountId: string; token: string } | null {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const token = Deno.env.get('CLOUDFLARE_AI_API_TOKEN');
  return accountId && token ? { accountId, token } : null;
}

const cfUrl = (accountId: string, model: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

/** FLUX.2 [klein] 4B — multipart/form-data (prompt, width, height, seed). Steps are fixed by the model. */
async function generateKlein(prompt: string, layer: ArtLayer, seed: number): Promise<GenImage | null> {
  const env = cfEnv();
  if (!env) return null;
  const { width, height } = SIZE[layer];
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(width));
  form.append('height', String(height));
  form.append('seed', String(seed));
  try {
    // fetch() sets the multipart Content-Type (with boundary) from the FormData body.
    const resp = await fetch(cfUrl(env.accountId, KLEIN_MODEL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.token}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      console.warn(`[mood-art] klein HTTP ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 300)}`);
      return null;
    }
    return await readImage(resp, 'klein');
  } catch (e) {
    console.warn('[mood-art] klein failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** FLUX.1 [schnell] — JSON body; prompt hard limit 2048 chars; no width/height. */
async function generateSchnell(prompt: string, seed: number): Promise<GenImage | null> {
  const env = cfEnv();
  if (!env) return null;
  try {
    const resp = await fetch(cfUrl(env.accountId, SCHNELL_MODEL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 4, seed }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      console.warn(`[mood-art] schnell HTTP ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 300)}`);
      return null;
    }
    return await readImage(resp, 'schnell');
  } catch (e) {
    console.warn('[mood-art] schnell failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Storage / rate limit ──────────────────────────────────────────────────────

async function objectExists(admin: SupabaseClient, path: string): Promise<boolean> {
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await admin.storage.from(BUCKET).list(dir, { search: name, limit: 10 });
  if (error) return false;
  return (data ?? []).some((o) => o.name === name);
}

async function generationsToday(admin: SupabaseClient, userId: string): Promise<number | null> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from('mood_art_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString());
  if (error) {
    console.warn('[mood-art] rate-limit count failed:', error.message);
    return null;
  }
  return count ?? 0;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const body = await readJson(req);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    const layer = oneOf(body.layer, LAYERS);
    if (!layer) return json({ error: "layer must be 'now', 'week' or 'month'" }, 400);

    const period = typeof body.period === 'string' ? body.period.trim() : '';
    if (!PERIOD_RE[layer].test(period)) {
      return json({ error: `period is invalid for layer '${layer}'` }, 400);
    }

    const traits = parseTraits(body.traits);
    if (typeof traits === 'string') return json({ error: traits }, 400);

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: 'Server not configured' }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const key = cacheKey(userId, layer, traits, period);
    const path = `${PREFIX}/${key}.png`;
    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    if (await objectExists(admin, path)) {
      return json({ artUrl: publicUrl, cached: true });
    }

    const used = await generationsToday(admin, userId);
    if (used != null && used >= MAX_PER_DAY) {
      return json({ error: 'Daily art limit reached. Try again tomorrow.' }, 429);
    }

    const prompt = platePrompt(traits, layer);
    const seed = seedFor(userId, layer);

    let model = KLEIN_MODEL;
    let image = await generateKlein(prompt, layer, seed);
    if (!image) {
      model = SCHNELL_MODEL;
      image = await generateSchnell(prompt, seed);
    }
    if (!image) return json({ error: 'Image generation failed' }, 502);

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, image.bytes, {
      contentType: image.contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (uploadError) return json({ error: `Storage: ${uploadError.message}` }, 500);

    const { error: logError } = await admin
      .from('mood_art_generations')
      .insert({ user_id: userId, layer, period, model });
    if (logError) console.warn('[mood-art] could not record generation:', logError.message);

    return json({ artUrl: publicUrl, cached: false });
  } catch (e) {
    console.error('[mood-art] error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Unexpected error' }, 500);
  }
});
