alter table public.actions
add column if not exists linked_ainm_id uuid,
add column if not exists linked_ainm_number text;

create index if not exists actions_linked_ainm_id_idx on public.actions (linked_ainm_id);
create index if not exists actions_linked_ainm_number_idx on public.actions (linked_ainm_number);
