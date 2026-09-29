create extension if not exists pgcrypto;

-- Email-based sign-off for MOC Review & Endorsement, Acceptance, and Close-Out
-- rows, replacing typed/uploaded signatures. A request is sent to a named
-- person's email; they decide on a public page (no IMS login) with
-- Approve / Reject / Comments. The decision is the durable record here.
--
-- Addressed by (moc_report_id, target_table, sort_order) rather than a child
-- row id, because MocPage's persistChildTables() deletes and re-inserts every
-- review/acceptance/closeout row on every save, so a row's id is not stable
-- across saves. sort_order is the stable identity of "which row this is".
create table if not exists public.moc_signoff_requests (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  target_table text not null check (target_table in ('moc_review_endorsement_rows', 'moc_acceptance_rows', 'moc_closeout_rows')),
  sort_order int not null,
  row_label text,
  recipient_name text not null,
  recipient_email text not null,
  sender_name text,
  sender_email text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Needs Attention')),
  decision_name text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moc_signoff_requests_report_idx
  on public.moc_signoff_requests (moc_report_id, target_table, sort_order);

alter table public.moc_signoff_requests enable row level security;
drop policy if exists moc_signoff_requests_authenticated on public.moc_signoff_requests;
create policy moc_signoff_requests_authenticated on public.moc_signoff_requests
  for all to authenticated using (true) with check (true);

-- Single-use link tokens for the emailed "review and decide" button.
create table if not exists public.moc_signoff_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  request_id uuid not null references public.moc_signoff_requests(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.moc_signoff_tokens enable row level security;
drop policy if exists moc_signoff_tokens_authenticated on public.moc_signoff_tokens;
create policy moc_signoff_tokens_authenticated on public.moc_signoff_tokens
  for all to authenticated using (true) with check (true);

-- Acceptance/Close-Out rows never had a comments column (only Review &
-- Endorsement did) — needed now so a "Comments" outcome has somewhere to go.
alter table public.moc_acceptance_rows add column if not exists comments text;
alter table public.moc_closeout_rows add column if not exists comments text;
