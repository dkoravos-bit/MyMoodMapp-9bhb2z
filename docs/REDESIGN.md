# MyMoodMapp redesign (Oct 2026) — branch `redesign`

## What changed
- **Tabs:** Today · Mapp · (Log) · Learn · Circle. Settings via the avatar on Today.
- **Removed:** Sound Lab, frequencies, meditations, games, astrology, Schumann, old Insights/Checkin tabs, fitness/weather detail screens, vibe-card viewer.
- **Design system:** `ui/tokens.ts`, `ui/primitives.tsx` (Sora + Inter, night ground; teal = Mind, amber = Energy, coral = Body, violet = Focus).
- **Living art:** `art/MoodField.tsx` (sky, drifting light, stars = sleep, tide = ups and downs, breathing four-lobe compass; honors Reduce Motion), `art/Compass.tsx`, `art/MoodPrint.tsx`.
- **One source of truth for art:** `supabase/functions/_shared/moodArtSpec.ts` — traits → palette, legend, alt text, day name, archetype, AI plate prompt, cache key. Imported by the app and the edge function.
- **Honest numbers:** `lib/insight.ts` — score = the four dimensions only; drivers compare your days with vs without (Welch t, n shown, Strong/Likely/Hunch); rhythm = time-of-day averages ± spread; forgiving streak (1 rest day / 7).
- **Screens:** `app/(tabs)/{index,mapp,learn,circle}.tsx`, `app/{log,voice,reveal,wrapped,experiment,share-care,settings,plans,onboarding}.tsx`.
- **Backend (live on `moaisuofjcolnbmevtlv` since 2026-10-21):** `generate-mood-art` v2 (FLUX.2 klein 4B on Cloudflare, cached by trait bucket, 12/day cap), `transcribe-voice` → Cloudflare Whisper (no Groq), new `parse-voice-log` (OpenRouter), migration `20261022000000_redesign.sql` (experiments, share_grants, mood_art_generations, user_profiles.art_tone/glow/glow_date/share_glow).

## Status
- Migration `20261022000000_redesign.sql` applied (run in the SQL editor, 2026-10-21).
- `generate-mood-art` v9, `transcribe-voice` v9, `parse-voice-log` v1 deployed (each bundle includes `_shared/http.ts`, `_shared/cors.ts`; the art function also `_shared/moodArtSpec.ts`). All three return 401 without a session.
- Still needed: a new native **build** on iOS and Android (also needed for the bundle ID / subscription changes on `onspace-migration`), then a signed-in device test of art generation and voice.

## Health data (Oct 22, 2026)
- `services/fitness.ios.ts` = Apple Health via `@kingstinct/react-native-healthkit` 16.2 (Nitro). Reads sleep (asleep stages only, iPhone+Watch overlaps merged, credited to wake day), steps, exercise minutes, workouts, active energy, resting/avg HR, HRV (SDNN), mindful minutes, time in daylight (iOS 17+). Writes each log as a **State of Mind** sample (iOS 18+), only when "Save moods to Apple Health" is on (asked once after connecting in onboarding; toggle in Settings). Tags → Apple labels/associations in `TAG_LABELS` / `TAG_ASSOC`.
- `services/fitness.android.ts` = Health Connect via `react-native-health-connect` 4.1.3 (minSdk 26 via `expo-build-properties`). Reads sleep stages, steps, active calories, exercise sessions, resting/avg HR, HRV (RMSSD). No write — Health Connect has no mood type.
- `services/fitness.ts` = web: reads what the phone synced to `fitness_data`. Shared code in `services/fitnessShared.ts`.
- **No mock data anywhere.** The old app silently generated sample data when Health wasn't connected; the new cache keys (`health_*_v2`) ignore those old caches. HealthKit can't say whether read access was granted, so "connected" means "asked"; empty days show as empty.
- HealthKit crashes if a type is queried before `requestAuthorization`, so every read goes through `ensureAuthorized()`.
- Drivers now include workouts, 30+ min daylight, mindful minutes and higher-than-usual HRV (`healthDriver` in `lib/insight.ts`), only on days that actually have that signal.
- Migration `20261022010000_fitness_health_signals.sql` adds `hrv_ms`, `mindful_minutes`, `daylight_minutes`, `workouts` to `fitness_data` — must be applied before cloud sync works.
- Before this, the repo never contained a Health library: OnSpace's build server injected `react-native-health` at build time.

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
