# MyMoodMapp redesign (Oct 2026) — branch `redesign`

## What changed
- **Tabs:** Today · Mapp · (Log) · Learn · Circle. Settings via the avatar on Today.
- **Removed:** Sound Lab, frequencies, meditations, games, astrology, Schumann, old Insights/Checkin tabs, fitness/weather detail screens, vibe-card viewer.
- **Design system:** `ui/tokens.ts`, `ui/primitives.tsx` (Sora + Inter, night ground; teal = Mind, amber = Energy, coral = Body, violet = Focus).
- **Living art:** `art/MoodField.tsx` (sky, drifting light, stars = sleep, tide = ups and downs, breathing four-lobe compass; honors Reduce Motion), `art/Compass.tsx`, `art/MoodPrint.tsx`.
- **One source of truth for art:** `supabase/functions/_shared/moodArtSpec.ts` — traits → palette, legend, alt text, day name, archetype, AI plate prompt, cache key. Imported by the app and the edge function.
- **Honest numbers:** `lib/insight.ts` — score = the four dimensions only; drivers compare your days with vs without (Welch t, n shown, Strong/Likely/Hunch); rhythm = time-of-day averages ± spread; forgiving streak (1 rest day / 7).
- **Screens:** `app/(tabs)/{index,mapp,learn,circle}.tsx`, `app/{log,voice,reveal,wrapped,experiment,share-care,settings,plans,onboarding}.tsx`.
- **Backend (written, NOT yet deployed):** `generate-mood-art` v2 (FLUX.2 klein 4B on Cloudflare, cached by trait bucket, 12/day cap), `transcribe-voice` → Cloudflare Whisper (no Groq), new `parse-voice-log` (OpenRouter), migration `20261022000000_redesign.sql` (experiments, share_grants, mood_art_generations, user_profiles.art_tone/glow/glow_date/share_glow).

## Before it works end to end
1. Apply migration `20261022000000_redesign.sql` to project `moaisuofjcolnbmevtlv`.
2. Deploy `generate-mood-art`, `transcribe-voice`, `parse-voice-log` (include `_shared/moodArtSpec.ts`, `_shared/http.ts`, `_shared/cors.ts`).
3. New native **build** on iOS and Android (also needed for the bundle ID / subscription changes on `onspace-migration`).

## Platform parity — needs device testing
- Slider: native uses `@react-native-community/slider`; web uses `<input type=range>` (`ui/Slider.tsx`).
- Mood Print glow (SVG blur) is skipped on Android; arcs stay crisp.
- Voice: `expo-audio` recording; iOS records m4a — confirm Cloudflare Whisper decodes it. Android needs RECORD_AUDIO (already in app.json).
- Health: iOS Apple Health, Android Health Connect via `services/fitness.native.ts`; web shows "App only". The web/fallback fitness service returns mock data — the redesign ignores it (`useRealFitness`).
- Wrapped share/save uses `react-native-view-shot` + `expo-sharing` / `expo-media-library` (native only; web shows a hint).

## Local design preview (web)
`EXPO_PUBLIC_PREVIEW=1 npx expo export --platform web --output-dir dist-web` skips the sign-in gate so the redesign can be clicked through with local sample logs. Never set this variable in store builds.

## Known gaps / next
- Therapist share choices are saved (`share_grants`), but RLS still gives an active therapist read access to all mood rows; the dashboard should honor the grant (or move to a view).
- Circle nudges use the system share sheet (no push yet).
- Old screens kept as-is in the old look: cycle-tracker, quiz/result, accountability, buddy-activity, therapist-dashboard, account, login, landing.
- Legend says "Last night's sleep" even when no sleep data is connected (stars default to "a few").
