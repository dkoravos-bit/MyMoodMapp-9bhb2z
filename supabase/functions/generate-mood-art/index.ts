/**
 * generate-mood-art — AI image generation via Cloudflare Workers AI (FLUX Schnell)
 *
 * Primary:  Cloudflare Workers AI → @cf/black-forest-labs/flux-1-schnell
 *           Uses CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_API_TOKEN (server-side only)
 * Fallback: Pollinations.ai (flux, free, no key)
 *
 * Art types:
 *   "now"       → sacred geometry / parallel universe portal for current emotional state
 *   "landscape" → emotional terrain panorama (week/month views)
 *   "forecast"  → atmospheric sky scene for 48h prediction
 *   "print"     → eccentric alien mood fingerprint / soul signature
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ── Dimension helpers ────────────────────────────────────────────────────────
const palette = (s: number) => {
  if (s >= 80) return 'warm amber gold, radiant sunrise orange, luminous cream, thriving energy';
  if (s >= 65) return 'cool teal, sage green, clear sky blue, calm and peaceful';
  if (s >= 50) return 'soft gold, warm sand, muted amber, neutral warmth';
  if (s >= 35) return 'deep indigo, slate blue, cool violet, introspective';
  return 'deep navy, midnight blue, dark slate, heavy and brooding';
};

const sceneMood = (s: number) => {
  if (s >= 80) return 'expansive, radiant, full of light and energy';
  if (s >= 65) return 'serene, clear, quietly beautiful';
  if (s >= 50) return 'gentle, hazy, in-between states';
  if (s >= 35) return 'brooding, quiet, introspective';
  return 'heavy, deep, searching for light';
};

// ── Cloudflare Workers AI — FLUX Schnell ─────────────────────────────────────
async function generateViaCloudflare(
  prompt: string,
  seed: number,
): Promise<{ base64: string; contentType: string } | null> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken  = Deno.env.get('CLOUDFLARE_AI_API_TOKEN');

  if (!accountId || !apiToken) {
    console.warn('[mood-art] Cloudflare credentials not configured');
    return null;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, steps: 4, seed }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      console.warn(`[mood-art] Cloudflare HTTP ${resp.status}: ${errText}`);
      return null;
    }

    // CF Workers AI returns JSON: { result: { image: "<base64>" }, success: true }
    const data = await resp.json();

    if (!data?.success) {
      console.warn('[mood-art] Cloudflare returned success=false:', JSON.stringify(data?.errors));
      return null;
    }

    const imageBase64: string | undefined = data?.result?.image;
    if (!imageBase64 || imageBase64.length < 100) {
      console.warn('[mood-art] Cloudflare returned empty image field');
      return null;
    }

    console.log(`[mood-art] Cloudflare FLUX success, base64 length=${imageBase64.length}`);
    return { base64: imageBase64, contentType: 'image/png' };

  } catch (err) {
    console.warn('[mood-art] Cloudflare fetch error:', err);
    return null;
  }
}

// ── Pollinations.ai — free fallback ──────────────────────────────────────────
async function generateViaPollinations(
  prompt: string,
  w: number,
  h: number,
  seed: number,
): Promise<{ base64: string; contentType: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 10000 * attempt));
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&enhance=false&seed=${seed + attempt}&safe=false`;
      const imgResp = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(90000) });
      if (!imgResp.ok) {
        console.warn(`[mood-art] Pollinations HTTP ${imgResp.status} (attempt ${attempt + 1})`);
        continue;
      }
      const buf = await imgResp.arrayBuffer();
      if (buf.byteLength > 1000) {
        const uint8 = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64 = btoa(binary);
        const contentType = imgResp.headers.get('content-type') ?? 'image/jpeg';
        console.log(`[mood-art] Pollinations success (attempt ${attempt + 1}), bytes=${buf.byteLength}`);
        return { base64, contentType };
      }
    } catch (pe) {
      console.warn(`[mood-art] Pollinations attempt ${attempt + 1} failed:`, pe);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      artType,
      score,
      dimensions,
      dominantTag,
      volatility,
      trend,
      timeOfDay,
      forecastMood,
      cyclePhase,
      weatherCondition,
      entryCount,
      seedOverride,
    } = await req.json();

    const s = score ?? 50;
    const dimBody   = dimensions ? Math.round(((dimensions.body + 1) / 2) * 100) : 50;
    const dimMind   = dimensions ? Math.round(((dimensions.mind + 1) / 2) * 100) : 50;
    const dimEnergy = dimensions ? Math.round(dimensions.energy * 100) : 50;

    let prompt = '';
    let aspectRatio = '1:1';

    // ── Build prompt by art type ─────────────────────────────────────────────
    if (artType === 'landscape') {
      aspectRatio = '16:9';
      prompt = [
        `Aerial topographic landscape, cinematic drone photography, emotional data visualization.`,
        `Mood ${s}/100: ${sceneMood(s)}. Colors: ${palette(s)}.`,
        `Terrain height reflects wellbeing — peaks are thriving days, valleys are struggles.`,
        dimBody > 70 ? 'Lush green meadows and valleys.' : dimBody > 40 ? 'Mixed terrain, patches of color.' : 'Sparse rocky terrain.',
        dimMind > 70 ? 'Crystal clear atmosphere, sharp mountain ridges.' : dimMind > 40 ? 'Morning mist in the valleys.' : 'Heavy fog over the landscape.',
        dimEnergy > 70 ? 'Dramatic golden hour light, long warm shadows.' : dimEnergy > 40 ? 'Soft diffused afternoon light.' : 'Overcast flat subdued light.',
        trend === 'improving' ? 'A glowing river flows toward bright highlands.' : trend === 'declining' ? 'Terrain descends into misty valleys.' : 'Balanced plateau with varied terrain.',
        cyclePhase === 'follicular' ? 'Spring-green bloom accent.' : cyclePhase === 'ovulation' ? 'Golden summit highlight.' : cyclePhase === 'luteal' ? 'Warm amber autumn tones.' : cyclePhase === 'menstrual' ? 'Deep red earth tones.' : '',
        'National Geographic photorealistic quality, ultra-detailed, no text, no people, no UI.',
      ].filter(Boolean).join(' ');
    }

    else if (artType === 'print') {
      // ── Glowing neon arc fingerprint — exact MyMoodMapp app icon style ──────
      // The icon shows a LOOP-type fingerprint: wide sweeping horizontal arcs
      // that do NOT form closed circles. The ridges stack vertically — wide
      // at the top, narrowing as they descend, with the loop core visible
      // near the center-bottom. Each ridge is a thick 3D glowing tube with a
      // rounded cross-section, inner bright core, and wide soft outer halo.
      // Colors flow TOP → BOTTOM: warm amber/gold → electric teal/cyan → violet/purple → coral-pink.
      // Pure jet-black background. The arcs go edge-to-edge horizontally.
      aspectRatio = '1:1';

      // Crown arc color (topmost widest arcs)
      const crownColor = s >= 70
        ? 'blazing warm amber and gold — bright as sunrise, intensely luminous'
        : s >= 50
          ? 'warm honey-amber glowing softly from within'
          : 'dim ochre-bronze faintly lit';

      // Upper-middle arc color
      const upperMidColor = s >= 70
        ? 'vivid electric teal and bright cyan — the arcs pulse with cold neon light'
        : s >= 50
          ? 'soft teal-mint with a gentle inner glow'
          : 'muted steel-teal barely illuminated';

      // Lower-middle arc color
      const lowerMidColor = s >= 70
        ? 'rich violet and luminous lavender — deep purple with amethyst shimmer'
        : s >= 50
          ? 'mid purple-lavender with soft amethyst highlights'
          : 'cold dark indigo almost fading to black';

      // Base arc color (the tightest innermost curves near the delta)
      const baseColor = dimEnergy > 55
        ? 'warm coral-pink and soft rose — the innermost loops glow with warm light'
        : 'cool mauve-pink, faint and delicate at the convergence point';

      // Ridge thickness
      const ridgeWeight = (dimBody + dimEnergy) / 2 > 55
        ? 'very thick — each arc is a fat rounded tube, bold and dominant, with a wide bright core and massive outer glow halo'
        : 'medium thickness — rounded tube arcs, elegant and refined, with a bright inner core and moderate glow';

      // Arc shape (loop fingerprint, not whorl)
      const arcShape = volatility === 'stable'
        ? 'perfectly symmetrical horizontal arcs — each one a smooth wide parabola, the loops converge to a single clean point at the lower center'
        : volatility === 'variable'
          ? 'slightly asymmetric sweeping arcs — some wider on the left, some on the right, organic and hand-drawn feeling'
          : 'dramatically arched curves — steep sharp peaks at the top, the loops converge at an acute angle below';

      // Trend effect on brightness distribution
      const brightnessDist = trend === 'improving'
        ? 'The topmost amber arcs are the BRIGHTEST — blazing and dominant. Brightness gradually softens toward the base.'
        : trend === 'declining'
          ? 'The lower pink arcs glow brightest — a quiet warmth pulling inward. The upper arcs are somewhat dimmer.'
          : 'Every arc glows with equal intensity from crown to base — perfect luminous equilibrium.';

      prompt = [
        `A glowing fingerprint portrait on a pure jet-black background. This is a LOOP-TYPE fingerprint: the ridges are wide sweeping horizontal arcs that stack from top to bottom — they do NOT form concentric circles. The arcs are widest at the top and gradually tighten as they descend, converging at a loop core point near the lower center.`,
        `Each ridge is ${ridgeWeight}. Every arc is a smooth 3D rounded tube — like a glowing neon pipe — with a bright luminous inner core, a vivid neon-colored surface, and a wide soft outer glow halo bleeding into the black void around it.`,
        `The arcs extend horizontally across the FULL WIDTH of the image — they begin and end beyond the frame edges, just like a real fingerprint scan.`,
        `Color gradient flowing strictly TOP to BOTTOM: ${crownColor} for the topmost 4-5 arcs. ${upperMidColor} for the next band of arcs. ${lowerMidColor} for the lower arcs. ${baseColor} at the innermost loop curves.`,
        `${arcShape}.`,
        `${brightnessDist}`,
        `The negative space between every arc is pure black — clean, dark, unlit — which makes each glowing tube arc pop with maximum contrast.`,
        dimMind > 60
          ? 'The arc curves are mathematically smooth and precise — no rough edges, perfectly rendered geometry.'
          : 'The arc curves have a subtle organic softness — slightly imperfect, like a real fingerprint scan.',
        s >= 65
          ? 'Faint star-dust bokeh particles scattered in the deep black background — tiny cosmic sparkles that add depth without distracting from the arcs.'
          : 'Pure black background, zero background elements — the arcs are the only source of light.',
        dominantTag ? `The overall palette has a subtle emotional resonance with the feeling of "${dominantTag}".` : '',
        'Ultra high resolution, 3D render quality, cinematic studio lighting, photorealistic glowing neon tubes. Centered portrait composition. Square format. Absolutely no text, no numbers, no UI elements, no labels, no human faces, no human body parts.',
        'This image should look EXACTLY like the MyMoodMapp app icon: thick curved glowing neon arcs on a deep black background, arranged as a loop-type fingerprint with color flowing from warm amber at top through teal in the middle to purple then pink at the base.',
      ].filter(Boolean).join(' ');
    }

    else if (artType === 'forecast') {
      aspectRatio = '16:9';
      const sky = forecastMood === 'high'
        ? 'golden sunrise breaking through dramatic clouds, warm amber light, expansive optimistic sky'
        : forecastMood === 'low'
          ? 'moody twilight with brooding low clouds, atmospheric indigo and deep purple'
          : 'soft mid-day light, scattered clouds, balanced peaceful tone';
      prompt = [
        `Atmospheric sky panorama, 48-hour emotional weather forecast scene. Cinematic landscape.`,
        `Sky: ${sky}.`,
        `Colors: ${palette(s)}.`,
        weatherCondition ? `Weather: ${weatherCondition} conditions reflected in clouds.` : '',
        dimEnergy > 60 ? 'High altitude cirrus clouds, fast-moving energetic sky.' : 'Low cumulus clouds, slow-moving grounded atmosphere.',
        trend === 'improving' ? 'Clearing skies with golden beams breaking through.' : trend === 'declining' ? 'Approaching weather front, dramatic contrast.' : 'Stable balanced atmospheric conditions.',
        timeOfDay === 'morning' ? 'Misty lake reflection in the foreground.' : timeOfDay === 'evening' ? 'Silhouetted treeline at dusk.' : timeOfDay === 'night' ? 'Starlit horizon.' : 'Expansive open meadow foreground.',
        'Ultra-sharp, cinematic quality, no text, no people.',
      ].filter(Boolean).join(' ');
    }

    else {
      // ── 'now' — sacred geometry / parallel universe portal ───────────────
      aspectRatio = '1:1';

      // Core geometry shifts with score
      const geometryCore = s > 65
        ? 'Sri Yantra radiating from the center — nine interlocking triangles forming a star gateway, each triangle edge glowing with plasma light, the bindu point a blinding white singularity'
        : s > 40
          ? 'Metatrons Cube at the center — all five Platonic solids nested inside one another, slowly rotating in different axes, edges lit with bioluminescent light'
          : 'Flower of Life in deep contraction — overlapping circles pulling inward, petals of the mandala dimming toward a dark central void, sacred geometry under strain';

      // Outer field shifts with mind dimension
      const outerField = dimMind > 60
        ? 'outer ring: infinite Mandelbrot fractal zoom — recursive self-similar patterns expanding to every edge, each iteration revealing new universes nested inside the previous'
        : 'outer ring: hyperbolic tessellation tiles warping outward like an Escher universe — identical sacred shapes that never repeat, curving to infinity';

      // Energy layer shifts with energy dimension
      const energyLayer = dimEnergy > 60
        ? 'mid-layer: lightning plasma arcs trace the golden ratio spiral from the center outward, Fibonacci geometry made of pure electricity'
        : 'mid-layer: slow Aurora Borealis ribbons fold through the geometric structure like veils between dimensions, soft and diffuse';

      // Portal / multiverse element shifts with volatility
      const portalElement = volatility === 'stable'
        ? 'Four equidistant wormhole apertures at cardinal points — perfect circular tunnels receding into parallel universes, each showing a different colored cosmos at the far end'
        : volatility === 'variable'
          ? 'Asymmetric quantum foam of micro-wormholes scattered throughout — dozens of tiny portals of different sizes, each a pinhole into another timeline'
          : 'A fracturing dimensional rift bisecting the composition — spacetime tearing at the seams, revealing raw prismatic light from the void between universes';

      // Trend color diffusion
      const trendAtmosphere = trend === 'improving'
        ? 'The entire composition breathes outward — geometry expanding, portals opening wider, light intensifying toward the edges'
        : trend === 'declining'
          ? 'The entire composition contracts inward — geometry tightening, portals narrowing, energy drawing back toward the center point'
          : 'The composition holds perfect dynamic tension — geometry neither expanding nor collapsing, a sacred equilibrium';

      prompt = [
        `Sacred geometry mystical portal, parallel universe gateway, quantum cosmology art. Ultra-detailed digital sacred art.`,
        `Mood ${s}/100: ${sceneMood(s)}. Color palette: ${palette(s)}, deep cosmic black void background.`,
        `Central structure: ${geometryCore}.`,
        `${outerField}.`,
        `${energyLayer}.`,
        `${portalElement}.`,
        `${trendAtmosphere}.`,
        dimBody > 60 ? 'Body dimension manifests as thick golden torus rings encircling the central geometry, grounded electromagnetic presence.' : 'Body dimension manifests as wispy ethereal rings, barely-there luminous filaments orbiting the core.',
        cyclePhase === 'follicular' ? 'Crescent moon phase geometry woven into the outer mandala ring.' : cyclePhase === 'ovulation' ? 'Full circle completeness geometry — every form at maximum expansion and radiance.' : cyclePhase === 'luteal' ? 'Waning spiral geometry — forms beginning their inward sacred journey.' : cyclePhase === 'menstrual' ? 'Dark moon void geometry — stillness, the pause before cosmic rebirth.' : '',
        dominantTag ? `The dominant emotional frequency of "${dominantTag}" resonates as a specific harmonic interference pattern visible in the geometry.` : '',
        'Hyper-detailed, 8K quality render, mystical sacred art aesthetic. No text, no symbols with text meaning, no UI, no people.',
      ].filter(Boolean).join(' ');
    }

    // ── Seed & dimensions ────────────────────────────────────────────────────
    const seed = (seedOverride != null ? Number(seedOverride) : null) ?? Math.floor(Math.random() * 999999);
    // Pollinations fallback dimensions (CF always returns ~1024 native)
    const fbW = aspectRatio === '16:9' ? 640 : 512;
    const fbH = aspectRatio === '16:9' ? 360 : 512;

    console.log(`[mood-art] Generating ${artType} | aspect=${aspectRatio} | seed=${seed}`);

    // ── 1. Try Cloudflare Workers AI (FLUX Schnell) ──────────────────────────
    let result = await generateViaCloudflare(prompt, seed);

    // ── 2. Fallback to Pollinations.ai ───────────────────────────────────────
    if (!result) {
      console.log('[mood-art] Cloudflare failed — falling back to Pollinations.ai');
      result = await generateViaPollinations(prompt, fbW, fbH, seed);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Image generation failed on all providers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Upload to Supabase Storage ───────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ext = result.contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `mood-art/${artType}-${Date.now()}-${seed}.${ext}`;

    const binaryStr = atob(result.base64);
    const imageBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) imageBytes[i] = binaryStr.charCodeAt(i);

    const { error: uploadError } = await supabase.storage
      .from('vibe-cards')
      .upload(fileName, imageBytes.buffer, {
        contentType: result.contentType,
        cacheControl: '86400',
        upsert: false,
      });

    if (uploadError) {
      console.error('[mood-art] Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('vibe-cards')
      .getPublicUrl(fileName);

    console.log(`[mood-art] Done: ${publicUrl}`);

    return new Response(
      JSON.stringify({ artUrl: publicUrl, artType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[mood-art] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
