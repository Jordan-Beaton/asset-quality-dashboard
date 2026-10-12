create extension if not exists pgcrypto;

-- Long-lived (30 day) invite and password-setup links for the IMS.
-- Supabase Auth links expire far too quickly for invites, so the emailed link
-- points at /invite?token=... instead. The person clicks a button on that page
-- and the server mints a fresh Supabase link on the spot.
--
-- No policies are created on purpose: only the server (service role) reads or
-- writes this table. Anonymous and signed-in browser clients are denied.
create table if not exists public.ims_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  name text,
  system_role text,
  department text,
  person_id uuid,
  created_by text,
  expires_at timestamptz not null,
  first_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ims_invite_tokens_email_idx
  on public.ims_invite_tokens (lower(email));

alter table public.ims_invite_tokens enable row level security;
