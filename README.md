# Living The Charge

[live site](https://livingthecharge.org/)

This directory is the standalone application repository root. Run Git setup and deployment builds from **ltc/**, not the surrounding reference workspace. React/Vite (including the admin portal) lives in `frontend/`; Node.js/TypeScript in `backend/`; AWS CDK, Docker and operational runbooks in `infra/`. `admin/` contains planning/handoff documents, not a separate application.

Migration status: implementation and verification in progress. The legacy `../LTC-backend/`, organizational `../LTC-docs/` and reference assets remain in the surrounding workspace and are not part of this deployable repository. Do not deploy based solely on mocked checks. Current release gates are in [launch readiness](infra/docs/launch-readiness.md).

## Repository layout

```text
ltc/
  frontend/        React public site and admin portal
  backend/         Node API, worker, tests and manual SQL review packets
  infra/           AWS CDK, Docker and deployment/rollback instructions
  admin/           Admin design and implementation handoff
  .github/         Checks only; no automatic deployment or migrations
  AGENTS.md        Contributor constraints
  implementation.md, performance.md, design.md  Migration specifications
```

## Create your GitHub repository manually

Create an empty GitHub repository without an initial README, then run these commands **inside this ltc directory**. No Git repository, remote, commit or push was created by the agent.

```sh
git init -b main
git status --short --untracked-files=all
git add .
git diff --cached --name-only
git commit -m "Prepare Living The Charge application"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Review the staged list before committing: `.env` files, private keys, `backend/scripts/liveschema.json`, dependencies and generated build/evidence folders must not be included. Ignored local environment files have been preserved, not deleted. Fresh clones require locally configured environment files and `npm ci` in each application directory. Never put service-role keys or provider secrets in frontend variables. Deploy from this repository root; the API Docker build context is `.` and its file is `infra/docker/api.Dockerfile`.

The checked-in contract snapshot supports tests without legacy code. Only optional inventory regeneration requires the external legacy directory: from backend, set `LTC_LEGACY_BACKEND_DIR=/absolute/path/to/LTC-backend` before `npm run inventory`. Do not copy the Python system into deployment artifacts.

Reorganization verification: frontend 33 tests, backend 41 mocked tests, infra three synthesized-template tests, frontend lint/build all passed from this directory. No dependencies or runtime business logic changed during packaging. Local environment files were moved intact and verified ignored; the live schema export is also excluded from Git and the API Docker context. Docker build/start remains unverified because Docker Desktop WSL integration is unavailable. Existing launch gates in the readiness report still apply.

## Local startup with Node

Use Node **24.20.0** and npm. Run `npm ci` in frontend, backend and infra.

`backend/.env` is ignored. Confirm its target locally before starting: the owner has changed this file to live credentials during this session, so it must never be assumed to be TEST. Do not paste secrets into chat or commit them. `.env.example` describes configuration. Supabase URL/anon/service-role keys must belong to the same project; a PostgreSQL pooler URL alone does not supply Auth/Storage. Integration testing is restricted to confirmed TEST vgqvaluplhbgyrvzvgue.

Set an isolated local/TEST `REDIS_URL` for public write rate limiting and readiness. No Redis server or working Docker engine is installed in this workspace, so this external prerequisite remains owner configuration. Use test-mode Stripe and controlled Resend recipients; queue/worker integration needs an isolated SQS queue, which the agent does not provision. Local liveness/content reads can be exercised without the worker.

Run `cd backend && npm run build && npm start` (API port 8000 by default). In another terminal, configure frontend `.env` with `VITE_API_URL=http://localhost:8000`, then `cd frontend && npm run dev`. For production-build preview: `VITE_API_URL=http://localhost:8000 npm run build && npm run preview`. The frontend requires an explicit API origin for builds.

For an independently configured TEST SQS queue, run `cd backend && npm run worker`. AWS credentials come from a local profile/task role, never committed keys. Worker entrypoints do not migrate the database. Do not run email/payment workflows with production credentials while testing.

No Python is required for the new API, worker, frontend or infrastructure commands. Retaining the reference does not mean running both backends/webhook processors.

## Verification

- Frontend: `npm run lint`, `npm test`, explicit-origin `npm run build`.
- Backend: `npm run typecheck`, `npm test` (external providers mocked, no .env/database).
- Confirmed TEST integration only: `npm run build`, then `node --env-file=.env scripts/test-integration.mjs`. This explicitly guarded harness creates synthetic records, does no schema setup, sends no real email/payment, and retains append-only audit/delivery history. It is not a CI/startup test.
- Infrastructure: `npm run typecheck`, `npm test` (synthesis plus static-route contracts; no deployment).
- Docker: from repository root, `docker build -f infra/docker/api.Dockerfile -t ltc-node:review .`; not verified here because Docker is unavailable.

Read [API parity status](backend/docs/parity-status.md), [database review/execution](backend/docs/database-review.md), [AWS deployment/rollback runbook](infra/docs/deployment-runbook.md), and [manual acceptance](infra/docs/manual-acceptance.md). The three root plans remain specifications, not measured results.

Current admin/analytics and launch review: [launch readiness](infra/docs/launch-readiness.md). This supersedes the historical check counts below. GA4 public collection remains off; [configure reporting locally](backend/docs/analytics-setup.md). The latest admin uses Geist, compact summary strips, collapsible navigation and graphite dark mode.

## Implementation handoff — 7 October 2026

The frontend directory was moved intact, with existing public assets and organizational documents retained. The new backend covers authentication/RBAC, users/invitations, dashboard/metrics/audit, profiles/submission links, stories, mentorship, subscriptions, donations/pledges/Stripe webhooks, newsletters/uploads and a standalone durable delivery worker. The old Python backend remains because complete behavioral parity and cleanup gates have not passed.

Reliability work includes authoritative active-user checks, bounded provider requests, distributed rate-limit support, shared browser refresh/cache barriers, ordered newsletter saves, frozen delivery snapshots/checkpoints, webhook leases and exact transactional payment/refund/manual ledger writes, atomic profile reordering/submission limits, upload validation, independent donation/pledge permissions and complete-ledger summaries. Admin lists use pagination; public layout/styles/content remain preserved apart from the documented Stories runtime fix and same-photo Team delivery optimization.

Dependencies are recorded in the workspace manifests and lockfiles: backend Express, Zod, Supabase JS, jose, Stripe, Redis, Multer, SQS SDK, and separately approved sanitize-html/types; TypeScript and corresponding declarations for development. Infrastructure uses AWS CDK, constructs and TypeScript. No new frontend runtime dependency was added. See [backend package](backend/package.json), [frontend package](frontend/package.json), and [infrastructure package](infra/package.json).

Actual local results:

| Check | Result |
| --- | --- |
| Frontend `npm run lint` | Passed |
| Frontend `npm test` | 13 passed, zero failed |
| Frontend explicit-origin `npm run build` | Passed; editor remains a lazy route chunk |
| Backend `npm test` (includes TypeScript build) | 31 passed, zero failed; all 90 legacy routes registered; all 66 protected routes reject missing/disabled credentials |
| Guarded TEST integration command above | Five passed, zero failed; Auth/PostgreSQL/Storage real, payments/email/queue/rate boundaries mocked |
| Infra `npm run typecheck` and `npm run synth -- --quiet` | Passed; synthesis created local artifacts only; CDK reports unconfigured optional feature flags |
| Infra native synthesized-route tests | Three passed: deep links/catch-all/dotted recovery tokens, missing assets, staging/production parameter |
| Public capture/source comparison | 55 pairs at 320/375/768/1024/1440; equal visible text/dimensions, zero captured runtime errors/overflow; 46 pixel matches within tolerance, nine require review |
| Container build/start | Blocked: Docker engine unavailable in this workspace |
| Local Node API/Vite startup | Passed; API health returned 200/ok and Vite returned 200 HTML; both smoke-test servers stopped afterward |
| Dependency audit | Backend: zero findings at install; retained frontend: 29 moderate/10 high; infrastructure: one high bundled brace-expansion finding, not fixed by safe lock-only audit fix |

An added authentication contract check initially failed because password-change validation preceded authentication; the implementation was corrected and rerun successfully. A screenshot run failed on a stale Chromium interception ID; the harness was corrected and that baseline was recaptured. Tests were not weakened to hide either failure.

Visual evidence: [source/DOM preservation](frontend/docs/preservation-report.json), [pixel comparison](frontend/docs/screenshot-comparison.json), and local ignored screenshots under frontend/docs/visual/. The captures use empty synthetic data and block external fonts/video. They do not establish published-content, modal/form, accessibility, zoom, reduced-motion or field performance acceptance. Team variants preserve the original full photograph and reduce the 1600px AVIF asset to 132,276 bytes; the original is retained. Regional load/soak, cold/warm browser budgets and production metrics are unverified.

Remaining implementation/release gates: complete per-route request/response/side-effect fixtures; invitation/recovery staging behavior; protected-account stable-ID reconciliation; full multipart/concurrent storage failure coverage; real Redis/SQS restart/redrive, Stripe sandbox and controlled Resend verification; Docker image verification; full paginated admin/manual public acceptance. These are recorded in the parity report and owner checklist. No legacy removal or production cutover is approved by the checks above. A fresh TEST rehearsal does not prove compatibility with an existing production schema; any upgrade/recovery SQL needs its own exact target approval.

## Database approval

No migration executes through startup, tests, CI, Docker, workers or CDK. The owner explicitly approved an exact fresh SQL packet and a separately reviewed media-cleanup packet for TEST vgqvaluplhbgyrvzvgue; both committed successfully. Any changed SQL or target needs renewed approval. No production database migration, push, merge, AWS resource creation, live payment or production newsletter is authorized or performed.
