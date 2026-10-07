# TEST database review and execution record

Confirmed target: **TEST Supabase project `vgqvaluplhbgyrvzvgue`**, database `postgres`, session pooler `aws-0-us-east-1.pooler.supabase.com`. The read-only preflight confirmed application tables are absent and Supabase Auth/Storage schemas exist. No production connection was made.

Execution ledger: owner explicitly approved the exact fresh script/checksum/TEST target in this session. The checksum- and target-guarded one-packet command completed with COMMIT. No other migration approval is implied. Read-only verification confirmed application RLS and service-role-only RPC access. Five TEST integration scenarios passed; full parity and provider verification remain pending.

Review the complete exact SQL in `../migrations/fresh-test-bootstrap.sql`.
SHA-256: `70f29fa1532142eff94796a58bdf24635caa61d36e6df978d8232c9681f659cd`.

This fresh-only script incorporates the historical schema in the explicit dependency order in `schema-order.json`, followed by Node reliability SQL. **Do not execute the historical files separately afterward. Do not use this fresh script on an existing/production database.** The script rejects existing application tables before changing anything. It permits an empty first RBAC setup without inventing an initial user; the historical upgrade prerequisite remains unchanged in the retained source.

Effects: application/content/payment/subscriber/newsletter/invitation/RBAC/audit tables, constraints, indexes, triggers, functions, RLS/grants, permission catalogue/default-role rows, and three public media buckets. Adds transactional manual/payment/refund writes, serialized profile submission/reordering, complete ledger/dashboard aggregates, frozen newsletter outbox/recipients, leases and checkpoints, and attachment concurrency/size guards. No accounts, subscriber addresses, personal content or financial fixtures are inserted. No Auth identities are changed. Storage bucket settings may change; capture any existing bucket settings before execution.

Risks reviewed before execution: DDL locks and hosted Supabase extension/grant compatibility. The approved fresh transaction and selected RPC integrations have now passed on TEST; this does not prove upgrade or production compatibility. API behavior may need corrections discovered during further rehearsal. Snapshotting a large subscriber audience creates rows and takes locks; performance still needs TEST measurement. Retained legacy account protection policies require owner reconciliation with `PRIMARY_SUPER_ADMIN_ID` before production. This release must not be deployed based solely on mocked tests.

Verification after explicitly approved owner execution:

1. Re-run the identity-guarded read-only schema preflight.
2. Inspect `verify_security.sql` before executing it; it is a retained read-only check, not a migration.
3. Confirm all RPCs used by `src/` exist and are service-role-only, application tables have RLS, and only intended media buckets are public.
4. A synthetic TEST Auth/application operator was explicitly prepared through the guarded REST setup command under the owner's TEST testing authorization. Credentials remain only in ignored local .env. The approved SQL itself did not seed an account; no additional schema SQL was executed.
5. Run contract/role/auth/storage/payment/job integration and failure tests using synthetic records only, then compare ledger and job counts.

Recovery: before applying, capture schema/bucket definitions and an owner-managed backup of any existing Auth/Storage data. Within the open transaction, use ROLLBACK if the script fails or validation shows a problem. After commit, rollback is not automatic: restore the approved TEST snapshot or separately review narrowly scoped recovery SQL. Do not drop schemas, reset the project, or delete Auth users to recover. Production recovery always requires a separate packet and target approval.

Execution belongs to the owner via the TEST project's SQL editor, or to the agent only after approval explicitly naming the file, checksum and target above. No startup/test/CI/worker/CDK/Docker path invokes this SQL. The generator builds text only. Credentials, generic implementation approval and silence do not authorize execution.

The incremental review artifact `20261007_060_node_reliability.sql` has SHA-256 `241b816907d0624dd45ef00fd85788a8fbf2771da168d8f096636a4d8d2f7db9`; it is already included in the fresh script. Applying it to an existing schema requires a separate target-specific review, not approval of this fresh TEST packet.

## Additional approved packet

Exact SQL: [20261007_061_storage_cleanup.sql](../migrations/20261007_061_storage_cleanup.sql).
SHA-256: `55c1662ffc552323a5114763deb718409a5960185f1e5d2946ae87bc0edb8ab3`.
Exact target: **TEST** project `vgqvaluplhbgyrvzvgue`, database `postgres`, session pooler `aws-0-us-east-1.pooler.supabase.com`. The owner separately approved this exact checksum/target in this session. The manual checksum/target-guarded command completed with COMMIT. Real TEST Storage integration verified orphan removal, referenced-profile protection, and frozen-newsletter snapshot protection. No production authorization is implied.

Effects: creates one empty service-role-only RLS table and pending-job index to record media-cleanup intents, attempts, deadlines and leases. No existing tables, data, Auth identities, buckets or objects are changed; no objects are removed by this SQL. Jobs are created explicitly by application upload/delete operations, not seeded by SQL.

Risks: short catalogue locks during table/index/grant creation; compatibility must be checked on TEST. The later worker must prove current-record and frozen-newsletter reference protection before deleting an object. A one-hour delay protects normal in-flight upload/commit work; long or uncertain requests still require reconciliation. No production permission is implied.

Verification: confirm this table exists with RLS, anon/authenticated privileges absent and service-role privileges present; run mocked shared-reference/frozen-snapshot/outage/retry tests and guarded synthetic TEST storage exercises. Verify no startup/test/CI/worker entrypoint invokes this packet.

Recovery: failure within this transaction rolls back. After commit, disable cleanup processing and retain any job rows while diagnosing; do not drop the table or delete media automatically. Any structural reversal needs separately reviewed exact SQL/target approval. Deleted object bytes require a separate Storage backup; a database rollback cannot restore those bytes.
