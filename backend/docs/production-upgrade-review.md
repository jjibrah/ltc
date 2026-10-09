# Production Node compatibility upgrade — owner reports applied and verified

Target: **PRODUCTION** Supabase project **dhfkysaazacblcazicom**, database **postgres**. The owner supplied the project's schema export; this review makes no live connection. Confirm this exact project in the Supabase SQL editor before any owner execution. The database name `postgres` does not identify a Supabase project by itself.

Exact SQL: [20261007_062_production_node_upgrade.sql](../migrations/20261007_062_production_node_upgrade.sql).
SHA-256: **8b0e20da4f797b705c950ec306df553ae1b217ed21ced58888c3e4cd434b54d9**.
Status update, 8 October 2026: the owner confirmed that the reviewed Node compatibility upgrade was **applied and verified** on this PRODUCTION target. This records the owner's report; the agent did not execute SQL, inspect the live database or independently recheck the verification results. Execution time, backup/recovery record and SQL-editor output were not supplied in this update. Do not replay this upgrade. Any additional schema change still requires its own exact SQL/checksum/target approval. This file is not included in startup, tests, CI, workers, Docker, CDK or the TEST execution helper.

## Evidence and comparison

The comparison below describes the supplied **pre-upgrade** schema snapshot. It is historical evidence, not the current production state. The owner's applied-and-verified confirmation supersedes the earlier awaiting-approval execution status without certifying application/provider acceptance.

Source: `backend/scripts/liveschema.json`, captured 2026-10-07 05:31:43 UTC, PostgreSQL 17.6, database postgres. Source SHA-256: `37de8dacc9ee1926d155d5a894faeaeee8ca53138f7d50d18c7920960caab5d9`. Metadata exports are not backups and do not prove current row states, external Auth settings, worker state or project identity independently.

The 16 existing application tables and 178 columns used as upgrade prerequisites are present. Existing payment amounts, refund fields, payment-reference uniqueness, webhook leases, application users/RBAC/invitations, append-only audit protection and content schemas are already present. All three configured media buckets exist. Existing RBAC RPC names/arguments are present. No existing table/bucket rebuild or historical migration replay is needed.

All 12 Node ltc_* functions are absent. delivery_jobs, delivery_recipients and storage_cleanup_jobs are absent. Their absence explains the dashboard/progress errors and also blocks transactional Node payment/profile and durable newsletter/cleanup workflows.

The live validated mentor_status_valid constraint permits pending/contacted/approved/declined, while the Node API also requires under_review. The upgrade preserves contacted and adds under_review without changing a single existing status. Existing contacted rows remain contacted; review their presentation and operational meaning separately instead of assuming they were converted.

## Effects

- Create 11 service-role-only RPC functions and one attachment trigger function. Aggregates read the current complete ledger; no totals are seeded or copied.
- Create empty durable delivery-job, recipient-checkpoint and storage-cleanup tables, with indexes, RLS, service-role grants and no anon/authenticated/PUBLIC access. New rows are created only by subsequent application operations.
- Add an attachment trigger that serializes metadata edits with send acceptance, rejects modifications to frozen newsletters, and enforces the existing 20 MB total attachment limit. Existing attachment bytes/rows are not changed.
- Replace only mentor_status_valid with a NOT VALID superset constraint, retaining contacted and allowing under_review. NOT VALID avoids scanning old rows; the old validated subset proves old rows satisfy the new superset, and all new writes are checked. Catalogue validation remains deferred; separately review any later validation DDL.
- Retain every existing application table, record, ID, legacy RPC, audit entry, policy, user permission, Storage bucket and object. No account/content/donation/subscriber seeding, data update, reset or truncation occurs.

The SQL checks all 178 reviewed column names/types/nullability, the exact validated mentor constraint, and absence of the proposed Node objects before DDL. Drift, previously applied objects or lock timeout cause transaction failure instead of silently overwriting unknown schema. Function lookup uses public before pg_temp; schema CREATE grants remain unchanged.

## Preconditions and risks

1. Capture and verify an owner-managed database backup/PITR recovery point and separately back up Storage bytes. Record release/configuration versions and the original schema export. Confirm who performs recovery and acceptable downtime/RPO/RTO.
2. Rehearse this exact incremental upgrade against a separately confirmed TEST clone of the production schema. Existing TEST has the Node objects already, so this packet deliberately rejects it; do not drop/reset that database to force a rehearsal. A TEST clone and its migration need separate exact target approval. This packet has not been executed or syntax/integration rehearsed as a whole; analogous 060/061 RPC/storage workflows passed on the original TEST project.
3. Pause newsletter send/upload/attachment edits, legacy delivery workers and invitation scheduling for the cutover window. Reconcile any already-sending legacy newsletter; this SQL does not create jobs for prior in-flight sends. Establish one worker/scheduler/webhook owner before enabling the new release. Do not let both old and new payment processors act concurrently.
4. DDL briefly locks mentor_applications and newsletter_attachments. lock_timeout=5s aborts rather than waiting indefinitely; statement_timeout=60s bounds statements. Timeouts are not permission to bypass guards; investigate and retry only the same approved bytes/target after confirming state.
5. Later job acceptance snapshots subscriber addresses/tokens for reliable delivery; the job tables are private. Later cleanup deletes only reference-checked unreferenced bytes. Neither emails, payment requests nor Storage deletion occur in this migration. Those operations still need controlled staging verification and deployment ownership.
6. The legacy protected-primary-account policy remains unchanged and must be reconciled with PRIMARY_SUPER_ADMIN_ID before production acceptance. Supabase Auth redirects/provider settings, Stripe API compatibility, actual Redis/SQS/Resend behavior, full API parity, Docker and manual acceptance remain separate release gates. Fixing schema errors does not complete the migration or approve deployment.

## Verification

After explicitly approved manual execution, run [verify-production-node-upgrade.sql](../scripts/verify-production-node-upgrade.sql). It reads metadata, empty job counts and aggregate results only; it never exercises production payment/email/write RPCs. Expected grants, trigger and deferred-constraint states are commented in the file.

Export the schema again with schema-report.sql and compare it with the original: only the three new tables/indexes/ACLs, 12 new functions, one new trigger and the mentor constraint replacement should differ. Check current donation totals against the existing verified ledger. Do not call production create/send/claim RPCs or run scripts/test-integration.mjs against live.

## Rollback and recovery

If any statement fails before COMMIT, the transaction should abort; issue ROLLBACK in the same SQL-editor session if needed and verify no partial objects remain. Do not proceed with a partially failed editor result.

After COMMIT, prefer reverting to the previous compatible application and disabling new workers/schedules while retaining additive tables/functions and their history. The expanded mentor constraint remains compatible with old contacted values. The attachment guard can affect old editing workflows, so diagnose that explicitly before returning traffic; any trigger/schema reversal requires a separately reviewed and approved SQL packet.

There is intentionally no automatic DROP/CASCADE/down-migration script. Once jobs, payment changes or new statuses exist, deleting schema/history or reapplying the old mentor constraint can lose data or fail. Preserve jobs/audit/ledger records and reconcile accepted/unknown deliveries before redrive. Database recovery cannot restore deleted Storage bytes; use the separate object backup. Restoring over live or changing schema for recovery needs its own exact SQL/target approval.
