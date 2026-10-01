create extension if not exists pgcrypto;

-- Email-based sign-off for AINM Investigation Review & Sign-Off, replacing a
-- typed name with a decision made by the named person themselves on a public
-- page (no IMS login), mirroring moc_signoff.sql.
--
-- AINM's 4 sign-off roles are fixed columns on hse_ainm_records (signoff_<role>_name/
-- _position/_date), not repeating rows like MOC, so a request is addressed by
-- (ainm_id, role) rather than (report_id, target_table, sort_order).
create table if not exists public.ainm_signoff_requests (
  id uuid primary key default gen_random_uuid(),
  ainm_id uuid not null references public.hse_ainm_records(id) on delete cascade,
  role text not null check (role in ('location', 'hseq', 'project_manager', 'smt')),
  row_label text,
  recipient_name text not null,
  recipient_email text not null,
  sender_name text,
  sender_email text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Needs Attention')),
  decision_name text,
  decision_position text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ainm_signoff_requests_record_idx
  on public.ainm_signoff_requests (ainm_id, role);

alter table public.ainm_signoff_requests enable row level security;
drop policy if exists ainm_signoff_requests_authenticated on public.ainm_signoff_requests;
create policy ainm_signoff_requests_authenticated on public.ainm_signoff_requests
  for all to authenticated using (true) with check (true);

-- Single-use link tokens for the emailed "review and decide" button.
create table if not exists public.ainm_signoff_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  request_id uuid not null references public.ainm_signoff_requests(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ainm_signoff_tokens enable row level security;
drop policy if exists ainm_signoff_tokens_authenticated on public.ainm_signoff_tokens;
create policy ainm_signoff_tokens_authenticated on public.ainm_signoff_tokens
  for all to authenticated using (true) with check (true);
