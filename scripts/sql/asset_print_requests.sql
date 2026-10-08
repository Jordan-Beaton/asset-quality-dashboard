create extension if not exists pgcrypto;

-- Asset Management > 3D Print Requests.
-- One request (a requester + project) can hold several printable objects, like an
-- expense claim with several receipts. Each object has its own job number and
-- moves through the queue independently (Queued -> Printing -> Completed).
create table if not exists public.print_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  requester_name text not null,
  requester_email text,
  project text,
  justification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.print_request_objects (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.print_requests(id) on delete cascade,
  job_number text not null unique,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  needed_by date,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Queued' check (status in ('Queued', 'Printing', 'Completed')),
  operator_name text,
  actual_hours numeric(8, 2),
  material_cost numeric(10, 2),
  buy_cost_estimate numeric(10, 2),
  operator_notes text,
  reference_file_path text,
  reference_file_name text,
  reference_content_type text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists print_request_objects_request_idx
  on public.print_request_objects (request_id);

create index if not exists print_request_objects_status_idx
  on public.print_request_objects (status);

alter table public.print_requests enable row level security;
drop policy if exists print_requests_authenticated on public.print_requests;
create policy print_requests_authenticated on public.print_requests
  for all to authenticated using (true) with check (true);

alter table public.print_request_objects enable row level security;
drop policy if exists print_request_objects_authenticated on public.print_request_objects;
create policy print_request_objects_authenticated on public.print_request_objects
  for all to authenticated using (true) with check (true);
