-- Bulk review links for Document Control.
-- One emailed link lets a reviewer (then the approver) accept or approve a group of documents in one go.
-- Every document still gets its own workflow activity row, so the audit trail per document is unchanged.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.document_workflow_batches (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  kind text not null check (kind in ('review', 'approval')),
  intended_name text,
  intended_email text not null,
  document_ids uuid[] not null,
  parent_batch_id uuid references public.document_workflow_batches(id),
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  completed_at timestamptz,
  completed_by text,
  completed_count integer
);

create index if not exists document_workflow_batches_token_idx
on public.document_workflow_batches (token);

alter table public.document_workflow_batches enable row level security;

drop policy if exists "document_workflow_batches_service_only" on public.document_workflow_batches;

create policy "document_workflow_batches_service_only"
on public.document_workflow_batches
for all
using (false)
with check (false);
