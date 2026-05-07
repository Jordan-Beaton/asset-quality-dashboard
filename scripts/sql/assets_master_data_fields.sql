alter table public.assets
add column if not exists manufacturer text,
add column if not exists model text,
add column if not exists serial_number text,
add column if not exists category text,
add column if not exists subcategory text,
add column if not exists condition text,
add column if not exists purchase_date date,
add column if not exists maintenance_due_date date,
add column if not exists inspection_due_date date;
