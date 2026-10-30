-- Speak Up: case assignment. Run once in the Supabase SQL editor, after speak_up.sql and speak_up_hardening.sql.
-- Safe to run again. (A fresh run of speak_up.sql already includes this.)
--
-- A new report is emailed to every handler. One of them assigns the case to themselves or a colleague, and from then on
-- only that person is emailed about the reporter's replies.

alter table public.speak_up_cases add column if not exists assigned_to uuid references public.speak_up_handlers(id) on delete set null;
alter table public.speak_up_cases add column if not exists assigned_at timestamptz;
