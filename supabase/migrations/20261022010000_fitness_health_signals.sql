-- Extra health signals synced from Apple Health / Health Connect (used by mood drivers and the web app).
alter table public.fitness_data
  add column if not exists hrv_ms numeric,
  add column if not exists mindful_minutes integer,
  add column if not exists daylight_minutes integer,
  add column if not exists workouts integer;
