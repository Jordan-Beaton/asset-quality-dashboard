-- Captures the two boxes that only exist in the supplier/client-facing NCR
-- Word export ("Response / Proposed Action" and "Acknowledgement /
-- Responsible Contact", added by generateNcrWord() when the "Supplier /
-- Client facing issue" toggle is on). There was previously nowhere for a
-- returned answer to these two boxes to live.
alter table public.ncrs add column if not exists supplier_response text;
alter table public.ncrs add column if not exists supplier_acknowledgement text;
