-- Alon's knowledge base: versioned documents with atomic swap (spec §6.1–6.3).
-- Only service_role (n8n) touches these objects. anon/authenticated get nothing.

-- ---------- tables ----------
create table public.kb_versions (
  id               uuid primary key default gen_random_uuid(),
  doc_key          text not null check (doc_key in ('pricelist', 'order-terms')),
  version_no       int  not null,
  file_name        text not null,
  status           text not null default 'processing'
                   check (status in ('processing', 'verifying', 'active', 'superseded', 'failed')),
  stage            text not null default 'received'
                   check (stage in ('received', 'chunking', 'embedding', 'saving', 'verifying', 'swapping', 'done')),
  failed_stage     text check (failed_stage in ('received', 'chunking', 'embedding', 'saving', 'verifying', 'swapping')),
  error            text,
  chunk_count      int,
  created_at       timestamptz not null default now(),
  stage_updated_at timestamptz not null default now(),
  activated_at     timestamptz,
  unique (doc_key, version_no)
);

-- at most one active version per document, enforced by the database
create unique index kb_versions_one_active on public.kb_versions (doc_key) where status = 'active';
-- at most one upload in flight per document
create unique index kb_versions_one_inflight on public.kb_versions (doc_key) where status in ('processing', 'verifying');

create table public.kb_chunks (
  id         bigint generated always as identity primary key,
  -- filled by trigger from metadata.version_id (the n8n vector store node writes only content/metadata/embedding)
  version_id uuid not null references public.kb_versions (id) on delete cascade,
  content    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  embedding  vector(1536) not null
);

create index kb_chunks_version_id_idx on public.kb_chunks (version_id);
create index kb_chunks_embedding_idx on public.kb_chunks using hnsw (embedding vector_cosine_ops);

alter table public.kb_versions enable row level security;
alter table public.kb_chunks enable row level security;
revoke all on public.kb_versions, public.kb_chunks from anon, authenticated;

-- ---------- trigger ----------
create function public.kb_chunks_set_version() returns trigger
language plpgsql security invoker set search_path = public, extensions as $$
begin
  new.version_id := (new.metadata ->> 'version_id')::uuid;
  return new;
end $$;

create trigger kb_chunks_set_version
  before insert on public.kb_chunks
  for each row execute function public.kb_chunks_set_version();

-- ---------- state transitions ----------
create function public.fail_version(p_version_id uuid, p_stage text, p_error text) returns void
language plpgsql security invoker set search_path = public, extensions as $$
begin
  -- only an in-flight version can fail; active/superseded/failed are left alone
  delete from kb_chunks c
   using kb_versions v
   where c.version_id = v.id and v.id = p_version_id and v.status in ('processing', 'verifying');
  update kb_versions
     set status = 'failed', failed_stage = p_stage, error = p_error, stage_updated_at = now()
   where id = p_version_id and status in ('processing', 'verifying');
end $$;

create function public.create_version(p_doc_key text, p_file_name text) returns public.kb_versions
language plpgsql security invoker set search_path = public, extensions as $$
declare
  stale record;
  r kb_versions;
begin
  -- an abandoned upload (no stage report for 10 minutes) must not block a new one
  for stale in
    select id, stage from kb_versions
     where doc_key = p_doc_key and status in ('processing', 'verifying')
       and stage_updated_at < now() - interval '10 minutes'
  loop
    perform fail_version(stale.id, stale.stage, 'timeout');
  end loop;

  insert into kb_versions (doc_key, version_no, file_name)
  values (p_doc_key,
          coalesce((select max(version_no) from kb_versions where doc_key = p_doc_key), 0) + 1,
          p_file_name)
  returning * into r;  -- a second upload in flight raises unique_violation (23505)
  return r;
end $$;

create function public.report_stage(p_version_id uuid, p_stage text) returns void
language plpgsql security invoker set search_path = public, extensions as $$
begin
  update kb_versions
     set stage = p_stage,
         stage_updated_at = now(),
         status = case when p_stage = 'verifying' then 'verifying' else status end
   where id = p_version_id and status in ('processing', 'verifying');
  if not found then
    raise exception 'version % is not in flight', p_version_id;
  end if;
end $$;

create function public.verify_version(p_version_id uuid, p_expected int) returns int
language plpgsql security invoker set search_path = public, extensions as $$
declare
  n int;
  bad int;
begin
  if not exists (select 1 from kb_versions where id = p_version_id and status = 'verifying') then
    raise exception 'version % is not in verifying', p_version_id;
  end if;
  select count(*), count(*) filter (where vector_dims(embedding) <> 1536)
    into n, bad
    from kb_chunks where version_id = p_version_id;
  if n = 0 or n <> p_expected or bad > 0 then
    raise exception 'verification failed: % chunks saved, % expected, % with wrong dimensions', n, p_expected, bad;
  end if;
  update kb_versions set chunk_count = n where id = p_version_id;
  return n;
end $$;

create function public.activate_version(p_version_id uuid) returns public.kb_versions
language plpgsql security invoker set search_path = public, extensions as $$
declare
  r kb_versions;
  old_id uuid;
begin
  select * into r from kb_versions where id = p_version_id;
  if not found then
    raise exception 'version % not found', p_version_id;
  end if;
  -- serialize swaps of the same document
  perform 1 from kb_versions where doc_key = r.doc_key for update;
  select * into r from kb_versions where id = p_version_id;
  if r.status <> 'verifying' then
    raise exception 'version % is %, expected verifying', p_version_id, r.status;
  end if;

  select id into old_id from kb_versions where doc_key = r.doc_key and status = 'active';
  if old_id is not null then
    delete from kb_chunks where version_id = old_id;  -- the bot forgets the old version now
    update kb_versions set status = 'superseded' where id = old_id;
  end if;

  update kb_versions
     set status = 'active', stage = 'done', stage_updated_at = now(), activated_at = now()
   where id = p_version_id
  returning * into r;
  return r;
end $$;

-- ---------- reads ----------
create function public.version_status(p_version_id uuid) returns jsonb
language sql stable security invoker set search_path = public, extensions as $$
  select jsonb_build_object(
           'upload_id',    s.id,
           'doc_key',      s.doc_key,
           'version_no',   s.version_no,
           'status',       case when s.stale then 'failed' else s.status end,
           'stage',        s.stage,
           'failed_stage', case when s.stale then s.stage else s.failed_stage end,
           'error',        case when s.stale then 'timeout' else s.error end,
           'chunk_count',  s.chunk_count)
    from (select v.*,
                 v.status in ('processing', 'verifying')
                 and v.stage_updated_at < now() - interval '10 minutes' as stale
            from kb_versions v
           where v.id = p_version_id) s
$$;

create function public.active_documents() returns setof jsonb
language sql stable security invoker set search_path = public, extensions as $$
  select jsonb_build_object(
           'doc_key',      doc_key,
           'doc_title',    case doc_key when 'pricelist' then 'מחירון' else 'תנאי הזמנה' end,
           'version_no',   version_no,
           'file_name',    file_name,
           'chunk_count',  chunk_count,
           'activated_at', activated_at)
    from kb_versions
   where status = 'active'
   order by doc_key
$$;

-- same signature as match_documents, so n8n's Supabase Vector Store node can use it (Query Name)
create function public.match_kb_chunks(query_embedding vector(1536), match_count int default 5,
                                       filter jsonb default '{}'::jsonb)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, c.content, c.metadata, 1 - (c.embedding <=> query_embedding) as similarity
    from kb_chunks c
    join kb_versions v on v.id = c.version_id and v.status = 'active'
   where c.metadata @> filter
   order by c.embedding <=> query_embedding
   limit match_count
$$;

-- ---------- privileges ----------
revoke all on function
  public.kb_chunks_set_version(), public.fail_version(uuid, text, text),
  public.create_version(text, text), public.report_stage(uuid, text),
  public.verify_version(uuid, int), public.activate_version(uuid),
  public.version_status(uuid), public.active_documents(),
  public.match_kb_chunks(vector, int, jsonb)
from public, anon, authenticated;

grant execute on function
  public.fail_version(uuid, text, text), public.create_version(text, text),
  public.report_stage(uuid, text), public.verify_version(uuid, int),
  public.activate_version(uuid), public.version_status(uuid),
  public.active_documents(), public.match_kb_chunks(vector, int, jsonb)
to service_role;
