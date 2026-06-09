alter table public.actions
add column if not exists linked_observation_id uuid,
add column if not exists linked_observation_number text;

create index if not exists actions_linked_observation_id_idx
on public.actions (linked_observation_id);

create index if not exists actions_linked_observation_number_idx
on public.actions (linked_observation_number);
