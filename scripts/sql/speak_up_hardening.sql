-- Speak Up: security hardening. Run once in the Supabase SQL editor, after speak_up.sql.
-- Safe to run again. (A fresh run of speak_up.sql already includes all of this.)

-- 1. Handler approval. A handler only receives reports for the roles another handler has approved, so an
--    administrator cannot add themselves (or change a role) and quietly start receiving reports.
alter table public.speak_up_handlers add column if not exists approved_roles text[] not null default '{}';
alter table public.speak_up_handlers add column if not exists approved_by text;
alter table public.speak_up_handlers add column if not exists approved_at timestamptz;

-- Anyone who already has a key is treated as approved for their current roles (the test set-up).
update public.speak_up_handlers
   set approved_roles = roles, approved_by = 'initial set-up', approved_at = now()
 where public_key is not null and approved_roles = '{}';

-- 2. The reference-number function and all tables are for the server only. Without this, anyone holding the
--    public key could call the function and watch the numbers to see when reports arrive.
revoke execute on function public.next_speak_up_reference() from public, anon, authenticated;
grant execute on function public.next_speak_up_reference() to service_role;

revoke all on table public.speak_up_handlers from anon, authenticated;
revoke all on table public.speak_up_cases from anon, authenticated;
revoke all on table public.speak_up_case_keys from anon, authenticated;
revoke all on table public.speak_up_messages from anon, authenticated;
revoke all on table public.speak_up_evidence from anon, authenticated;
revoke all on table public.speak_up_audit from anon, authenticated;
revoke all on sequence public.speak_up_case_seq from public, anon, authenticated;

-- 3. The evidence bucket stays private and holds files of 5 MB or less (the app sends 4 MB at most).
insert into storage.buckets (id, name, public, file_size_limit)
values ('speak-up-evidence', 'speak-up-evidence', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;
