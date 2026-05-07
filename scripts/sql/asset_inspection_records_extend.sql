alter table public.asset_inspection_records
add column if not exists inspection_date date,
add column if not exists inspector text,
add column if not exists inspection_number text,
add column if not exists result text,
add column if not exists findings text,
add column if not exists action_required boolean default false,
add column if not exists actions_required text,
add column if not exists next_inspection_due date,
add column if not exists created_at timestamptz default now();
