-- Management of Change becomes its own module (module_key 'moc', area 'register').
--
-- Anyone with Full, Read, Edit or Role Default access to Quality keeps MOC access automatically (the app falls back
-- to their Quality setting). This script is only for people on "Part Access", whose MOC permission was stored as a
-- Quality tab row (module 'quality', area 'moc'). It copies that row across to the new module so nothing changes for them.
--
-- Safe to run more than once. It does not delete the old rows.

insert into public.ims_tab_permissions (person_id, email, module_key, area_key, can_view, can_create, can_edit, full_access)
select person_id, email, 'moc', 'register', can_view, can_create, can_edit, full_access
  from public.ims_tab_permissions
 where module_key = 'quality' and area_key = 'moc'
on conflict (lower(trim(email)), module_key, area_key) do nothing;
