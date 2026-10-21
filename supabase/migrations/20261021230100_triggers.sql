-- Triggers, added after the one-time data copy from the previous backend so the copy
-- itself didn't auto-create duplicate profiles or overwrite last_logged_at.
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_updated after update on auth.users
  for each row when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sync_user_metadata();

create trigger on_mood_entry_insert after insert or update on public.mood_entries
  for each row execute function public.update_last_logged_at();
