alter table public.ncrs
add column if not exists closed_at timestamptz;
