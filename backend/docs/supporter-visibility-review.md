# Supporter visibility correction — prepared, not applied

Exact SQL: [20261009_071_supporter_visibility.sql](../migrations/20261009_071_supporter_visibility.sql).
SHA-256: `f674ac4bcc2d66cebeec53be29409f028277596f9f028bcaa9b660ca80b3ef93`.

This packet has no execution approval. Review and approve each target separately:

- **TEST:** Supabase project **vgqvaluplhbgyrvzvgue**, database **postgres**. This is the confirmed TEST target recorded in the migration ledger.
- **PRODUCTION:** Supabase project **dhfkysaazacblcazicom**, database **postgres**, as recorded in the production Node upgrade review. Reconfirm that this is the database serving the affected website before requesting production execution.

TEST approval never authorizes PRODUCTION. The existing Node compatibility upgrade approval does not authorize this correction. Nothing runs from startup, tests, CI, workers, Docker or CDK. Do not regenerate the previously approved bootstrap, edit historical migrations, replay earlier SQL, or run every migration filename.

## Cause and resulting behavior

The public API delegates supporter selection to `public.get_public_supporters_fast(integer,integer)`. Its existing anonymous-or-approved filter publishes anonymous donations even when admin publication is pending or rejected. The admin already writes publication status without changing donor anonymity.

This replacement requires `supporter_publication_status = 'approved'` for every public contribution. Approved anonymous contributions retain the name `Anonymous`; approved named contributions retain the donor name. Pending and rejected contributions are excluded for both anonymity settings. All existing anonymous pending contributions will disappear from the public feed until individually approved by an authorized admin.

The signature, response fields, pagination, ordering, net refund amounts, qualifying payment statuses and service-role-only access are retained. No donation/payment rows, payment provider state, fundraising totals, admin records or frontend presentation are changed. No mass approval is included.

## Preconditions, execution and risks

1. Confirm the exact project in Supabase's SQL editor. Run the [read-only verification SQL](../scripts/verify-supporter-visibility.sql) and save the current function definition and grants before applying the packet. Before correction, ledger comparisons may be false. Verify the current function matches the reviewed historical two-argument function; investigate any customization before replacement.
2. Record a current owner-managed backup/PITR recovery point. Preserve the function definition and ACL for recovery. This review has not connected to either target or executed PostgreSQL syntax/integration checks.
3. After separate approval of the exact target and checksum, manually run only the complete migration file in that project's SQL editor. It is transactional, checks that the expected function exists, and bounds lock waits to 5 seconds and statement execution to 60 seconds. Replacement briefly locks the function's catalog entry; timeouts abort rather than permitting a partial change.
4. Changing database selection takes effect on subsequent API requests; no application deployment is required for this correction. Existing open public pages retain already-loaded results, so reload `/donate` after applying it. Any externally configured response cache must also expire or be invalidated.

## Verification

Local checks passed: backend typecheck/build, all 41 existing mocked tests, and static comparison confirming that the only function-body change is the publication predicate, with grants preserved and the recorded checksum matching. These checks do not execute the SQL or establish live database behavior; target-specific PostgreSQL verification remains pending.

After approved execution, rerun the read-only verification SQL. Check the approved-only predicate, anonymous-name CASE expression, restricted grants, and six `matches_approved_ledger` results. The query compares function output against current approved payments without writing or seeding records. Exact timestamp ties at page boundaries have no secondary sort in the existing contract and can produce comparison differences; investigate ties before attributing a false result to visibility. Empty pages alone do not establish all visibility cases.

On TEST, use already-authorized synthetic records to cover pending/approved/rejected with anonymous true/false: only approved records should appear, and anonymous names must stay hidden. Include failed payments, full refunds and partial refunds. Any additional fixture writes require TEST testing authorization; this packet does not create records or payments.

For PRODUCTION verification, make read-only requests to `/api/donations/supporters/?limit=9&offset=0` and reload `/donate`. Confirm the reported private contribution disappears while its admin ledger row and progress totals remain intact. Do not change live donations or create payments just to test this fix.

## Recovery

If execution fails before COMMIT, issue ROLLBACK in the same SQL-editor session if necessary; verify the original definition and grants remain. No row recovery is needed because this packet contains no data updates.

After COMMIT, prefer correcting the new function forward. Restoring the prior function reintroduces the privacy bug and requires a separate exact SQL/checksum/target review and explicit approval. Use the saved pre-change definition/grants to prepare that packet; do not automatically restore a database or replay historical migrations.
