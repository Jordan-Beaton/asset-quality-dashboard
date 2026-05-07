alter table public.asset_calibration_records
alter column asset_id drop not null;

alter table public.asset_calibration_records
add column if not exists calibration_date date,
add column if not exists calibration_due_date date,
add column if not exists calibration_type text,
add column if not exists calibrated_by text,
add column if not exists certificate_number text,
add column if not exists serial_number text,
add column if not exists frequency_years integer,
add column if not exists certificate_file_size bigint,
add column if not exists created_at timestamptz default now();
