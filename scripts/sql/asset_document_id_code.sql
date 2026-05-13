alter table public.assets
add column if not exists document_id_code text;

create index if not exists assets_document_id_code_idx
on public.assets (document_id_code);

update public.assets
set document_id_code = '1100'
where lower(coalesce(name, '')) = lower('ENS1100')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'C4'
where lower(coalesce(name, '')) = lower('Carrera 4')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'FRC'
where lower(coalesce(name, '')) = lower('FRC')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'IMF2'
where lower(coalesce(name, '')) = lower('IMF2')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'RG'
where lower(coalesce(name, '')) = lower('Rock Grab')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'SWT1'
where lower(coalesce(name, '')) = lower('SWT1')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'T1'
where lower(coalesce(name, '')) = lower('T1')
  and coalesce(document_id_code, '') = '';

update public.assets
set document_id_code = 'T2'
where lower(coalesce(name, '')) = lower('T2')
  and coalesce(document_id_code, '') = '';
