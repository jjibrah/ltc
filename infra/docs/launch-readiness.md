# Launch review — 7 October 2026

Status: code prepared and locally checked; **production cutover is not cleared**. No deployment, AWS resource creation, live database connection/write, live payment, production newsletter, push or merge was performed in this follow-up.

## Release changes

The admin now follows the owner's current compact design direction: admin-only Geist Sans, semantic light status colours, graphite dark mode, compact summary strips, table directories, 3:1 editor/support layouts, short headings, labelled icon actions and disclosures. The persistent sidebar collapses on desktop; mobile uses the keyboard-accessible drawer. Unsaved editor changes prompt before navigation/discard and supported drafts remain in memory in the current tab, keyed by user/entity; they clear on logout. No business permission was relaxed.

GA4 reporting is an optional API module with authenticated, permission-checked 7/30/90-day reports, bounded requests, short caching and independent failures. Settings distinguishes configured values from verified reports. No visitor numbers are invented. Public collection is **off**, without a public consent/banner/design change; future collection requires a separately completed consent control. Follow [analytics setup](../../backend/docs/analytics-setup.md); Google property/service-account configuration and real reporting remain unverified.

Public launch fixes preserve presentation: checkout retries keep one key for identical requests and generate a new key when details change; confirmation polls fetch fresh status; late failure/expiry events update only a still-pending database row. Mocked payment tests cover exact cents, monthly metadata, privacy, unknown-outcome retries and concurrent completion. Pledge tests cover organization validation, private consent, durable acceptance and write failure. Existing pages/forms/contact links are retained; no general contact form was requested.

AWS IaC now accepts a reviewed public hostname/existing us-east-1 certificate pair. Static API paths do not fall through to React HTML. Static delivery remains global through CloudFront; API latency is regional and must be measured near the actual production Supabase region.

## Dependencies

No new library was introduced in this follow-up. Owner approved compatible security updates. Existing Tiptap packages are aligned to 3.31.4; compatible transitive lockfile updates include the patched editor dependency chain. Frontend runtime audit and backend full audit report zero vulnerabilities. Frontend full audit retains seven findings (five high/two moderate) in the Tailwind v3 build dependency chain; npm proposes a breaking Tailwind v4 migration, which was not authorized. Infrastructure retains one high finding in CDK's bundled brace-expansion; compatible update/non-forced audit fix cannot patch that bundle. These are unresolved build/deployment-tool risks, not a clean full dependency audit. Never use `npm audit fix --force` as an incidental release step.

## Local checks

| Command (run in indicated directory) | Actual result |
| --- | --- |
| frontend: `npm test` | 33 passed, zero failed |
| frontend: `npm run lint` | Passed, no warnings |
| frontend: explicit fixture-origin `npm run build` | Passed; no production service contacted |
| backend: `npm run typecheck`, `npm test` | Passed; 41 tests, zero failed, mocked providers |
| infra: `npm test` | Passed; local synthesis and three routing/environment tests; CDK reports 82 unconfigured feature flags |
| frontend runtime / backend full npm audit | Zero findings |
| frontend full / infra audit | Seven / one unresolved findings as above |
| local Chromium admin suite | See final browser evidence below |
| optional hostname/GA4 CDK synthesis | Passed; aliases/certificate and API-only secrets verified in generated template; no resources created |
| Docker image build/start | Blocked: Docker Desktop WSL integration unavailable |
| current database / Stripe / Resend / SQS / GA4 integration | Not run; local environment must not be assumed TEST |

The final patched-editor browser run passed **135 states/12 interaction groups** across 320/375/768/1024/1440 light layouts and 320/375/1440 dark layouts, including populated and empty stories. Checks use synthetic data and mock every API; they do not establish real-provider parity or screen-reader certification. Google Geist loading was separately verified in the focused browser run. Evidence is ignored local content under `frontend/node_modules/.cache/ltc-admin-verification/release/report.json`; export it before reinstalling dependencies. The original 55-pair public baseline remains under `/tmp/ltc-admin-redesign/`, with its comparison report; no public text/photos/styles were changed in this follow-up.

The final build (including fresh payment polling) also passed the Google-font-enabled focused suite: **18 states/11 interaction groups**, under `release-focused/report.json`. Final source hashes checked 144 public assets/pages/shared-style files: only DonateModal's request-intent logic differs from the pre-admin baseline; its rendered markup/styles are preserved. Vite's final build emitted an informational plugin-timing warning; it exited successfully. No speed improvement or field performance certification is claimed.

Preservation was verified by reversing only the new checkout-intent edits in memory and matching the complete DonateModal file SHA-256 to the pre-admin baseline. An initial comparison against Git HEAD used an older, different public baseline and failed; it is not recorded as a passing comparison. The current baseline hash check succeeds without changing presentation or weakening assertions.

An initial new pledge test failed because its provider fixture lacked Storage initialization; the fixture was completed, then all 41 backend tests passed. Tests were not weakened. The browser visual review caught low-contrast dark empty-state copy, which was corrected and included in the next verification.

## Required owner gates before launch

1. **Database compatibility.** Confirm whether the Node compatibility objects are present using the owner-run, read-only verification SQL. [Production review](../../backend/docs/production-upgrade-review.md) remains unapproved in the implementation record. Its SQL must not be executed without exact checksum/target approval; any changed or partially applied schema requires a new reviewed packet. Missing payment RPCs prevent reliable donations. Billing's separate [review](../../backend/docs/operations-billing-review.md) also remains unexecuted/unapproved; missing billing storage must not be mistaken for healthy zero totals. No migrations run on startup/tests/CI/workers/Docker/CDK.
2. **Isolated staging.** Restore locally configured Supabase keys to confirmed TEST; configure test-mode Stripe, isolated Redis/SQS and controlled Resend recipients. Do not run integration scripts against live. Finish invitation/recovery, payment/refund/webhook, durable-job restart/redrive, media failure and per-route parity acceptance. Legacy Python stays until all cleanup gates pass.
3. **Container and AWS rehearsal.** Enable Docker Desktop WSL integration (or use a Linux Docker host), build the reviewed image, verify non-root API/worker startup, readiness, graceful termination and separate worker health handling. Run staging release/rollback rehearsal. Review NAT/ALB/Fargate/Redis cost and alert recipients before provisioning.
4. **Public release acceptance.** On staging, browse all public/direct-link routes; exercise existing contact links, mentorship/subscription, donation one-time/monthly/cancel/pending/failure/confirmation and pledge individual/organization/private cases. Only Stripe sandbox is permitted for tests. Verify published content, images/crops/fonts, mobile/modal keyboard behavior and provider outages. Real production payments are enabled by the owner only after staging acceptance, with the live webhook destination and ledger reconciliation verified.
5. **Configuration/security.** Owner supplies exact public/API domains, ACM certificates, DNS, matching HTTPS CORS, Auth redirects, payment API/webhook version and environment-specific runtime secrets. Resolve or explicitly assess remaining dependency findings. Keep `.env`, service-role keys and GA4 private keys out of frontend/build/public artifacts. No credentials are needed in chat.
6. **Monitoring/recovery/performance.** Verify alerts, backups/PITR plus separate Storage-byte backup, recovery ownership, queue/DLQ and unknown-provider-outcome procedures. Benchmark cold/warm public loads and actual regional API p95; no production performance budget is certified by local builds.

## Local start and rollback

Use Node 24.20.0, no Python. Configure backend `.env` locally using `.env.example`, `APP_ENV=development`, port8000, isolated Redis and confirmed TEST Supabase keys. Start Redis; run `npm run dev` in backend. Set frontend `.env` `VITE_API_URL=http://localhost:8000`; run `npm run dev` in frontend and open `http://localhost:5173`. Backend CORS must include that exact http origin. Use `npm run worker` only with separately configured isolated queue/provider credentials. Application startup never installs schema.

For AWS deployment, configuration, monitoring, backups and rollback use [deployment runbook](deployment-runbook.md) and [manual checklist](manual-acceptance.md). Retain previous compatible image/static/configuration versions, old hashed assets and database history. Stop/reconcile workers before changing release ownership; no automatic down-migration or live database restore. GA4 can be disabled independently with its context/runtime flag, with public collection still off.
