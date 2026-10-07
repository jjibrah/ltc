# Manual billing migration review

**NOT EXECUTED. No target is approved for this migration.**

Exact SQL: [20261007_070_operations_billing.sql](../migrations/20261007_070_operations_billing.sql).

SHA-256: `260a9b451b5f620028ee96fc46d4c2105cc84d71cde9e4ee3e695d6ad4dbf0f2`.

## Target identification required before execution

Confirm the exact Supabase project reference, database name and whether the target is TEST or PRODUCTION. The earlier session approved other SQL only for TEST `vgqvaluplhbgyrvzvgue / postgres`. That approval does not cover this file. The subsequently mentioned live Supabase project `dhfkysaazacblcazicom` must not be treated as an approved target. Credentials and `.env` changes are not approval.

The owner requested to run any necessary migration manually. Review this complete SQL and the packet, confirm the target and explicitly approve this exact checksum before running it yourself. The agent will not execute it. Never wire the file into startup, tests, workers, CI, Docker or deployment.

## Effects

Creates three empty tables: `service_billing`, `service_billing_payments`, `operations_settings`, plus indexes and one transaction function, `ltc_record_service_payment`. It inserts no service templates, credentials, analytics or payment data. No existing table/row is altered or removed.

New tables enable RLS with no direct client policies; privileges are revoked from PUBLIC, anon and authenticated. The backend service role can read/write the permitted records. API authorization limits billing reads to active super admins or holders of existing `donations.view`; billing/settings writes require active super admins. Settings reads are available to authenticated staff and contain only an analytics provider/link, never keys.

The function locks a service row, verifies an active super-admin actor and the expected service timestamp, records the external payment, moves its due date to the explicitly supplied next date, and writes an audit event in one transaction. Duplicate submission keys with matching payment details return the existing record; mismatched/stale submissions fail. Payment currency must match the service. It does not contact or pay a provider, schedule reminders or send messages.

## Risks and preflight

- Verify existing `public.application_users` (uuid id, role, status), `public.audit_events` (actor_user_id, action, entity_type, entity_id text, reason, request_id, after_state), Supabase roles and `gen_random_uuid()` match the target. The supplied live schema snapshot was reviewed for those references; the current target has not been connected or independently verified.
- Check these three new relation names and the exact function signature are absent. Plain CREATE deliberately fails on collisions; do not add IF NOT EXISTS to hide an incompatible schema.
- Obtain an owner-controlled backup/snapshot before production execution, and record target/checksum/time. DDL takes locks and needs appropriate schema privileges. Existing table references and role grants may fail on a non-Supabase target.
- All DDL is in BEGIN/COMMIT: an error aborts the transaction; roll it back and inspect before retrying. Never run partial fragments.
- Financial estimates and deadlines are manually entered. “Overdue” describes this register, not a verified provider balance. No currency conversion is performed.
- Payment references/history are retained. Archive a service rather than deleting it. New data should join normal database backup/recovery procedures.

## Owner verification after approved manual execution

Run these read-only checks in the confirmed target:

```sql
SELECT current_database(), current_user;
SELECT c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('service_billing','service_billing_payments','operations_settings');
SELECT to_regprocedure('public.ltc_record_service_payment(uuid,uuid,numeric,text,date,date,text,timestamptz,uuid,text)');
SELECT tablename, policyname FROM pg_policies
WHERE schemaname='public' AND tablename IN ('service_billing','service_billing_payments','operations_settings');
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('service_billing','service_billing_payments','operations_settings');
SELECT (SELECT count(*) FROM public.service_billing) AS services,
       (SELECT count(*) FROM public.service_billing_payments) AS payments,
       (SELECT count(*) FROM public.operations_settings) AS settings;
```

Expect three RLS-enabled tables, a present function, no client policies and empty tables immediately after creation. Verify no anon/authenticated grants on the new tables/function. Refresh PostgREST schema cache through the owner's approved Supabase process if necessary; the app does not run schema changes or cache-reload SQL.

Integration tests remain pending and may only use the separately confirmed TEST database. After approval, owner acceptance should verify create/edit/archive, read-only finance, denied staff access, payment/date/history, duplicate-key replay, simultaneous stale edits and rollback on audit insertion failure. Never use live payment providers or live email delivery for those tests.

## Rollback and recovery

Before COMMIT, use ROLLBACK if verification within the transaction fails. After COMMIT, disable/revert the operations routes and navigation in application code while preserving the new tables and their records. Keep database backups; export newly entered billing/history/settings before any destructive cleanup. Existing functionality does not depend on these tables.

Dropping tables/functions or changing grants is a separate schema operation requiring its own exact SQL/checksum/target approval. No automatic down migration is supplied or executed. Restore backups only through the owner's reviewed recovery procedure; never reset or truncate the live database.
