# Owner deployment, operations and rollback runbook

Status: locally prepared infrastructure, not deployed. Keep staging and production in separate stacks/resources/secrets. Choose the API region close to the Supabase project; confirmed TEST pooler is in us-east-1. Do not assume the production project is in the same region. Benchmark real Kenya/African, Europe, Asia and North America connections before production sizing. CloudFront distributes static content globally; uncached APIs remain regional.

Repository packaging: the owner requested a standalone `ltc/` directory. All build paths below are relative to that Git repository root. Publish only that directory; legacy `LTC-backend/` and organizational material remain outside it in the surrounding workspace. Root CI in this repository uses frontend/backend/infra directly; it does not require the parent checkout.

## Configuration and build

Pin Node 24.20.0 in development, CI and containers. Run npm ci separately in frontend/backend/infra. Build frontend with an explicit VITE_API_URL or VITE_API_BASE_URL. These are public build variables; never place secrets in VITE_*.

Set runtime values in an existing environment-specific Secrets Manager JSON secret: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL, AUTH_REDIRECT_URL, CORS_ORIGINS, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_API_VERSION, RESEND_API_KEY, RESEND_FROM_ADDRESS, ORG_MAILING_ADDRESS, PRIMARY_SUPER_ADMIN_ID. Use test-mode payment/provider configuration in staging. Validate protected-account identity against database policies before production.

The checked-in Python Stripe 15.6.0 defaults to 2026-08-26.dahlia, per its generated API version source. Node explicitly uses that version; confirm the actual previous deployment/webhook destination before cutover. Do not change API version as incidental migration cleanup.

Build image from repository root: `docker build -f infra/docker/api.Dockerfile -t ltc-node:RELEASE .`. Its Dockerfile-specific ignore rules exclude .env and local/generated source. API runs as node, not root. Worker uses the same build with `node dist/src/workers/worker.js`; when testing the worker with Docker, override the API-only image healthcheck with `--no-healthcheck`. ECS API readiness is `/api/ready`; liveness is `/api/health`.

Local review: `cd infra && npm run typecheck && npm run synth`. Synthesis does not deploy or migrate anything. Review the generated template and CDK diff before any owner deployment. Never run SQL as part of CDK, Docker, ECS startup, worker jobs, tests or CI.

## AWS resources and release

IaC prepares private versioned S3 with OAC, CloudFront static SPA, two-AZ VPC with deliberate NAT egress, immutable ECR tags, HTTPS ALB, two Fargate API tasks with CPU scaling/circuit-breaker rollback, separate worker, encrypted SQS/DLQ, daily invitation cleanup schedule, private replicated encrypted Redis with noeviction, and CloudWatch alarms.

Owner supplies regional API certificate and creates/configures DNS. CloudFront custom-domain certificate must be in us-east-1; ALB certificate must be in the chosen API region. Initially use separate static and API hostnames. Set exact HTTPS CORS and Supabase Auth redirect allowlists. Missing static assets must remain errors; API errors must never become index.html.

For the public hostname, synthesize with both `--context siteDomain=YOUR_PUBLIC_HOSTNAME` and `--context siteCertificateArn=YOUR_US_EAST_1_ACM_ARN`. Neither context creates certificates or DNS records. The template attaches the existing certificate and alias to CloudFront; missing/invalid pairs fail synthesis. The owner creates the DNS alias after review. Use the same hostname for FRONTEND_URL, redirect allowlists and the frontend release. Requests under `/api/` on the static host are never rewritten to HTML; the browser must use the configured API origin.

Review initial provisioning carefully: ECR must have the chosen image before the service can become healthy. Owner deploys LtcFoundation first, publishes an immutable image into its ECR repository, then deploys LtcMigration with ImageTag, RuntimeSecretArn, ApiCertificateArn, AlertEmail and MonthlyBudgetUsd parameters. Choose the AWS profile/region explicitly for both stacks. Do not call a failed initial service rollout a healthy rollback baseline. Any infrastructure bootstrap/deploy belongs to the owner.

Use distinct deployment prefixes, for example synthesis with `npm run synth -- --context deployment=LtcStaging` versus `--context deployment=LtcProduction`, producing independent Foundation/Migration stacks. ApplicationEnvironment defaults to staging; the owner explicitly chooses production for the production stack and supplies that environment's secret/certificate/queues. Never reuse a TEST runtime secret for production. CloudFront preserves the React extensionless catch-all and dotted recovery tokens while keeping missing assets/images as genuine errors.

Upload fingerprinted assets with long immutable cache headers. Upload index.html with no-cache/revalidation, last. Retain old hashed assets to keep open tabs functional and enable rollback. Record S3 versions, image digest/tag, frontend/API origins, configuration revision and schema compatibility for every release. Invalidate HTML only; avoid deleting old chunks.

Private tasks reach Supabase, Stripe and Resend through NAT; security groups permit Redis only from API/worker. Task roles permit queue actions and secret retrieval; do not supply AWS access keys in source. Budget two NAT gateways, ALB, at least three Fargate tasks, replicated Redis, logs/egress, S3/CloudFront and queue costs before deploying.

## Cutover ownership

Complete TEST parity/security/payment/job/upload and manual gates first. Review any production SQL separately with exact production target/checksum/backup/recovery and owner approval. TEST approval does not authorize production.

Drain the old newsletter worker and establish a single owner for queues and schedules. Record outstanding accepted work. Switch Stripe webhook ownership once, preserve signing secrets appropriately, and reconcile delayed/duplicate events. Never run old/new non-deduplicating payment processors simultaneously. Move API origin and static release as a compatible pair. Observe before retiring the old live deployment.

## Monitoring and backups

Configure alert destinations and cost budget before production. Watch p95 API latency, 5xx, CPU/memory/task restarts, readiness/provider failures, oldest queue message, DLQ, frozen pending jobs, recipient unknown states and Stripe failed/stale claims. Process metrics reset at restart; CloudWatch aggregates replicas. Logs contain normalized route patterns and request IDs, never tokens/credential URLs or raw payment/email payloads.

Use owner-managed Supabase PostgreSQL backups/PITR according to the purchased plan. Database backups do not contain Storage object bytes: back up media objects separately with a manifest of path/hash/record references. Retain immutable S3 release versions and ECR image digests. Exercise restore into an approved isolated TEST target with separately approved exact SQL if schema work is needed; never restore over live automatically. Record RPO/RTO, backup encryption, retention and recovery owner.

## Rollback and job recovery

Stop new release workers/scheduler dispatch before reverting ownership. Restore the previous compatible frontend index/version and API image/configuration. ECS circuit breaker needs a known healthy completed deployment; it does not roll back data. Keep schema additions compatible; never down-migrate/delete financial rows to roll back code.

Reconcile payment events against Stripe using stored event/payment/invoice references and net refunded totals. Reclaim stale leases only through the tested application path. Review DLQ/failed jobs, active suppression and unknown provider outcomes before redrive. Preserve job snapshots/recipient checkpoints. Resend idempotency lasts 24h; unknown old attempts require operator reconciliation, not blind replay. Do not mark provider acceptance as recipient delivery.

Media uploads reserve a durable storage_cleanup_jobs intent before uploading. Replacements/deletions queue old objects before changing records. The worker waits one hour, claims jobs, checks all matching current-record and frozen-newsletter snapshot references, and removes only unreferenced objects. Storage/reference failures use exponential backoff and stop after eight attempts with failed status; monitor storage_cleanup_failed logs and failed rows. Referenced jobs are retained and reopened by subsequent removal operations. Review any long/uncertain in-flight request before resuming cleanup. A successful API save does not depend on immediate Storage removal. Recovery of already deleted bytes requires the separate object backup; SQL recovery cannot restore media. Do not manually remove frozen snapshot assets or blindly reset cleanup jobs.

Retain the previous live deployment and artifacts until the owner accepts the observation window. Document every rollback decision, image/static version, outstanding jobs and reconciliation result.

## Optional GA4 reporting

GA4 reporting is disabled by default. See [analytics setup](../../backend/docs/analytics-setup.md). For a reviewed reporting release, store GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY and GA4_HOSTNAMES in the existing environment-specific runtime secret and synthesize with `npm run synth -- --context ga4Reporting=true`. This passes analytics credentials only to the API, not workers. No account/resource/deployment was performed for this feature. Public collection remains off (`VITE_GA4_ENABLED=false`) until a separately implemented consent control is approved and verified. Disabling the context/runtime flag provides the reporting rollback; no SQL is needed.
