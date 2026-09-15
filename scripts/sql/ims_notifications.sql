create table if not exists public.ims_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  source_module text not null,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.ims_notifications enable row level security;

create policy "ims_notifications_select_authenticated"
on public.ims_notifications
for select
to authenticated
using (true);

create policy "ims_notifications_insert_authenticated"
on public.ims_notifications
for insert
to authenticated
with check (true);

create policy "ims_notifications_update_authenticated"
on public.ims_notifications
for update
to authenticated
using (true)
with check (true);

create index if not exists ims_notifications_recipient_idx
on public.ims_notifications (recipient_email, read_at);

create index if not exists ims_notifications_created_at_idx
on public.ims_notifications (created_at desc);
