create table if not exists public.hse_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month_label text not null,
  summary text,
  wins text,
  risks text,
  next_steps text,
  snapshot_json jsonb,
  created_at timestamptz default now()
);

alter table public.hse_monthly_reports enable row level security;

drop policy if exists "hse_monthly_reports_select_authenticated" on public.hse_monthly_reports;
create policy "hse_monthly_reports_select_authenticated"
on public.hse_monthly_reports
for select
to authenticated
using (true);

drop policy if exists "hse_monthly_reports_insert_authenticated" on public.hse_monthly_reports;
create policy "hse_monthly_reports_insert_authenticated"
on public.hse_monthly_reports
for insert
to authenticated
with check (true);

drop policy if exists "hse_monthly_reports_update_authenticated" on public.hse_monthly_reports;
create policy "hse_monthly_reports_update_authenticated"
on public.hse_monthly_reports
for update
to authenticated
using (true)
with check (true);

drop policy if exists "hse_monthly_reports_delete_authenticated" on public.hse_monthly_reports;
create policy "hse_monthly_reports_delete_authenticated"
on public.hse_monthly_reports
for delete
to authenticated
using (true);

create index if not exists hse_monthly_reports_created_at_idx
on public.hse_monthly_reports (created_at desc);
