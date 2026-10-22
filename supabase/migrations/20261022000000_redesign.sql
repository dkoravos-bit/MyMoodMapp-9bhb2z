-- MyMoodMapp redesign: experiments, client→therapist share grants, art tone,
-- and the mood-art generation log used by generate-mood-art's daily cap.

-- ── Experiments ──────────────────────────────────────────────────────────────
create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  driver_key text not null,
  title text not null,
  rule text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'ended')),
  baseline_avg numeric,
  result_avg numeric,
  result_summary text,
  buddy_id uuid null,
  created_at timestamptz not null default now(),
  constraint experiments_dates_ok check (ends_on >= starts_on)
);

create index if not exists idx_experiments_user_status on public.experiments (user_id, status);

alter table public.experiments enable row level security;

drop policy if exists experiments_select_own on public.experiments;
drop policy if exists experiments_insert_own on public.experiments;
drop policy if exists experiments_update_own on public.experiments;
drop policy if exists experiments_delete_own on public.experiments;
create policy experiments_select_own on public.experiments for select to authenticated using (user_id = auth.uid());
create policy experiments_insert_own on public.experiments for insert to authenticated with check (user_id = auth.uid());
create policy experiments_update_own on public.experiments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy experiments_delete_own on public.experiments for delete to authenticated using (user_id = auth.uid());

-- ── Share grants (what a client shares with their therapist) ────────────────
create table if not exists public.share_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  therapist_id uuid null references auth.users(id) on delete set null,
  therapist_email text,
  include_mood boolean not null default true,
  include_drivers boolean not null default true,
  include_health boolean not null default true,
  include_checks boolean not null default true,
  include_tags boolean not null default false,
  include_notes boolean not null default false,
  range_days int not null default 14 check (range_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_share_grants_user on public.share_grants (user_id);
create index if not exists idx_share_grants_therapist on public.share_grants (therapist_id);

alter table public.share_grants enable row level security;

drop policy if exists share_grants_client_manage on public.share_grants;
drop policy if exists share_grants_therapist_select on public.share_grants;
create policy share_grants_client_manage on public.share_grants for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy share_grants_therapist_select on public.share_grants for select to authenticated
  using (therapist_id = auth.uid());

create or replace function public.share_grants_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_share_grants_updated_at on public.share_grants;
create trigger trg_share_grants_updated_at before update on public.share_grants
  for each row execute function public.share_grants_touch_updated_at();

-- ── Art tone on the profile ──────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists art_tone text default 'mirror'
  check (art_tone in ('mirror', 'calm', 'lift'));

-- ── Mood-art generation log (daily cap in generate-mood-art) ────────────────
-- Written only by the edge function (service role). Owners may read their own rows.
create table if not exists public.mood_art_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layer text not null check (layer in ('now', 'week', 'month')),
  period text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mood_art_generations_user_time on public.mood_art_generations (user_id, created_at);

alter table public.mood_art_generations enable row level security;

drop policy if exists mood_art_generations_select_own on public.mood_art_generations;
create policy mood_art_generations_select_own on public.mood_art_generations for select to authenticated
  using (user_id = auth.uid());

-- ── Circle "glow": a coarse, opt-out status buddies can see (never scores or notes) ──
alter table public.user_profiles add column if not exists glow text check (glow in ('bright', 'steady', 'quiet'));
alter table public.user_profiles add column if not exists glow_date date;
alter table public.user_profiles add column if not exists share_glow boolean not null default true;
