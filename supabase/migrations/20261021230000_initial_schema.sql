-- MyMoodMapp initial schema, captured from the previous backend's live catalog on 2026-10-21.
-- Triggers are in the next migration.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  email text not null,
  display_name text,
  role text not null default 'user'::text,
  subscription_tier text not null default 'free'::text,
  subscription_status text default 'inactive'::text,
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_done boolean not null default false,
  birthdate text,
  notification_token text,
  last_logged_at timestamptz,
  sex text default 'prefer_not_to_say'::text
);

create table public.accountability_buddies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  buddy_id uuid references public.user_profiles(id) on delete set null,
  buddy_email text not null,
  buddy_name text,
  status text not null default 'pending'::text,
  notify_after_hours integer not null default 24,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  notifications_enabled boolean not null default true
);

create table public.fitness_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  date text not null,
  steps integer not null default 0,
  active_minutes integer not null default 0,
  resting_heart_rate integer,
  avg_heart_rate integer,
  calories_burned integer not null default 0,
  workout_minutes integer not null default 0,
  sleep_hours numeric(4,1),
  synced_at timestamptz not null default now(),
  constraint fitness_data_user_id_date_key unique (user_id, date)
);

create table public.intake_questionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  presenting_concern text,
  phq9_scores integer[] default '{}'::integer[],
  phq9_total integer,
  gad7_scores integer[] default '{}'::integer[],
  gad7_total integer,
  sleep_scores integer[] default '{}'::integer[],
  auditc_scores integer[] default '{}'::integer[],
  auditc_total integer,
  trauma_flag boolean default false,
  safety_flag boolean default false,
  safety_detail text,
  contextual jsonb default '{}'::jsonb,
  clinical_summary jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint intake_questionnaires_user_id_key unique (user_id)
);

create table public.menstrual_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  period_start text not null,
  period_end text,
  cycle_length integer,
  flow_intensity text default 'medium'::text,
  symptoms text[] default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  local_id text not null,
  date text not null,
  "timestamp" bigint not null,
  score integer not null,
  dimensions jsonb not null default '{}'::jsonb,
  primary_tag text,
  additional_tags text[] default '{}'::text[],
  journal_text text,
  audio_uri text,
  transcript text,
  selfie_uri text,
  time_of_day text,
  "time" text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mood_entries_user_id_local_id_key unique (user_id, local_id)
);

create table public.sound_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  sound_id text not null,
  sound_name text not null,
  sound_category text not null,
  duration_seconds integer not null default 0,
  timer_minutes integer,
  mood_before integer,
  mood_after integer,
  mood_delta integer generated always as (mood_after - mood_before) stored,
  notes text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  user_email text not null,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  stripe_product_id text,
  status text not null default 'inactive'::text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.therapist_clients (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.user_profiles(id) on delete cascade,
  client_id uuid references public.user_profiles(id) on delete set null,
  client_email text not null,
  client_name text,
  invite_token text default encode(extensions.gen_random_bytes(16), 'hex'::text),
  status text not null default 'pending'::text,
  notify_after_hours integer not null default 48,
  last_notified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  notifications_enabled boolean not null default true,
  constraint therapist_clients_invite_token_key unique (invite_token)
);

create table public.therapist_client_notes (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.user_profiles(id) on delete cascade,
  client_id uuid not null references public.user_profiles(id) on delete cascade,
  therapist_client_row_id uuid references public.therapist_clients(id) on delete cascade,
  note_text text not null default ''::text,
  audio_uri text,
  transcript text,
  note_date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wellness_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  report_type text not null default 'weekly'::text,
  period_start text not null,
  period_end text not null,
  report_data jsonb not null default '{}'::jsonb,
  ai_summary text,
  generated_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index idx_accountability_buddies_buddy on public.accountability_buddies using btree (buddy_id);
create index idx_fitness_data_user_date on public.fitness_data using btree (user_id, date desc);
create index idx_intake_user on public.intake_questionnaires using btree (user_id, completed_at desc);
create index idx_menstrual_cycles_user_date on public.menstrual_cycles using btree (user_id, period_start desc);
create index idx_mood_entries_timestamp on public.mood_entries using btree (user_id, "timestamp" desc);
create index idx_mood_entries_user_date on public.mood_entries using btree (user_id, date);
create index idx_sound_sessions_sound on public.sound_sessions using btree (sound_id);
create index idx_sound_sessions_user on public.sound_sessions using btree (user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions using btree (stripe_customer_id);
create unique index subscriptions_user_id_key on public.subscriptions using btree (user_id);
create index idx_tcnotes_date on public.therapist_client_notes using btree (note_date);
create index idx_tcnotes_therapist_client on public.therapist_client_notes using btree (therapist_id, client_id);
create index idx_therapist_clients_client on public.therapist_clients using btree (client_id);
create index idx_therapist_clients_therapist on public.therapist_clients using btree (therapist_id);
create index idx_wellness_reports_user on public.wellness_reports using btree (user_id, generated_at desc);

-- ── Functions ────────────────────────────────────────────────────────────────
create or replace function public.get_buddy_ids_for_user(p_uid uuid)
 returns table(partner_id uuid)
 language sql stable security definer
as $function$
 select buddy_id as partner_id
 from public.accountability_buddies
 where user_id = p_uid
 and buddy_id is not null
 and status in ('active', 'pending')
 union
 select user_id as partner_id
 from public.accountability_buddies
 where buddy_id = p_uid
 and status in ('active', 'pending');
$function$;

create or replace function public.get_client_ids_for_therapist(p_uid uuid)
 returns table(client_id uuid)
 language sql stable security definer
as $function$
 select client_id
 from public.therapist_clients
 where therapist_id = p_uid
 and status = 'active'
 and client_id is not null;
$function$;

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql security definer
as $function$
 begin
 insert into public.user_profiles (id, username, email)
 values (
 new.id,
 coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
 new.email
 );
 return new;
 end;
$function$;

create or replace function public.sync_user_metadata()
 returns trigger
 language plpgsql security definer
as $function$
 begin
 -- When raw_user_meta_data.username changes, sync it to user_profiles
 update public.user_profiles
 set username = coalesce(new.raw_user_meta_data->>'username', old.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
 where id = new.id;
 return new;
 end;
$function$;

create or replace function public.update_last_logged_at()
 returns trigger
 language plpgsql security definer
as $function$
begin
 update public.user_profiles
 set last_logged_at = now()
 where id = new.user_id;
 return new;
end;
$function$;

-- ── Row level security ───────────────────────────────────────────────────────
alter table public.accountability_buddies enable row level security;
alter table public.fitness_data enable row level security;
alter table public.intake_questionnaires enable row level security;
alter table public.menstrual_cycles enable row level security;
alter table public.mood_entries enable row level security;
alter table public.sound_sessions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.therapist_client_notes enable row level security;
alter table public.therapist_clients enable row level security;
alter table public.user_profiles enable row level security;
alter table public.wellness_reports enable row level security;

create policy authenticated_manage_own_buddies on public.accountability_buddies for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy buddy_update_status on public.accountability_buddies for update to authenticated using (buddy_id = auth.uid());
create policy buddy_view_own_requests on public.accountability_buddies for select to authenticated using (buddy_id = auth.uid());

create policy authenticated_delete_own_fitness on public.fitness_data for delete to authenticated using (user_id = auth.uid());
create policy authenticated_insert_own_fitness on public.fitness_data for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_fitness on public.fitness_data for select to authenticated using (user_id = auth.uid());
create policy authenticated_update_own_fitness on public.fitness_data for update to authenticated using (user_id = auth.uid());

create policy authenticated_insert_own_intake on public.intake_questionnaires for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_intake on public.intake_questionnaires for select to authenticated using (user_id = auth.uid());
create policy authenticated_update_own_intake on public.intake_questionnaires for update to authenticated using (user_id = auth.uid());
create policy therapist_select_client_intake on public.intake_questionnaires for select to authenticated using (exists (select 1 from public.therapist_clients tc where tc.therapist_id = auth.uid() and tc.client_id = intake_questionnaires.user_id and tc.status = 'active'::text));

create policy authenticated_delete_own_cycles on public.menstrual_cycles for delete to authenticated using (user_id = auth.uid());
create policy authenticated_insert_own_cycles on public.menstrual_cycles for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_cycles on public.menstrual_cycles for select to authenticated using (user_id = auth.uid());
create policy authenticated_update_own_cycles on public.menstrual_cycles for update to authenticated using (user_id = auth.uid());

create policy authenticated_delete_own_mood on public.mood_entries for delete to authenticated using (user_id = auth.uid());
create policy authenticated_insert_own_mood on public.mood_entries for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_mood on public.mood_entries for select to authenticated using (user_id = auth.uid());
create policy authenticated_update_own_mood on public.mood_entries for update to authenticated using (user_id = auth.uid());
create policy therapist_select_client_mood on public.mood_entries for select to authenticated using (exists (select 1 from public.therapist_clients tc where tc.therapist_id = auth.uid() and tc.client_id = mood_entries.user_id and tc.status = 'active'::text));

create policy authenticated_delete_own_sound_sessions on public.sound_sessions for delete to authenticated using (user_id = auth.uid());
create policy authenticated_insert_own_sound_sessions on public.sound_sessions for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_sound_sessions on public.sound_sessions for select to authenticated using (user_id = auth.uid());

create policy anon_no_select on public.subscriptions for select to anon using (false);
create policy authenticated_select_own_subscription on public.subscriptions for select to authenticated using (user_id = auth.uid());

create policy therapist_manage_own_notes on public.therapist_client_notes for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid());

create policy client_update_therapist_status on public.therapist_clients for update to authenticated using ((client_id = auth.uid()) or ((client_id is null) and (client_email = lower(auth.email()))));
create policy client_view_own_therapist_link on public.therapist_clients for select to authenticated using ((client_id = auth.uid()) or ((client_id is null) and (client_email = lower(auth.email()))));
create policy therapist_manage_own_clients on public.therapist_clients for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid());

create policy "Users can delete own profile" on public.user_profiles for delete to public using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles for update to public using (auth.uid() = id);
create policy select_buddy_and_client_profiles on public.user_profiles for select to authenticated using (
  (id in (select partner_id from public.get_buddy_ids_for_user(auth.uid())))
  or (id in (select client_id from public.get_client_ids_for_therapist(auth.uid())))
);
create policy select_own_profile on public.user_profiles for select to authenticated using (auth.uid() = id);

create policy authenticated_insert_own_reports on public.wellness_reports for insert to authenticated with check (user_id = auth.uid());
create policy authenticated_select_own_reports on public.wellness_reports for select to authenticated using (user_id = auth.uid());
create policy therapist_select_client_reports on public.wellness_reports for select to authenticated using (exists (select 1 from public.therapist_clients tc where tc.therapist_id = auth.uid() and tc.client_id = wellness_reports.user_id and tc.status = 'active'::text));

-- ── Storage ──────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('vibe-cards', 'vibe-cards', true)
on conflict (id) do nothing;

create policy public_read_vibe_cards on storage.objects for select to anon using (bucket_id = 'vibe-cards'::text);
create policy service_insert_vibe_cards on storage.objects for insert to authenticated with check (bucket_id = 'vibe-cards'::text);
