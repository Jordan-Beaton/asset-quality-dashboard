-- Inspection Records can now cover several NOIs from one project.
-- The record's NOIs are stored in the existing inspection_records.noi_number text column ("004, 005, 006"),
-- so nothing needs converting. This one column lets a file be tagged to particular NOIs
-- (empty means the file applies to every NOI on the record). Safe to re-run.
alter table public.inspection_record_files
  add column if not exists noi_numbers text;
