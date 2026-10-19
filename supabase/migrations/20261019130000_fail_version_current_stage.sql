-- fail_version: when n8n passes no stage, the stage last reported is the one that failed.
-- Lets every error branch in the workflow share a single "fail" node.
create or replace function public.fail_version(p_version_id uuid, p_stage text, p_error text) returns void
language plpgsql security invoker set search_path = public, extensions as $$
begin
  delete from kb_chunks c
   using kb_versions v
   where c.version_id = v.id and v.id = p_version_id and v.status in ('processing', 'verifying');
  update kb_versions
     set status = 'failed', failed_stage = coalesce(p_stage, stage), error = p_error, stage_updated_at = now()
   where id = p_version_id and status in ('processing', 'verifying');
end $$;
