-- Knowledge-base versioning tests (spec §6.1–6.3, plan Task 2).
-- Run the whole file with execute_sql. The block always ends in an exception,
-- so every fixture is rolled back:
--   success → ERROR: KB_TESTS_PASSED: <n>
--   failure → ERROR: KB_TEST_FAILED: <test>: <detail>
do $$
declare
  emb vector(1536) := array_fill(0.01::real, array[1536])::vector;
  v1 public.kb_versions;
  v2 public.kb_versions;
  v3 public.kb_versions;
  vp public.kb_versions;
  vs public.kb_versions;
  n int;
  passed int := 0;
  st jsonb;
  failed boolean;
begin
  -- clean slate for the fixtures (rolled back at the end)
  delete from public.kb_versions;

  -- t_first_activation
  v1 := public.create_version('pricelist', 'pricelist.md');
  perform public.report_stage(v1.id, 'chunking');
  insert into public.kb_chunks (content, metadata, embedding) values
    ('a', jsonb_build_object('version_id', v1.id), emb),
    ('b', jsonb_build_object('version_id', v1.id), emb);
  perform public.report_stage(v1.id, 'verifying');
  if public.verify_version(v1.id, 2) <> 2 then
    raise exception 'KB_TEST_FAILED: t_first_activation: verify_version did not return 2';
  end if;
  perform public.activate_version(v1.id);
  select count(*) into n from public.kb_versions where doc_key = 'pricelist' and status = 'active';
  if n <> 1 then raise exception 'KB_TEST_FAILED: t_first_activation: % active rows', n; end if;
  select count(*) into n from public.kb_chunks where version_id = v1.id;
  if n <> 2 then raise exception 'KB_TEST_FAILED: t_first_activation: version_id not filled from metadata (% rows)', n; end if;
  passed := passed + 1;

  -- t_swap_deletes_old
  v2 := public.create_version('pricelist', 'pricelist-v2.md');
  if v2.version_no <> 2 then raise exception 'KB_TEST_FAILED: t_swap_deletes_old: version_no=%', v2.version_no; end if;
  insert into public.kb_chunks (content, metadata, embedding) values
    ('c', jsonb_build_object('version_id', v2.id), emb),
    ('d', jsonb_build_object('version_id', v2.id), emb),
    ('e', jsonb_build_object('version_id', v2.id), emb);
  perform public.report_stage(v2.id, 'verifying');
  perform public.verify_version(v2.id, 3);
  perform public.activate_version(v2.id);
  if (select status from public.kb_versions where id = v1.id) <> 'superseded' then
    raise exception 'KB_TEST_FAILED: t_swap_deletes_old: v1 not superseded';
  end if;
  if exists (select 1 from public.kb_chunks where version_id = v1.id) then
    raise exception 'KB_TEST_FAILED: t_swap_deletes_old: v1 chunks remain';
  end if;
  select count(*) into n from public.match_kb_chunks(emb, 50, '{}'::jsonb) m
    where (m.metadata->>'version_id')::uuid <> v2.id;
  if n <> 0 then raise exception 'KB_TEST_FAILED: t_swap_deletes_old: match returned % non-v2 rows', n; end if;
  select count(*) into n from public.match_kb_chunks(emb, 50, '{}'::jsonb);
  if n <> 3 then raise exception 'KB_TEST_FAILED: t_swap_deletes_old: match returned % rows, expected 3', n; end if;
  passed := passed + 1;

  -- t_fail_cleans_partial
  v3 := public.create_version('pricelist', 'broken.md');
  insert into public.kb_chunks (content, metadata, embedding) values
    ('f', jsonb_build_object('version_id', v3.id), emb),
    ('g', jsonb_build_object('version_id', v3.id), emb);
  perform public.fail_version(v3.id, 'saving', 'x');
  if exists (select 1 from public.kb_chunks where version_id = v3.id) then
    raise exception 'KB_TEST_FAILED: t_fail_cleans_partial: partial chunks remain';
  end if;
  select * into vs from public.kb_versions where id = v3.id;
  if vs.status <> 'failed' or vs.failed_stage <> 'saving' or vs.error <> 'x' then
    raise exception 'KB_TEST_FAILED: t_fail_cleans_partial: row is % / % / %', vs.status, vs.failed_stage, vs.error;
  end if;
  if (select status from public.kb_versions where id = v2.id) <> 'active' then
    raise exception 'KB_TEST_FAILED: t_fail_cleans_partial: active version was touched';
  end if;
  -- fail_version on an active version is a no-op
  perform public.fail_version(v2.id, 'saving', 'should be ignored');
  if (select status from public.kb_versions where id = v2.id) <> 'active' then
    raise exception 'KB_TEST_FAILED: t_fail_cleans_partial: fail_version changed an active version';
  end if;
  passed := passed + 1;

  -- t_inflight_invisible
  vp := public.create_version('order-terms', 'order-terms.md');
  insert into public.kb_chunks (content, metadata, embedding) values
    ('h', jsonb_build_object('version_id', vp.id), emb);
  select count(*) into n from public.match_kb_chunks(emb, 50, '{}'::jsonb) m
    where (m.metadata->>'version_id')::uuid = vp.id;
  if n <> 0 then raise exception 'KB_TEST_FAILED: t_inflight_invisible: processing chunks visible'; end if;
  perform public.report_stage(vp.id, 'verifying');
  select count(*) into n from public.match_kb_chunks(emb, 50, '{}'::jsonb) m
    where (m.metadata->>'version_id')::uuid = vp.id;
  if n <> 0 then raise exception 'KB_TEST_FAILED: t_inflight_invisible: verifying chunks visible'; end if;
  passed := passed + 1;

  -- t_verify_mismatch
  failed := false;
  begin
    perform public.verify_version(vp.id, 5);
  exception when others then
    failed := true;
  end;
  if not failed then raise exception 'KB_TEST_FAILED: t_verify_mismatch: count mismatch accepted'; end if;
  passed := passed + 1;

  -- t_parallel_upload_blocked (vp is still in flight for order-terms)
  failed := false;
  begin
    perform public.create_version('order-terms', 'second-tab.md');
  exception when unique_violation then
    failed := true;
  end;
  if not failed then raise exception 'KB_TEST_FAILED: t_parallel_upload_blocked: second upload accepted'; end if;
  passed := passed + 1;

  -- t_stale_version_cleaned (make vp look abandoned)
  update public.kb_versions set stage_updated_at = now() - interval '11 minutes' where id = vp.id;
  st := public.version_status(vp.id);
  if st->>'status' <> 'failed' or st->>'error' <> 'timeout' or st->>'failed_stage' <> 'verifying' then
    raise exception 'KB_TEST_FAILED: t_stale_version_cleaned: status=%', st;
  end if;
  vs := public.create_version('order-terms', 'retry.md');
  if exists (select 1 from public.kb_chunks where version_id = vp.id) then
    raise exception 'KB_TEST_FAILED: t_stale_version_cleaned: orphan chunks remain';
  end if;
  if (select status from public.kb_versions where id = vp.id) <> 'failed' then
    raise exception 'KB_TEST_FAILED: t_stale_version_cleaned: stale row not marked failed';
  end if;
  passed := passed + 1;

  -- t_bad_doc_key
  failed := false;
  begin
    perform public.create_version('kitchen', 'kitchen.md');
  exception when check_violation then
    failed := true;
  end;
  if not failed then raise exception 'KB_TEST_FAILED: t_bad_doc_key: unknown doc_key accepted'; end if;
  passed := passed + 1;

  -- t_status_and_documents_shape
  st := public.version_status(v2.id);
  if st->>'status' <> 'active' or st->>'stage' <> 'done' or (st->>'chunk_count')::int <> 3
     or st->>'upload_id' <> v2.id::text or st->>'doc_key' <> 'pricelist' then
    raise exception 'KB_TEST_FAILED: t_status_and_documents_shape: status=%', st;
  end if;
  if public.version_status(gen_random_uuid()) is not null then
    raise exception 'KB_TEST_FAILED: t_status_and_documents_shape: unknown id should return null';
  end if;
  select count(*) into n from public.active_documents() d
    where d->>'doc_key' = 'pricelist' and d->>'doc_title' = 'מחירון'
      and (d->>'version_no')::int = 2 and (d->>'chunk_count')::int = 3
      and d->>'file_name' = 'pricelist-v2.md' and d ? 'activated_at';
  if n <> 1 then raise exception 'KB_TEST_FAILED: t_status_and_documents_shape: active_documents wrong'; end if;
  select count(*) into n from public.active_documents();
  if n <> 1 then raise exception 'KB_TEST_FAILED: t_status_and_documents_shape: % active documents, expected 1', n; end if;
  passed := passed + 1;

  -- t_anon_denied
  perform set_config('role', 'anon', true);
  failed := false;
  begin
    perform 1 from public.kb_chunks limit 1;
  exception when insufficient_privilege then
    failed := true;
  end;
  if not failed then
    perform set_config('role', 'postgres', true);
    raise exception 'KB_TEST_FAILED: t_anon_denied: anon can read kb_chunks';
  end if;
  failed := false;
  begin
    perform public.match_kb_chunks(emb, 5, '{}'::jsonb);
  exception when insufficient_privilege then
    failed := true;
  end;
  if not failed then
    perform set_config('role', 'postgres', true);
    raise exception 'KB_TEST_FAILED: t_anon_denied: anon can run match_kb_chunks';
  end if;
  perform set_config('role', 'postgres', true);
  passed := passed + 1;

  raise exception 'KB_TESTS_PASSED: %', passed;
end
$$;
