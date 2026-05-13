alter table public.documents
add column if not exists document_scope text not null default 'Company/System';

alter table public.documents
add column if not exists asset_id uuid;

alter table public.documents
add column if not exists asset_name text;

alter table public.documents
add column if not exists asset_code text;

alter table public.documents
add column if not exists asset_document_id_code text;

update public.documents
set document_scope = 'Company/System'
where document_scope is null
   or trim(document_scope) = '';

create index if not exists documents_document_scope_idx
on public.documents (document_scope);

create index if not exists documents_asset_id_idx
on public.documents (asset_id);

create index if not exists documents_asset_document_id_code_idx
on public.documents (asset_document_id_code);
