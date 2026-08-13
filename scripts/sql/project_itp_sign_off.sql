create extension if not exists pgcrypto;

create table if not exists public.project_itp_sign_off_requests (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  document_name text not null,
  document_path text not null,
  phase_number text not null,
  phase_title text not null,
  phase_items jsonb not null default '[]'::jsonb,
  recipient_email text not null,
  sender_name text,
  sender_email text,
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  decision_name text,
  decision_email text,
  decision_note text,
  decided_at timestamptz,
  verification_code_hash text,
  verification_expires_at timestamptz,
  verification_sent_at timestamptz,
  verification_email_id text,
  verified_at timestamptz,
  request_email_id text,
  certificate_file_name text,
  certificate_path text,
  certificate_sha256 text,
  confirmation_email_id text,
  sent_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_itp_sign_off_requests
  add column if not exists verification_code_hash text,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_sent_at timestamptz,
  add column if not exists verification_email_id text,
  add column if not exists verified_at timestamptz,
  add column if not exists request_email_id text,
  add column if not exists certificate_file_name text,
  add column if not exists certificate_path text,
  add column if not exists certificate_sha256 text,
  add column if not exists confirmation_email_id text;

create table if not exists public.project_itp_sign_off_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.project_itp_sign_off_requests(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_itp_sign_off_project_idx on public.project_itp_sign_off_requests(project_key, created_at desc);
alter table public.project_itp_sign_off_requests enable row level security;
alter table public.project_itp_sign_off_tokens enable row level security;
drop policy if exists project_itp_sign_off_requests_authenticated on public.project_itp_sign_off_requests;
create policy project_itp_sign_off_requests_authenticated on public.project_itp_sign_off_requests for all to authenticated using (true) with check (true);
drop policy if exists project_itp_sign_off_tokens_authenticated on public.project_itp_sign_off_tokens;
create policy project_itp_sign_off_tokens_authenticated on public.project_itp_sign_off_tokens for select to authenticated using (true);
