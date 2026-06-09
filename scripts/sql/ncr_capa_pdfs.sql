create table if not exists public.ncr_capa_pdfs (
  id uuid primary key default gen_random_uuid(),
  ncr_id uuid not null references public.ncrs(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  generated_at timestamptz not null default now(),
  generated_by text,
  include_linked_capa boolean not null default false,
  include_evidence_list boolean not null default false,
  external_facing boolean not null default false
);

alter table public.ncr_capa_pdfs enable row level security;

drop policy if exists "ncr_capa_pdfs_select_all" on public.ncr_capa_pdfs;
drop policy if exists "ncr_capa_pdfs_insert_all" on public.ncr_capa_pdfs;
drop policy if exists "ncr_capa_pdfs_update_all" on public.ncr_capa_pdfs;
drop policy if exists "ncr_capa_pdfs_delete_all" on public.ncr_capa_pdfs;

create policy "ncr_capa_pdfs_select_all"
on public.ncr_capa_pdfs
for select
to authenticated
using (true);

create policy "ncr_capa_pdfs_insert_all"
on public.ncr_capa_pdfs
for insert
to authenticated
with check (true);

create policy "ncr_capa_pdfs_update_all"
on public.ncr_capa_pdfs
for update
to authenticated
using (true)
with check (true);

create policy "ncr_capa_pdfs_delete_all"
on public.ncr_capa_pdfs
for delete
to authenticated
using (true);
