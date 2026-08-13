-- Lessons Learned Prevention Intelligence
-- Apply once in the Supabase SQL editor before building the semantic index.

create extension if not exists vector with schema extensions;

create table if not exists public.lessons_learned_ai_index (
  lesson_id uuid primary key references public.lessons_learned(id) on delete cascade,
  content_hash text not null,
  embedding extensions.vector(1536) not null,
  embedded_at timestamptz not null default now()
);

create index if not exists lessons_learned_ai_index_embedding_hnsw
  on public.lessons_learned_ai_index
  using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists public.lessons_learned_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  analysis_type text not null check (analysis_type in ('question', 'procedure_review')),
  question text not null,
  document_name text,
  result jsonb not null default '{}'::jsonb,
  supporting_lesson_ids uuid[] not null default '{}',
  retrieval_mode text not null check (retrieval_mode in ('semantic', 'keyword')),
  model text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lessons_learned_ai_analyses_created_at_idx
  on public.lessons_learned_ai_analyses(created_at desc);

alter table public.lessons_learned_ai_index enable row level security;
alter table public.lessons_learned_ai_analyses enable row level security;

drop policy if exists lessons_ai_index_select_authenticated on public.lessons_learned_ai_index;
create policy lessons_ai_index_select_authenticated on public.lessons_learned_ai_index
  for select to authenticated using (true);
drop policy if exists lessons_ai_index_insert_authenticated on public.lessons_learned_ai_index;
create policy lessons_ai_index_insert_authenticated on public.lessons_learned_ai_index
  for insert to authenticated with check (true);
drop policy if exists lessons_ai_index_update_authenticated on public.lessons_learned_ai_index;
create policy lessons_ai_index_update_authenticated on public.lessons_learned_ai_index
  for update to authenticated using (true) with check (true);

drop policy if exists lessons_ai_analyses_select_authenticated on public.lessons_learned_ai_analyses;
create policy lessons_ai_analyses_select_authenticated on public.lessons_learned_ai_analyses
  for select to authenticated using (true);
drop policy if exists lessons_ai_analyses_insert_authenticated on public.lessons_learned_ai_analyses;
create policy lessons_ai_analyses_insert_authenticated on public.lessons_learned_ai_analyses
  for insert to authenticated with check (created_by = auth.uid());

create or replace function public.match_lessons_learned_prevention(
  query_embedding extensions.vector(1536),
  match_count integer default 70,
  minimum_similarity double precision default 0.3
)
returns table (lesson_id uuid, similarity double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select idx.lesson_id, 1 - (idx.embedding <=> query_embedding) as similarity
  from public.lessons_learned_ai_index idx
  join public.lessons_learned lesson on lesson.id = idx.lesson_id
  where lesson.outcome_type = 'Failure'
    and 1 - (idx.embedding <=> query_embedding) >= minimum_similarity
  order by idx.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 100);
$$;

grant execute on function public.match_lessons_learned_prevention(extensions.vector, integer, double precision) to authenticated;
