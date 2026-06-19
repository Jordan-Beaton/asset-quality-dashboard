-- Phase 2 Admin / Settings permissions.
-- Safe additive table for per-person, per-module tab permissions.

create table if not exists public.ims_tab_permissions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid,
  email text not null,
  module_key text not null,
  area_key text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  full_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ims_tab_permissions_unique_idx
  on public.ims_tab_permissions (lower(trim(email)), module_key, area_key);

create index if not exists ims_tab_permissions_person_idx
  on public.ims_tab_permissions (person_id);

create index if not exists ims_tab_permissions_email_idx
  on public.ims_tab_permissions (lower(trim(email)));

alter table public.ims_tab_permissions enable row level security;

drop policy if exists ims_tab_permissions_authenticated_select on public.ims_tab_permissions;
create policy ims_tab_permissions_authenticated_select
  on public.ims_tab_permissions
  for select
  to authenticated
  using (lower(trim(email)) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists ims_tab_permissions_authenticated_insert on public.ims_tab_permissions;
drop policy if exists ims_tab_permissions_authenticated_update on public.ims_tab_permissions;
drop policy if exists ims_tab_permissions_authenticated_delete on public.ims_tab_permissions;
