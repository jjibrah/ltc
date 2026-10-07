> Packaging update: the owner subsequently requested this standalone `ltc/` repository. Active `frontend/`, `backend/` and `infra/` paths are relative to this directory. Legacy/reference material stays outside it. Historical layout statements below describe the earlier workspace; see [README](README.md) and [AGENTS](AGENTS.md) for current organization.

# LTC performance, reliability, and global-delivery plan

Date: 7 October 2026  
Status: engineering requirements and test plan, not measured production results  
Read alongside [implementation.md](implementation.md) and [design.md](design.md).

> DATABASE APPROVAL RULE: The current database is live. The owner will create the test database. Never apply migrations, schema/index changes, resets, or bootstrap SQL automatically on any target, including test. Prepare SQL, exact target identity, expected effects, verification, and rollback/recovery requirements; ask the owner for approval and wait. Plan acceptance, credentials, and silence are not migration approval. No migration may run from application startup, tests, CI, infrastructure deployment, or workers.

## 1. Outcomes

Make the public site load faster without changing its content/design; make the existing admin predictable during slow requests, session refresh, and provider failures; make accepted payment and email work recoverable after process restarts; prepare global static delivery and measurable regional API performance.

Replacing Python with Node.js or moving from Railway to AWS does not by itself solve crashes. Performance changes need evidence, bounded resource use, correct data handling, durable jobs, and recovery procedures. No system can promise zero failures; the goal is fewer failures, contained impact, early detection, and tested recovery.

## 2. Evidence from the audit

| Observation | Evidence | Confidence and limits |
| --- | --- | --- |
| API-client token-refresh race | Existing client evaluated with mocked concurrent 401/refresh responses; two refresh calls, valid token later cleared | Reproduced client behavior; actual Supabase concurrency behavior and previous Railway incidents not verified |
| Stale cache restored after save | Mocked GET completed after mutation; server value 2, cached value 1 | Reproduced cache defect, independent of hosting |
| No frontend request deadline | `LTC-frontend/src/shared/api/client.js` uses fetch without a default deadline | Source-confirmed; some browser/network failures may eventually terminate naturally |
| Many dashboard queries | `LTC-backend/app/dashboard/service.py`: 20 counts and new thread pool per load | Source-confirmed; latency/CPU cost not benchmarked |
| API-process email delivery | Newsletter route schedules `BackgroundTasks`; missing documented worker module | Restart-loss risk; active Railway start command unknown |
| Incomplete database bootstrap | `db.sql` lacks newer permission/audit tables/functions and role states | Source-confirmed; live migration state unknown; do not run it against live DB |
| Donation aggregate defect | Donation page sums requested amounts in loaded session page | Source-confirmed; recurring/refund totals require ledger reconciliation |
| Heavy assets | Frontend public directory about 115.97 MB; Team hero about 3.47 MB; several originals exceed 13 MB | Filesystem sizes, not per-page download sizes or transfer timings |
| Existing optimizations | Lazy route imports, home/route hero AVIF/WebP variants, batched newsletter attachment queries | Preserve these; do not claim they cover every route |
| Environment verification gaps | Frontend build/lint dependencies and backend Python dependencies absent locally | Build/lint/tests not completed; no runtime performance success claimed |

Capture actual Railway logs, exit reasons, CPU/memory charts, service start commands, serverless setting, restart policy, database proximity, and Redis health around a failure. Do not infer out-of-memory or host instability solely from the Hobby plan name. Railway documents configurable resource/spend limits and sleeping behavior in [cost controls](https://docs.railway.com/pricing/cost-control) and [Serverless](https://docs.railway.com/deployments/serverless).

## 3. Measurement protocol

### Baseline before optimization

- Record commit, Node/browser versions, instance/task sizing, API/Supabase region, network profile, dataset size, logged-in role, cold/warm cache, and date.
- Use production builds for frontend measurements. Vite development/StrictMode behavior is not a production benchmark.
- Capture route waterfalls, transfer bytes, image dimensions/format, JavaScript parse/execute cost, long tasks, layout shifts, and third-party requests.
- Separate browser round-trip latency from server processing, Supabase time, auth verification, storage uploads, Stripe/Resend latency, and queue delay.
- Capture first load, repeat visit, client navigation, first admin load, list filtering, mutations, and token-refresh scenarios.
- Use only owner-created test data for load/integration tests. No benchmarking against live mutations, payment accounts, or mailing lists. Read-only live monitoring needs explicit authorization.

### Geographic/device matrix

Measure an actual Kenya connection where possible, another relevant African location, Europe, Asia, and North America. Include a mid-range mobile device, constrained mobile network, and desktop. Identify real devices versus emulation and real region probes versus simulated throttling.

Run at least five cold and five warm browser samples per selected route/profile; report median and variation. Do not estimate p95/p99 from five samples. For API load tests use a documented workload and enough completed requests to calculate percentiles meaningfully. Field metrics require real-user data over time; mark them pending before production traffic exists.

### Result format

| Metric/route | Before | After | Target | Conditions | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Fill per measured scenario | Value or unmeasured | Value or unmeasured | Budget below | Region/device/cache/data/load | Trace, report or request ID | Pass/fail/not verified |

Keep synthetic fixture names and provider IDs out of public product UI. Store reports with secrets and personal data redacted.

## 4. Proposed budgets

These are initial engineering targets, not guarantees or existing measurements. Tune resource sizing after baseline, but do not quietly lower acceptance criteria to hide regressions.

| Metric | Initial target | Measurement boundary |
| --- | --- | --- |
| Public LCP | At most 2.5 seconds | Real-user p75, mobile/desktop separately; comparable lab runs as provisional evidence |
| Public INP | At most 200 ms | Real interaction/field p75; Lighthouse TBT is a lab proxy, not INP |
| Public CLS | At most 0.1 | Field p75 plus lab interaction checks |
| First-route JS | Provisional at most 250 KiB compressed | Actual initial route dependency graph, excluding lazy admin editor; investigate larger baseline before setting final cap |
| Mobile hero asset | Provisional at most 250 KiB selected image | Same crop/subject/acceptable quality; justify exceptions with measured visual and timing evidence |
| Public read API | p95 server processing under 500 ms | Warm requests in API region, measured under stated concurrency; exclude client network time |
| Admin list/summary | p95 server processing under 1 second | Representative bounded page and approved test dataset; no whole-table download |
| Ordinary mutation | p95 server processing under 1.5 seconds | Separate upstream provider time and asynchronous work |
| Visible UI feedback | Immediate pending state after an action | Does not imply operation completion; retain context and prevent duplicate action |
| In-memory cached navigation | Under 200 ms where applicable | Only a known-valid cached route/data state; freshness and permissions still apply |
| API stability | No process crash or unexplained 5xx in acceptance workload | Tests must also exercise deliberate failure paths and recovery |
| Worker stability | Every durably accepted job accounted for after restart | Completed, retrying, or operator-visible failure; no silent disappearance |

LCP, INP, CLS, and p75 segmentation follow [Web Vitals guidance](https://web.dev/articles/vitals). Numeric API/asset budgets here are project proposals. Do not label lab data as field success or report server latency as global end-to-end latency.

## 5. Public frontend optimization

### Images and media

- Inventory assets by actual route/network use. Hash duplicates before removing anything. Retain required fallback files and original sources outside the served build where appropriate.
- Reuse existing optimized home/route heroes. Replace the Team hero's delivered source with responsive optimized versions of the same photograph and preserve focal point, aspect ratio, overlay, and crop.
- Provide AVIF/WebP with compatible fallback, correct `srcset`/`sizes`, dimensions, and reserved space. Verify each referenced variant exists and never serve index.html for a missing image.
- Lazy-load below-fold images and the existing video embed. Limit carousel preloading to the next likely slide after critical content loads; verify no eager download of every original.
- Inspect actual LCP behavior. The current AGENTS rule requires lazy images; if giving the first visible hero eager/high-priority loading is necessary, present that specific rule exception for approval rather than silently violating it or lazily deferring the LCP asset.
- Dynamic Supabase image transformations require provider/plan support; confirm availability before relying on them. Do not route Supabase media through a Cloudinary helper unless that integration is deliberately configured.
- Protect originals and object references during replacements; image optimization changes delivery, not depicted people or editorial content.

### JavaScript, CSS, fonts, and rendering

- Preserve existing route lazy loading. Keep Tiptap/editor, crop tools, and admin-only styles outside the initial public-route dependency graph where practical.
- Profile before adding memoization, virtualization, or new packages. A bounded paginated table may be sufficient.
- Load modal-only code when needed if it measurably improves the first route and does not delay important interaction.
- Eliminate duplicate font delivery only after rendered typography is captured. Existing globals/index CSS both load Inter and contain conflicting aliases; preserve computed appearance while consolidating.
- Avoid a second animation library and unnecessary DOM wrappers. Animate transform/opacity where possible; keep reduced-motion content visible.
- Clean up observers, event listeners, timers, and object URLs. Cancel abandoned requests and disregard obsolete results.
- Reserve image/card space and stabilize loading placeholders so async content does not move controls unexpectedly.
- Inspect layout/paint cost on mobile. Do not remove existing content or interaction to achieve a score.

### Static delivery

- S3 origin stays private behind CloudFront OAC.
- Fingerprinted assets may use a one-year immutable TTL; HTML and deployment manifests use short/revalidation caching. Retain previous hashed files across release/rollback to avoid chunk-load failures in open tabs.
- Enable compatible compressed JS/CSS delivery. Avoid recompressing already compressed images or shipping raw multi-megabyte originals by default.
- SPA fallback handles intended client routes only. Missing assets are 404s; API errors retain JSON/status codes.
- Third-party YouTube/font requests remain visible in the measurement report. Use existing loading/fallback behavior before adding consent or analytics changes outside scope.

## 6. API-client and admin responsiveness

### Requests and retries

Introduce configurable deadlines. Suggested starting values: 15 seconds for ordinary browser reads, 30 seconds for provider-bound operations, and a separate bounded upload deadline sized for permitted bytes/network conditions. Measure and tune these; an entire retry sequence must have a total budget.

Use AbortController to combine deadline and caller cancellation. Clear deadline timers in success/failure paths. Cancel route-specific requests on unmount where needed. Aborted cached/deduplicated requests must not poison future requests or cancel unrelated consumers without a defined policy.

Only retry transient failures when the operation is safe/idempotent. Respect `Retry-After`, use jitter and bounded attempts, and never repeat payment creation, newsletter send, manual donation, or destructive action blindly after an ambiguous timeout. Query the resulting state using an idempotency reference before retrying.

### Session refresh

- Use one shared refresh coordinator for initial auth load, API 401 retry, and permission polling.
- Pause competing refreshes and replay authorized requests at most once after success.
- Coordinate multi-tab rotation if needed; logout broadcasts and stale requests must not restore an old session.
- Invalid refresh/disabled account yields controlled logout; transient provider outage yields a retryable state.
- Do not log access/refresh tokens or key cache entries by raw credentials exposed in diagnostics.
- Permission refresh on focus/visibility/interval must have one in-flight request, avoid hidden-tab polling, and back off during outages.

### Cache correctness

- Bound entries and evict expired values. Key by identity, effective permission version, URL/query, and response semantics.
- Clear sensitive caches on logout/user changes. Do not return protected data from a previous user or broader permission set.
- Use a mutation generation/version barrier so earlier GETs cannot populate a new cache generation. Coalesce equivalent reads while respecting cancellation semantics.
- Finance/auth/permissions need carefully chosen TTLs; a short cache never grants revoked authority.
- Server-side cache of public aggregates may allow controlled staleness; never invent an estimated financial total or present a pledge as money received.
- Sending status needs a deliberate polling/cache policy; the current client default TTL can make two-second polling repeatedly read the same cached response.

### Admin behavior

- Fetch/paginate/filter/sort on the server, with stable tie-breakers. Summaries use independent aggregate endpoints rather than summing one result page.
- Separate independent modules. Users can see permitted donations even when pledge access is denied; optional summary failures should not blank the whole dashboard.
- Retain existing data during refresh and show last successful update. Provide inline errors and retry, with refresh failure distinguished from first-load failure.
- Prevent overlapping autosaves, retain unsaved text on failure, and ensure send uses confirmed saved content. A toast alone is not reliable draft recovery.
- Disable duplicate destructive/financial submissions while awaiting confirmation. Report pending provider verification explicitly.

## 7. Backend and database efficiency

- Use async provider operations; avoid synchronous filesystem/CPU-heavy work inside Node request handling. Move batch email, exports, and image processing into bounded jobs. See [Node.js event-loop guidance](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop).
- Reuse connection-capable service clients; isolate auth clients and close resources on shutdown. Instrument latency/error budgets for all providers.
- Replace dashboard count fan-out with approved database aggregation/RPC or an existing compatible aggregate and short shared cache. SQL/RPC/index changes are proposals only until the owner approves them for the test target.
- Avoid N+1 queries and unbounded `select *`. Reuse existing batched newsletter-attachment fetching; select only list fields and fetch detail on demand.
- Validate pagination limits and stable ordering; use cursors where data size warrants it, retaining compatible clients during transition.
- Inspect query plans only on an approved test database; measure improvements before proposing indexes. No automatic live `EXPLAIN ANALYZE`, index build, or schema tuning.
- Keep payment summaries based on successful ledger installments less appropriate refunds, with documented currency/date/source treatment. Money calculations use exact units/decimals and checked conversions.
- Bound per-request parallelism, upload concurrency, connection demand, and caches; a Promise.all over a whole table simply moves the overload.
- Keep API, Redis, and Supabase geographically close enough to avoid unnecessary cross-region round trips. Provider outages need short deadlines and actionable 503s, not misleading 401s.
- Preserve RLS/grants and server authorization while optimizing. Caching or local JWT verification does not bypass disabled-account checks.

## 8. Queue and restart reliability

SQS is a durable transport, not a complete transaction manager. Persist acceptance/outbox state and per-batch results, then recover dispatch gaps. Keep payloads small (job IDs); do not enqueue attachment bytes or whole recipient datasets. Verify the target queue exists and task IAM allows intended operations.

Consumers tolerate duplicate deliveries and lost acknowledgements; use deterministic provider keys, database uniqueness, leases, and durable checkpoints. Set/extend visibility according to real processing duration and stop taking new work during graceful shutdown. SQS documents reappearance of unacknowledged messages and visibility management in [visibility timeout guidance](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).

Required scenarios:

| Failure point | Expected recovery |
| --- | --- |
| API exits after persisting acceptance but before queue dispatch | Outbox dispatcher eventually queues the work |
| API fails before durable acceptance | Request fails clearly; caller retries safely using idempotency key |
| Worker exits before provider send | Message becomes available; next worker resumes |
| Provider accepts a batch but worker exits before DB checkpoint | Same stable idempotency key and reconciliation avoid blind duplicate sends |
| DB checkpoint succeeds but queue acknowledgement fails | Redelivery observes completion and exits safely |
| Provider 429/temporary 5xx | Bounded backoff with provider limits respected |
| Repeated permanent failure | Job reaches dead-letter/operator-visible failed state |
| Audience exceeds one provider page | All eligible pages accounted for without excessive memory |
| Subscriber unsubscribes while queued | Suppressed at delivery check |
| Partial batch failure | Accurate accepted/failed/unknown counts; retry eligible recipients only |

Queue scheduling and invitation cleanup have one authoritative owner. Running Railway and AWS schedulers concurrently must not create duplicate cleanup/send jobs. Monitor queue age, failed attempts, outbox backlog, and stuck statuses rather than relying only on worker process liveness.

## 9. Global AWS service model

CloudFront serves public static content from global edge locations. Authenticated admin mutations, uncached reads, and payments still reach a regional API and its data providers. CDN presence does not turn a single-region database into a multi-region write system. See [AWS workload-location guidance](https://docs.aws.amazon.com/wellarchitected/latest/framework/perf_networking_choose_workload_location_network_requirements.html).

Start with one measured API region, two availability zones, at least two API tasks, and a regional worker/Redis footprint. Preserve a single coherent data authority. Do not add active-active writes, Global Accelerator, replicas in every region, or a new database provider without measured need and approved scope.

Keep authenticated/API/webhook responses out of public CDN caches. Use a separate API hostname initially. Public cacheable aggregates can receive a deliberate short TTL only when safe and when freshness/publication changes invalidate correctly.

Prepare rolling deployment health checks and automatic rollback; the owner must first establish a known healthy deployment. ECS's circuit breaker supports rollback for its supported deployment controller: [ECS deployment circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html). Infrastructure rollback does not undo data writes or database migrations.

Document provider egress, regional latency, task sizing, managed Redis, load balancer, logs, SQS, private networking/NAT, storage, and outbound transfer costs. Redundancy needs a budget. Choose sizes from measured workload rather than an unsupported claim that AWS cannot fail.

## 10. Monitoring and health

- `/api/health`: cheap process liveness; no provider calls or exact whole-table counts.
- `/api/ready`: bounded checks of dependencies required to serve requests; no mutations. Do not permanently probe a failing shared dependency so aggressively that it worsens the outage.
- API structured logs: validated/generated request ID, normalized route, method, status, duration, release and service identifier. Redact token-bearing URLs and personal fields; current profile/unsubscribe tokens must not leak through raw path logging.
- Record p50/p95/p99 by endpoint class, provider timeouts/errors, DB calls per request, event-loop lag, memory/RSS, CPU, restart count, worker job duration, queue age, failed jobs, and webhook backlog.
- Aggregate across replicas; current per-process metrics reset at restart and cannot be treated as global production percentiles.
- Keep restricted metrics accessible only to authorized operators. Do not expose environment values, payloads, connection strings, or access tokens.
- CloudWatch can collect ECS/Fargate CPU/memory metrics and support alarms: [ECS monitoring](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html).

Suggested initial alerts, to tune after baseline: sustained error-rate increase, p95 budget breach, persistent high memory/CPU, repeated task restarts, dependency readiness failures, queue age above expected delivery delay, any exhausted job, stale outbox entries, and unresolved Stripe processing failures. Scheduled newsletters use their planned send time when calculating lateness.

Define routing/ownership for alerts without automatically messaging external recipients during implementation. Set log retention and cost alerts before production.

## 11. Load, soak, and failure verification

Use synthetic data in the owner-created test environment, after separately approved schema setup. Production endpoints and credentials must be rejected by write/load harnesses by default; require an explicit test-project identity allowlist rather than guessing from a hostname.

1. Start with a small smoke workload; verify correctness and absence of provider side effects.
2. Increase representative public reads and admin sessions in stages (for example 10, 25, then 50 concurrent clients). These are test steps, not assumed business traffic.
3. Test at least 1x and 2x the owner's expected peak once that peak is known; document the request mix and ramp rate.
4. Run an approximately 30-minute soak at the chosen representative load; inspect memory growth, connection pressure, queue accumulation, and stale client state.
5. Restart one API task, then the worker; inspect accepted work, client recovery, rolling availability and duplicate processing.
6. Inject provider deadlines/failures with mocks first; use controlled staging dependency failures only when authorized.
7. Exercise large permitted uploads and rejected oversize files while normal reads continue.
8. Reconcile ledger and job counts after each run. A fast response that dropped records is a failure.

Use native Node test tooling and browser developer tools where available. New benchmark/browser packages need the agreed dependency manifest; do not install globally or modify the live project without authorization.

## 12. Manual performance acceptance

- [ ] Public site matches design baseline across mobile/desktop; same text and photographs.
- [ ] First/repeat load waterfalls show selected optimized assets, not unnecessary original-image downloads.
- [ ] Public navigation does not fetch the admin editor bundle on first load.
- [ ] First admin load, pagination/filtering, uploads and modals remain responsive.
- [ ] Several tabs near expiry retain a valid session; temporary outage does not masquerade as invalid credentials.
- [ ] A saved edit cannot be replaced by stale data from an earlier request.
- [ ] Slow/offline requests stop waiting within the documented deadline; uncertain mutations do not duplicate.
- [ ] Dashboard queries are measured and reduced; permission-domain failures remain contained.
- [ ] Donation summary matches complete ledger examples, including recurring installments and refunds.
- [ ] Newsletter progress stays accurate through API/worker restarts, duplicate messages, and partial failure.
- [ ] Regional test results distinguish API time from network latency and state unmet targets honestly.
- [ ] Alerts, rollback, and backup/restore runbooks are reviewable by the owner.
- [ ] No DB migration/index change or live load test was run without explicit target-specific approval.

Deliver measured before/after reports, exact test conditions, resource/cost assumptions, failure-injection results, and unresolved risks. The owner performs final manual acceptance and production deployment. Mark production field metrics and AWS behavior unverified until they are actually observed.
