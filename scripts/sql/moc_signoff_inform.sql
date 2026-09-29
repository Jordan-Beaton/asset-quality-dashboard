-- Allow the "Informed" terminal status for Review & Endorsement rows sent
-- as an FYI (Inform ticked, not Approve) rather than a decision request
-- (Approve ticked). Informed rows resolve immediately at send time - there
-- is nothing for the recipient to decide, so no token/decision-link flow
-- runs for them.
alter table public.moc_signoff_requests drop constraint if exists moc_signoff_requests_status_check;
alter table public.moc_signoff_requests add constraint moc_signoff_requests_status_check
  check (status in ('Pending', 'Approved', 'Rejected', 'Needs Attention', 'Informed'));
