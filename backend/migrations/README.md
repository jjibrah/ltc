# Database SQL — owner approval required

SQL is retained for review and history. Nothing here runs from application startup, tests, CI, workers, Docker or infrastructure deployment.

The historical `db.sql` is incomplete and is **not** an authoritative bootstrap. Do not blindly execute it or apply every filename in lexical order. Historical sequence identifiers overlap.

For the confirmed empty TEST Supabase project, review `fresh-test-bootstrap.sql` and the exact target/checksum/effects/verification/recovery packet in [database-review.md](../docs/database-review.md). It incorporates the explicit order in `schema-order.json`; do not apply both it and its sources.

Every execution requires explicit approval of exact SQL/checksum and TEST/PRODUCTION target. TEST approval never authorizes production. The explicitly approved fresh TEST packet and separately approved 061 storage-cleanup packet committed on project vgqvaluplhbgyrvzvgue. The immutable fresh packet does not include 061; do not regenerate or reapply it to this initialized database. No production migration has run.

Preserve all historical migrations. The read-only `verify_security.sql` is available for owner-reviewed verification after approved setup. A synthetic TEST operator was explicitly prepared through the guarded REST setup under the owner's TEST testing authorization; credentials remain only in ignored local configuration. No schema approval authorizes live user changes.
