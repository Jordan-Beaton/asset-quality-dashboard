-- Stable per-row identity for MOC Action Plan items, since MOC's save
-- flow deletes and re-inserts every moc_action_plan_items row on every
-- save (see replaceChildRows in app/moc/page.tsx), so the DB `id`
-- regenerates every save and can't be used to link back to a central
-- Action across time. link_key is generated client-side once, and is
-- preserved across saves.
alter table public.moc_action_plan_items add column if not exists link_key uuid;
create unique index if not exists moc_action_plan_items_link_key_idx
  on public.moc_action_plan_items (link_key) where link_key is not null;

-- Which specific MOC action-plan row a central Action is linked to.
-- linked_moc_id alone only identifies the MOC report, not which of its
-- (potentially many) action-plan rows this Action mirrors.
alter table public.actions add column if not exists linked_moc_action_key uuid;
create index if not exists actions_linked_moc_action_key_idx
  on public.actions (linked_moc_id, linked_moc_action_key);

-- Attachments on individual MOC Action Plan rows, keyed by the row's
-- stable link_key rather than its (unstable) id, mirroring the existing
-- moc_attachments table's shape.
create table if not exists public.moc_action_attachments (
  id uuid primary key default gen_random_uuid(),
  action_item_link_key uuid not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  uploaded_at timestamptz not null default now()
);

create index if not exists moc_action_attachments_link_key_idx
  on public.moc_action_attachments (action_item_link_key);

alter table public.moc_action_attachments enable row level security;
drop policy if exists moc_action_attachments_authenticated on public.moc_action_attachments;
create policy moc_action_attachments_authenticated on public.moc_action_attachments
  for all to authenticated using (true) with check (true);
