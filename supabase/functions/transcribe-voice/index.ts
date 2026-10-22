/**
 * transcribe-voice — speech-to-text via Cloudflare Workers AI Whisper.
 *
 * Model: @cf/openai/whisper-large-v3-turbo
 *   REST: POST /accounts/{id}/ai/run/@cf/openai/whisper-large-v3-turbo
 *         JSON { audio: <base64 string>, task: 'transcribe', language, vad_filter }
 *   → { success, result: { text, word_count, segments, vtt, transcription_info } }
 *
 * Contract (unchanged): body { audioBase64, mimeType } → { transcript }.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { json, preflight, readJson, requireUser } from '../_shared/http.ts';

const MODEL = '@cf/openai/whisper-large-v3-turbo';
/** ~18 MB of audio once decoded; voice logs are short. */
const MAX_BASE64_CHARS = 24_000_000;

serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    const raw = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
    // Strip a data: URL prefix and whitespace if the client sent one.
    const audio = raw.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
    if (!audio) return json({ error: 'audioBase64 is required' }, 400);
    if (audio.length > MAX_BASE64_CHARS) return json({ error: 'Audio is too long' }, 413);
    // mimeType is accepted for contract compatibility; Whisper detects the container itself.

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const token = Deno.env.get('CLOUDFLARE_AI_API_TOKEN');
    if (!accountId || !token) return json({ error: 'Transcription is not configured' }, 500);

    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, task: 'transcribe', language: 'en', vad_filter: true }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      console.error(`[transcribe] Cloudflare HTTP ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 300)}`);
      return json({ error: 'Transcription failed' }, 502);
    }

    const data = await resp.json().catch(() => null) as
      { success?: boolean; result?: { text?: string } } | null;
    if (!data?.success) return json({ error: 'Transcription failed' }, 502);

    const transcript = (data.result?.text ?? '').trim();
    return json({ transcript });
  } catch (e) {
    console.error('[transcribe] error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Unexpected error' }, 500);
  }
});
