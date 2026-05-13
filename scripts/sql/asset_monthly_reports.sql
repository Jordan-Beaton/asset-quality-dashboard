create table if not exists public.asset_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month_label text not null,
  summary text,
  wins text,
  risks text,
  next_steps text,
  snapshot_json jsonb,
  created_at timestamptz default now()
);

alter table public.asset_monthly_reports enable row level security;

create policy "asset_monthly_reports_select_authenticated"
on public.asset_monthly_reports
for select
to authenticated
using (true);

create policy "asset_monthly_reports_insert_authenticated"
on public.asset_monthly_reports
for insert
to authenticated
with check (true);

create policy "asset_monthly_reports_update_authenticated"
on public.asset_monthly_reports
for update
to authenticated
using (true)
with check (true);

create policy "asset_monthly_reports_delete_authenticated"
on public.asset_monthly_reports
for delete
to authenticated
using (true);

create index if not exists asset_monthly_reports_created_at_idx
on public.asset_monthly_reports (created_at desc);
