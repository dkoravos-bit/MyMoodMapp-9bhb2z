import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/template';
import {
  ArtLayer, Tone, toTraits, palette, legend, dayName, altText, archetype,
} from '@/supabase/functions/_shared/moodArtSpec';
import { artInputFor, useRealFitness } from './insight';
import { getPlate, periodFor } from './artPlate';

// ── Tone preference (Mirror / Calm / Lift) ───────────────────────────────────
type ToneStore = { tone: Tone; setTone: (t: Tone) => void };
export const useTone = create<ToneStore>((set) => ({
  tone: 'mirror',
  setTone: (tone) => { set({ tone }); AsyncStorage.setItem('art_tone', tone).catch(() => {}); },
}));
AsyncStorage.getItem('art_tone').then(v => { if (v === 'calm' || v === 'lift' || v === 'mirror') useTone.setState({ tone: v }); }).catch(() => {});

const WINDOW: Record<ArtLayer, number> = { now: 1, week: 7, month: 30 };

/** Everything a piece of art needs, from one trait vector. */
export function useMoodArt(layer: ArtLayer, opts: { fetchPlate?: boolean } = {}) {
  const { moodLogEntries, weatherData } = useApp();
  const fitnessData = useRealFitness();
  const { user } = useAuth();
  const tone = useTone(s => s.tone);
  const input = useMemo(
    () => artInputFor(moodLogEntries, fitnessData, weatherData?.condition ?? null, WINDOW[layer]),
    [moodLogEntries, fitnessData, weatherData?.condition, layer],
  );
  const traits = useMemo(() => (input ? toTraits(input, tone) : null), [input, tone]);
  const derived = useMemo(() => traits && ({
    palette: palette(traits),
    legend: legend(traits, layer),
    name: dayName(traits),
    alt: altText(traits),
    archetype: archetype(traits),
  }), [traits]);

  const [plateUrl, setPlateUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!opts.fetchPlate || !traits || !user?.id) return;
    getPlate(user.id, layer, periodFor(layer), traits).then(u => { if (alive) setPlateUrl(u); });
    return () => { alive = false; };
  }, [opts.fetchPlate, traits, user?.id, layer]);

  return { input, traits, plateUrl, ...(derived ?? {}) } as {
    input: typeof input; traits: typeof traits; plateUrl: string | null;
    palette?: ReturnType<typeof palette>; legend?: ReturnType<typeof legend>; name?: string; alt?: string; archetype?: ReturnType<typeof archetype>;
  };
}
