create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  certificate_number text,
  title text not null,
  standard text not null,
  issuing_body text,
  certificate_scope text,
  issue_date date,
  expiry_date date,
  status text default 'Active',
  file_name text,
  file_path text,
  file_size bigint,
  uploaded_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.certifications add column if not exists certificate_number text;
alter table public.certifications add column if not exists title text;
alter table public.certifications add column if not exists standard text;
alter table public.certifications add column if not exists issuing_body text;
alter table public.certifications add column if not exists certificate_scope text;
alter table public.certifications add column if not exists issue_date date;
alter table public.certifications add column if not exists expiry_date date;
alter table public.certifications add column if not exists status text default 'Active';
alter table public.certifications add column if not exists file_name text;
alter table public.certifications add column if not exists file_path text;
alter table public.certifications add column if not exists file_size bigint;
alter table public.certifications add column if not exists uploaded_at timestamptz;
alter table public.certifications add column if not exists notes text;
alter table public.certifications add column if not exists created_at timestamptz default now();
alter table public.certifications add column if not exists updated_at timestamptz default now();

create index if not exists certifications_standard_idx on public.certifications (standard);
create index if not exists certifications_status_idx on public.certifications (status);
create index if not exists certifications_expiry_date_idx on public.certifications (expiry_date);
create index if not exists certifications_created_at_idx on public.certifications (created_at);

alter table public.certifications enable row level security;

drop policy if exists "certifications_select_authenticated" on public.certifications;
drop policy if exists "certifications_insert_authenticated" on public.certifications;
drop policy if exists "certifications_update_authenticated" on public.certifications;
drop policy if exists "certifications_delete_authenticated" on public.certifications;

create policy "certifications_select_authenticated"
on public.certifications for select
to authenticated
using (true);

create policy "certifications_insert_authenticated"
on public.certifications for insert
to authenticated
with check (true);

create policy "certifications_update_authenticated"
on public.certifications for update
to authenticated
using (true)
with check (true);

create policy "certifications_delete_authenticated"
on public.certifications for delete
to authenticated
using (true);
