-- Speak Up: anonymous reporting channel.
-- Run once in the Supabase SQL editor.
--
-- Report contents are encrypted in the reporter's browser before they are sent, so these tables only
-- ever hold ciphertext for anything sensitive (the report, messages, contact details, file names and
-- files). Nothing here can identify a reporter. All access goes through the server (service role),
-- which checks the handler list and sign-in assurance level; there are deliberately no policies that
-- let a browser read these tables directly.

create sequence if not exists public.speak_up_case_seq;

create or replace function public.next_speak_up_reference()
returns text
language sql
as $$
  select 'WB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.speak_up_case_seq')::text, 3, '0');
$$;

-- The people who can open cases. Matched to an IMS login by email the first time they sign in.
create table if not exists public.speak_up_handlers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  user_id uuid,
  -- 'handler' receives ordinary reports; 'independent' receives reports that involve HR, management or IT
  roles text[] not null default array['handler'],
  public_key jsonb,
  encrypted_private_key jsonb,
  active boolean not null default true,
  keys_created_at timestamptz,
  -- roles another handler has approved. Reports are only wrapped for handlers approved for the right role.
  approved_roles text[] not null default '{}',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.speak_up_cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_speak_up_reference(),
  category text not null,
  involves_senior boolean not null default false,
  reporter_mode text not null check (reporter_mode in ('anonymous', 'confidential', 'named')),
  reporter_group text,
  status text not null default 'Received' check (status in ('Received', 'Acknowledged', 'Investigating', 'Awaiting reporter', 'Outcome shared', 'Closed')),
  received_at timestamptz not null default now(),
  acknowledge_by timestamptz not null,
  feedback_by timestamptz not null,
  acknowledged_at timestamptz,
  outcome_shared_at timestamptz,
  closed_at timestamptz,
  outcome text check (outcome in ('no_action', 'action_taken')),
  retention_until date,
  -- encrypted with the case key
  body_cipher text not null,
  body_iv text not null,
  contact_cipher text,
  contact_iv text,
  -- how the reporter gets back in: a salt for their access code, the case key wrapped under that code,
  -- and a hash of an authenticator derived from the code (the code itself is never stored)
  reporter_salt text not null,
  reporter_iterations integer not null,
  reporter_wrapped_key text not null,
  reporter_wrap_iv text not null,
  verifier_hash text not null,
  -- the handler responsible for the case; unassigned cases are visible to every handler who holds the case
  assigned_to uuid references public.speak_up_handlers(id) on delete set null,
  assigned_at timestamptz
);

create index if not exists speak_up_cases_status_idx on public.speak_up_cases (status, received_at);

-- The case key, wrapped for each handler who may open the case. Removing a row removes that person's access.
create table if not exists public.speak_up_case_keys (
  case_id uuid not null references public.speak_up_cases(id) on delete cascade,
  handler_id uuid not null references public.speak_up_handlers(id) on delete cascade,
  wrapped_key text not null,
  created_at timestamptz not null default now(),
  primary key (case_id, handler_id)
);

create table if not exists public.speak_up_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.speak_up_cases(id) on delete cascade,
  author_role text not null check (author_role in ('reporter', 'handler')),
  author_handler_id uuid references public.speak_up_handlers(id) on delete set null,
  cipher text not null,
  iv text not null,
  created_at timestamptz not null default now()
);

create index if not exists speak_up_messages_case_idx on public.speak_up_messages (case_id, created_at);

create table if not exists public.speak_up_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.speak_up_cases(id) on delete cascade,
  storage_path text not null,
  size_bytes bigint not null,
  file_iv text not null,
  name_cipher text not null,
  name_iv text not null,
  created_at timestamptz not null default now()
);

-- Who did what to a case, by handler. Records no reporter information.
create table if not exists public.speak_up_audit (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.speak_up_cases(id) on delete set null,
  reference text not null,
  actor_handler_id uuid references public.speak_up_handlers(id) on delete set null,
  actor_name text,
  event_type text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists speak_up_audit_case_idx on public.speak_up_audit (case_id, created_at);

-- Encrypted evidence files live in a private bucket (5 MB per file; the app sends 4 MB at most).
insert into storage.buckets (id, name, public, file_size_limit)
values ('speak-up-evidence', 'speak-up-evidence', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

alter table public.speak_up_handlers enable row level security;
alter table public.speak_up_cases enable row level security;
alter table public.speak_up_case_keys enable row level security;
alter table public.speak_up_messages enable row level security;
alter table public.speak_up_evidence enable row level security;
alter table public.speak_up_audit enable row level security;
-- No policies on purpose: with row level security on and no policies, signed-in and anonymous browsers
-- cannot read or write any of these tables. The server (service role) is the only way in.

-- Handlers. Nobody is approved here: the first person in each group to set up a key is approved
-- automatically, and every later person needs approval from a handler already in that group.
-- (For testing, add yourself in the Admin > Speak Up tab, not here, so a re-run never brings you back.)
insert into public.speak_up_handlers (email, name, roles) values
  ('aturvey@enshoresubsea.com', 'Annie Turvey', array['handler']),
  ('mredpath@enshoresubsea.com', 'Melissa Redpath', array['handler']),
  ('akilgallon@enshoresubsea.com', 'Amy Kilgallon', array['handler']),
  ('fliu@enshoresubsea.com', 'Fiona Liu', array['handler']),
  ('lharvey@enshoresubsea.com', 'Louise Harvey', array['independent'])
on conflict (email) do nothing;

-- The reference-number function and tables are for the server only.
revoke execute on function public.next_speak_up_reference() from public, anon, authenticated;
grant execute on function public.next_speak_up_reference() to service_role;
revoke all on table public.speak_up_handlers from anon, authenticated;
revoke all on table public.speak_up_cases from anon, authenticated;
revoke all on table public.speak_up_case_keys from anon, authenticated;
revoke all on table public.speak_up_messages from anon, authenticated;
revoke all on table public.speak_up_evidence from anon, authenticated;
revoke all on table public.speak_up_audit from anon, authenticated;
revoke all on sequence public.speak_up_case_seq from public, anon, authenticated;
