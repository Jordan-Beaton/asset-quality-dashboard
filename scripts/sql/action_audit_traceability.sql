alter table public.actions
add column if not exists source text,
add column if not exists linked_audit_id uuid,
add column if not exists linked_audit_number text,
add column if not exists linked_finding_id uuid,
add column if not exists linked_finding_reference text,
add column if not exists linked_ncr_id uuid,
add column if not exists linked_ncr_number text,
add column if not exists linked_capa_id uuid,
add column if not exists linked_capa_number text,
add column if not exists linked_moc_id uuid,
add column if not exists linked_moc_number text;
