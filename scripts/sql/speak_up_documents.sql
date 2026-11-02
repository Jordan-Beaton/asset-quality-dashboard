-- Speak Up: documents attached by handlers. Run once in the Supabase SQL editor, after the other speak_up scripts.
-- Safe to run again. (A fresh run of speak_up.sql already includes this.)
--
-- A handler can attach a document to a case (for example a letter or a policy) and the reporter can download it.
-- Every file is locked in the browser before it is stored, as with the reporter's photos. These columns record who added
-- each file, so the case shows which files came from the reporter and which from a handler.

alter table public.speak_up_evidence add column if not exists added_by text not null default 'reporter';
alter table public.speak_up_evidence add column if not exists added_by_handler_id uuid references public.speak_up_handlers(id) on delete set null;
