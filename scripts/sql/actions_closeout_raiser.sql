-- Actions: close-out comments and raiser tracking
-- Run once in the Supabase SQL editor

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS close_out_comments TEXT,
  ADD COLUMN IF NOT EXISTS raised_by_email TEXT;
