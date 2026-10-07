-- READ ONLY. Run AFTER a separately approved manual upgrade, before enabling workers.
-- Intended PRODUCTION project: dhfkysaazacblcazicom / postgres.
WITH expected(signature) AS (VALUES
 ('public.ltc_record_payment(uuid,text,text,text,numeric,text,timestamp with time zone)'),
 ('public.ltc_record_refund(uuid,numeric,text)'),
 ('public.ltc_manual_donation(uuid,jsonb,text)'),
 ('public.ltc_donation_summary()'),
 ('public.ltc_donation_progress()'),
 ('public.ltc_reorder_profiles(uuid[])'),
 ('public.ltc_submit_profile(text,jsonb)'),
 ('public.ltc_accept_newsletter(uuid)'),
 ('public.ltc_claim_job(uuid,uuid)'),
 ('public.ltc_complete_job(uuid,uuid)'),
 ('public.ltc_dashboard_summary(boolean)')
)
SELECT signature, to_regprocedure(signature) IS NOT NULL AS exists,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') END AS anon_execute,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') END AS authenticated_execute,
 CASE WHEN to_regprocedure(signature) IS NOT NULL THEN has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE') END AS service_execute
FROM expected ORDER BY signature;
-- Expected: exists=true, anon/authenticated=false, service=true for every row.

SELECT c.relname, c.relrowsecurity AS rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access,
 has_table_privilege('service_role',c.oid,'SELECT') AS service_select,
 has_table_privilege('service_role',c.oid,'INSERT') AS service_insert,
 has_table_privilege('service_role',c.oid,'UPDATE') AS service_update
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('delivery_jobs','delivery_recipients','storage_cleanup_jobs')
ORDER BY c.relname;
-- Expected: three rows, RLS=true, anon/authenticated=false, service privileges=true.

SELECT conname, convalidated, pg_get_constraintdef(oid,true) AS definition
FROM pg_constraint WHERE conrelid='public.mentor_applications'::regclass
 AND conname IN ('mentor_status_valid','mentor_status_node_compatible');
-- Expected: only mentor_status_node_compatible, convalidated=false, all five statuses.
-- NOT VALID intentionally avoids an old-row scan; all new writes are checked.

SELECT tgname, tgenabled, pg_get_triggerdef(oid,true) AS definition
FROM pg_trigger WHERE tgrelid='public.newsletter_attachments'::regclass
 AND tgname='ltc_guard_attachments';
-- Expected: one enabled BEFORE INSERT/UPDATE/DELETE attachment guard.

SELECT 'delivery_jobs' AS relation, count(*) AS rows FROM public.delivery_jobs
UNION ALL SELECT 'delivery_recipients',count(*) FROM public.delivery_recipients
UNION ALL SELECT 'storage_cleanup_jobs',count(*) FROM public.storage_cleanup_jobs;
-- Expected: empty immediately after the migration, before new application writes.

SELECT public.ltc_dashboard_summary(true) AS dashboard,
 public.ltc_donation_progress() AS progress,
 public.ltc_donation_summary() AS donation_summary;
-- Read-only aggregate inspection. Compare totals to existing verified ledger data.
-- Do not call payment/manual/submission/send/claim RPCs as production smoke tests.
