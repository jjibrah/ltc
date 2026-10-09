# Living The Charge: from an empty EC2 instance to an operated AWS deployment

Prepared 8 October 2026 for this repository. Follow the stages in order and record the evidence at each checkpoint. This is an implementation guide, not confirmation that the deployment or provider configuration has already been completed.

## 1. The choices to make

**Use EC2, Docker, Docker Compose, GitHub Actions and CloudWatch. Leave Kubernetes until later.** You will learn Linux, IAM, networking, containers, releases, TLS, observability and recovery without adding a cluster before the application has passed staging acceptance.

| Technology | Decision for this project | Reason |
| --- | --- | --- |
| EC2 | Yes | You want to administer the host and practice DevOps. |
| Containerization / Docker | Yes | The existing backend Dockerfile gives reproducible API and worker images. |
| Docker Compose | Yes, for the first EC2 deployment | Separates API, worker and staging Redis with explicit configuration. |
| Kubernetes / EKS | No for this first release | Cluster networking, upgrades, ingress and controllers add work without resolving current launch blockers. Learn it later in an isolated lab. |
| CI/CD | Yes, in stages | CI first, then controlled staging deployment, then approved production promotion. |
| Monitoring | Required before production | Host uptime alone does not prove donations or background jobs work. |
| Infrastructure as code | Use the existing CDK tooling | Capture EC2 resources after the first staging exercise; do not maintain a second conflicting Terraform stack. |
| Global delivery | S3 + CloudFront | Deliver the website globally; keep the initial API in one US region near Supabase. |

The first complete deployment in this guide uses one EC2 host for API and worker, Nginx for HTTPS, and CloudFront for the website. **This is a single point of failure.** It is suitable for learning/staging. Before calling production resilient, implement the two-host API/ALB design in section 17. A charity may choose a single-host first production release only with an explicitly accepted outage/recovery limitation and a tested replacement procedure.

Nothing here requires changing public design, replacing Supabase/Stripe/Resend, or adding application libraries. This document is the only file added now. Compose, workflows, host scripts and future CDK changes described below are subsequent implementation work, not files already present.

## 2. Current state and launch gates

Repository root contains `frontend/`, `backend/`, `infra/` and `.github/`. Run Git/build commands from this standalone root, not the surrounding legacy workspace.

Verified in this review:

- Frontend: 33 tests passed; lint and production build passed with a fixture API origin.
- Backend: type checking and 41 mocked tests passed. Local HTTP tests required permission to open loopback ports outside the sandbox.
- Infra checks could not be rerun because local dependencies were absent. Earlier reported synthesis results are historical evidence.
- Docker build/start remains unverified in the current workspace because Docker is unavailable.
- Real Stripe, Resend, Redis, SQS, current production schema and AWS rollout were not tested in this review.
- The existing `infra/aws/app.ts` deploys **Fargate**, not EC2. Do not run its full deployment expecting it to configure your new EC2 host.
- `admin/implementation.md` is referenced by repository instructions but absent in this checkout. Use the current launch report for available handoff evidence; do not fabricate a passing review of the missing file.
- The checkout has an existing untracked root `package-lock.json`; do not blindly include it in a release commit. Each application has its own lockfile.

**Database update, 8 October 2026:** the owner confirmed the reviewed Node compatibility upgrade on PRODUCTION `dhfkysaazacblcazicom / postgres` was applied and verified. The supplied October 7 export predates that upgrade and is historical evidence. The agent has not inspected the current live database or independently checked the owner's verification. Do not replay the upgrade. Billing/settings approval and execution remain separately unconfirmed; provider/application acceptance and deployment are still required.

| Review packet | Target recorded in packet | SHA-256 of reviewed SQL |
| --- | --- | --- |
| [Production Node upgrade](backend/docs/production-upgrade-review.md) | PRODUCTION `dhfkysaazacblcazicom / postgres` | `8b0e20da4f797b705c950ec306df553ae1b217ed21ced58888c3e4cd434b54d9` |
| [Billing/settings](backend/docs/operations-billing-review.md) | No approved target | `260a9b451b5f620028ee96fc46d4c2105cc84d71cde9e4ee3e695d6ad4dbf0f2` |

Before any schema change: review exact SQL, recompute SHA-256, identify exact TEST/PRODUCTION project, describe effects/locks/risks, verify backup and recovery, obtain explicit approval, then have the owner execute the complete approved transaction. TEST approval never authorizes production. No CI, Docker, systemd, CDK, worker or deploy script may migrate. Do not replay historical migrations against live.

Confirmed integration TEST project: `vgqvaluplhbgyrvzvgue`. Local `.env` may hold live credentials. Never assume it is TEST or copy it to staging unreviewed. See [launch gates](infra/docs/launch-readiness.md), [parity status](backend/docs/parity-status.md) and [manual acceptance](infra/docs/manual-acceptance.md).

## 3. Fill in the deployment record before doing anything

Keep a private operational record; no secrets belong in this document, Git or chat.

| Item | Value to record |
| --- | --- |
| GitHub repository | Exact owner/repository and approved release commit |
| Domain / DNS | Owner-confirmed `livingthecharge.org`; Namecheap manages DNS; verify authoritative nameservers |
| AWS account / region | Account ID and selected region |
| EC2 | Instance ID, AMI, architecture, instance type, subnet, security group |
| Production Supabase region | Confirm in its dashboard; do not infer from TEST |
| Staging provider identities | TEST Supabase, Stripe sandbox, controlled Resend setup |
| Production provider identities | Separate secret, Stripe account/webhook, verified sender |
| AWS Free Tier | Owner reports the teammate's newly created account has signup Free Tier; record its actual plan, remaining credits and expiry before provisioning |
| Event traffic | Owner estimates 1,000 visitors; total attendance versus peak concurrent arrivals remains unconfirmed; rehearse the expected burst on TEST |
| Budget | Monthly AWS ceiling plus Supabase/email separately |
| Operations | Alert recipients, recovery owner, backup retention, agreed RPO/RTO |

The owner confirmed `livingthecharge.org` as the deployment domain and Namecheap as the DNS manager. Examples below use that exact spelling. Confirm the authoritative nameservers and export existing DNS records before changes; domain ownership, active DNS configuration and provider verification have not been independently established by this guide.

Suggested hosts:

| Environment | Website | API |
| --- | --- | --- |
| Staging | `staging.livingthecharge.org` | `api-staging.livingthecharge.org` |
| Production | `livingthecharge.org` and optionally `www.livingthecharge.org` | `api.livingthecharge.org` |

Use separate production/staging EC2 hosts, queues, secrets and static buckets. Prefer separate AWS accounts as you mature. Choose `us-east-1` if it is suitably close to production Supabase; global visitors do not require multi-region database writes. CloudFront certificates must be in `us-east-1` regardless of API location.

## 4. Secure the new AWS account and EC2 instance

In AWS Console:

1. Protect the root account with MFA, remove root access keys, and use an administrative IAM Identity Center identity for daily work. Configure a billing contact and budget alerts. A budget notification is not a spending cap.
2. Inspect the new instance before running commands. This walkthrough assumes **Ubuntu Server 24.04 LTS, x86-64**. Run `cat /etc/os-release` and `uname -m`. If it is Amazon Linux or ARM, adapt installation/image commands first; do not paste Ubuntu commands into another OS.
3. For the teammate's newly created signup Free Tier account, review the console's eligible instance types and credit estimate before launching. AWS currently lists `t3.small` (2 GiB RAM) and x86-64 `c7i-flex.large` / `m7i-flex.large` among eligible types for accounts created on or after July 15, 2025. A `t3.small` is an initial staging candidate; select final capacity only after testing the expected event burst, with larger eligible types considered if required. These types consume credits; eligibility does not promise unlimited free operation. The earlier `t3.medium` candidate must not be assumed eligible. Start with an encrypted 30 GiB gp3 root volume and monitor free space. Review burst-credit charges/limits and actual traffic. See [AWS EC2 Free Tier](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).
4. For this first direct-Nginx setup, the instance needs a public subnet, an internet-gateway route and an Elastic IP. Associate the Elastic IP; an ordinary public address can change after stop/start. Record ongoing public IPv4 charges.
5. Security group: inbound 80/443 from the internet for HTTP certificate validation/HTTPS; SSH 22 only from your current IP temporarily if needed. Never expose 8000 or 6379 publicly. Do not add IPv6 ingress/DNS until IPv6 is actually configured.
6. Attach an instance profile. Use `AmazonSSMManagedInstanceCore` for Systems Manager. Add least-privilege permissions for the specific environment's secret, SQS queue, ECR pull, log streams and custom metrics. Add KMS decrypt only for the keys actually needed. No AdministratorAccess or static AWS keys on the host.
7. Enable IMDSv2 required. Bridge-network containers using AWS SDK instance credentials generally need metadata response hop limit **2**; test this rather than injecting AWS access keys. All containers on this first host share its role, so the host role is a combined API/worker trust boundary. Later separate hosts/roles.
8. Verify Session Manager works before removing SSH access. SSM Agent needs appropriate permissions and outbound connectivity. Keep a tested emergency access route.

[AWS Session Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html) and [container metadata guidance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html).

**Checkpoint:** known OS/architecture, Elastic IP, restricted ingress, working SSM, no root/static credentials in application files, budget notifications received.

## 5. Prepare the empty Ubuntu host

Commands in this section run **on EC2** using SSM or restricted SSH. Installations and later commands change the host; inspect each command before executing.

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git unzip nginx python3
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Create `/etc/apt/sources.list.d/docker.sources` using `sudoedit`:

```text
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
```

Then:

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx
sudo docker run --rm hello-world
sudo docker compose version
sudo nginx -t
```

These use Docker's official Ubuntu repository. Check the [current Docker instructions](https://docs.docker.com/engine/install/ubuntu/) if your OS differs. Docker-group membership gives root-equivalent control; this guide uses `sudo docker` instead.

Install AWS CLI v2 using the [official Linux instructions](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), including its signature verification. On x86-64 the installer package is `awscli-exe-linux-x86_64.zip`; ARM uses a different package. Verify `aws --version` and `aws sts get-caller-identity`. This should identify the instance role, not stored user keys. Set region explicitly in commands.

Create host directories:

```bash
sudo install -d -m 0755 /opt/ltc
sudo install -d -m 0700 /etc/ltc
```

If an update requires reboot, reboot now, reconnect, and verify Docker/Nginx/SSM. Do not enable unattended application deployments or database updates.

## 6. Prepare a release from GitHub

Run builds on your workstation or a GitHub runner, not on a busy production host. Clone only the standalone repository. For a private repository, use normal GitHub authentication locally; do not embed a token in a clone URL or shell history. EC2 will later pull images from ECR, so it does not need a permanent GitHub credential.

Use repository-pinned Node **24.20.0** for these initial checks. Reassess supported/patched versions as maintenance work, updating CI and Docker consistently.

```bash
git clone YOUR_GITHUB_REPOSITORY_URL ltc
cd ltc
git status --short
git rev-parse HEAD
```

Run in the indicated directories:

| Directory | Commands |
| --- | --- |
| `frontend` | `npm ci`, `npm test`, `npm run lint`, `VITE_API_URL=https://api-staging.livingthecharge.org VITE_GA4_ENABLED=false npm run build` |
| `backend` | `npm ci`, `npm run typecheck`, `npm test` |
| `infra` | `npm ci`, `npm run typecheck`, `npm test` |

Tests use mocks; do not add `.env` loading or live credentials to CI. Review dependency audits in all three directories; do not use forced breaking upgrades to clear a report. Prior unresolved Tailwind/CDK findings require a refreshed assessment. Archive test output and build metadata.

From repository root on a Docker-capable machine:

```bash
docker build -f infra/docker/api.Dockerfile -t ltc-node:REVIEWED_COMMIT_SHA .
```

The image contains Node API/worker code and production dependencies, runs as `node`, and does not include migration execution. Build excludes secrets/live schema. The frontend is a separate static artifact; do not use its development server in production. Smoke-test this image using confirmed TEST configuration before promotion.

**Checkpoint:** exact commit known; all checks passed or explicit blockers recorded; reviewed image builds; no secret/legacy source copied into artifacts.

## 7. Create staging dependencies in AWS and Supabase

Create these first through the console for learning, recording names/ARNs/settings. Later codify them in the EC2-specific CDK implementation. Do not deploy the existing Fargate stack as a shortcut: it creates additional compute and NAT/ALB costs.

1. **ECR:** create a private repository, immutable tags and image scanning. Keep previous release images for rollback.
2. **SQS:** create standard queue `ltc-staging-jobs` plus `ltc-staging-dlq`, encrypted, retention 14 days, visibility 300 seconds, redrive after 5 receives. Alerts must watch both. Worker extends visibility while processing.
3. **Scheduler:** create one EventBridge Scheduler `rate(1 day)` schedule targeting the jobs queue with input `{"kind":"invitation-cleanup"}`. Give its dedicated role only queue-send and DLQ-send permissions; configure 3 retries, maximum event age 3600 seconds, and a DLQ. Keep it disabled until database compatibility and staging worker acceptance are established. Never run old/new schedules concurrently.
4. **Supabase:** confirm TEST `vgqvaluplhbgyrvzvgue`, Auth URL/keys belonging to that same project, required schema/RPCs and Storage buckets. Do not create schema automatically. Complete the separate billing SQL review if those routes will be accepted.
5. **Stripe:** use sandbox/test credentials and a staging webhook destination. Match the existing pinned API version `2026-08-26.dahlia` only after verifying compatibility with the actual provider configuration. Do not silently upgrade Stripe API semantics.
6. **Resend:** verify a sender domain you own, add the provider's exact DNS records, and restrict staging recipients operationally to controlled addresses. The app does not provide a general staging recipient allowlist guarantee. Never select the production mailing audience for a test.
7. **Redis:** the Compose example provides local isolated staging Redis with `noeviction`. Production should use private managed Redis with TLS; configure its URL and access rules before launch. Do not share staging rate-limit state with production.
8. **Secrets Manager:** create `ltc/staging/runtime` as JSON containing the reviewed configuration in section 8. Grant only this environment's instance role access.

Push the reviewed image from your workstation/runner. Set the following to real non-secret resource values:

```bash
LTC_REGION=us-east-1
LTC_ACCOUNT_ID=YOUR_ACCOUNT_ID
LTC_ECR_REPOSITORY=YOUR_REPOSITORY_NAME
LTC_RELEASE=REVIEWED_COMMIT_SHA
LTC_REGISTRY="$LTC_ACCOUNT_ID.dkr.ecr.$LTC_REGION.amazonaws.com"
aws ecr get-login-password --region "$LTC_REGION" | docker login --username AWS --password-stdin "$LTC_REGISTRY"
docker tag "ltc-node:$LTC_RELEASE" "$LTC_REGISTRY/$LTC_ECR_REPOSITORY:$LTC_RELEASE"
docker push "$LTC_REGISTRY/$LTC_ECR_REPOSITORY:$LTC_RELEASE"
```

Record its ECR SHA-256 image digest. Deploy by digest; do not deploy `latest`.

## 8. Configure runtime values without leaking secrets

Create the Secrets Manager JSON locally through its console/editor. Do not paste actual values into this guide or workflow logs.

| Key | Staging value / production rule |
| --- | --- |
| `APP_ENV` | `staging`; production explicitly `production` |
| `PORT` | `8000` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | All from the same confirmed environment project |
| `FRONTEND_URL` | `https://staging.livingthecharge.org`; production canonical HTTPS website |
| `AUTH_REDIRECT_URL` | `https://staging.livingthecharge.org/set-password`; corresponding production path |
| `CORS_ORIGINS` | Exact website HTTPS origin; add `www` only if it actually serves the app |
| `REDIS_URL` | `redis://redis:6379/0` for the staging Compose network; private `rediss://...` for production |
| `TRUST_PROXY_HOPS` | `1` for Nginx directly in front of API; reassess when adding ALB/proxies |
| `SQS_QUEUE_URL` | Environment-specific queue URL |
| `AWS_REGION` | Chosen queue/compute region; needed by AWS SDK |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Sandbox in staging; separate reviewed live configuration in production |
| `STRIPE_API_VERSION` | Reviewed version, initially `2026-08-26.dahlia` |
| `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` | Controlled staging provider and verified sender |
| `ORG_MAILING_ADDRESS` | Real approved organization mailing address |
| `PRIMARY_SUPER_ADMIN_ID` | Stable protected account UUID, reconciled with database policies |
| `PROFILE_IMAGE_BUCKET` | Existing `team-profile-images` unless actual approved configuration differs |
| `STORY_IMAGE_BUCKET` | Existing `story-images` |
| `NEWSLETTER_ASSETS_BUCKET` | Existing `newsletter-assets` |
| `GA4_ENABLED` | `false` initially; optional reporting configured separately |

Supabase redirect allowlists must include the actual set-password/recovery URLs used by the frontend. Check source and actual invite/recovery emails rather than allowing every possible URL. For the first local access exercise, use a separate development configuration; staging/production startup rejects non-HTTPS frontend/CORS values.

Do not set a PostgreSQL migration connection string in the runtime image. Application runtime uses Supabase APIs/RPCs. No AWS static credentials are needed.

For the first manual deployment, create `/etc/ltc/runtime.env` using `sudoedit`, transferring only the verified environment's configuration from your private secret store. Docker env-file format is `KEY=value`, no `export`, no wrapping quotes. Use mode 0600 and owner root. Escape actual multiline GA4 private keys as literal `\n` only if enabling optional reporting; the backend decodes that form.

```bash
sudoedit /etc/ltc/runtime.env
sudo chmod 0600 /etc/ltc/runtime.env
```

Before CI/CD, implement a host-side secret-refresh script: retrieve only the configured secret via the instance role, parse JSON, validate expected keys and project identity, encode values safely for an env file, write a root-only temporary file, atomically replace runtime.env, and log only secret version ID/success. Fail closed on retrieval or validation errors. Test escaping and multiline handling. Do not use `eval`, `source` or `echo` to interpolate secret JSON, and do not print `docker compose config`, `docker inspect` or environment dumps containing credentials.

The root-only env file is still a plaintext host secret; protect EBS, host access and backups accordingly. Secret rotation requires deliberate container recreation and verification.

## 9. Start API, worker and staging Redis with Compose

Create `/opt/ltc/compose.yaml` on EC2. This is a **staging example**; replace the region/log-group names if needed. CloudWatch log groups must exist before startup (section 14).

```yaml
name: ltc-staging
services:
  redis:
    image: ${REDIS_IMAGE:?Set a reviewed Redis 7 image digest}
    command: ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "noeviction"]
    restart: unless-stopped
    mem_limit: 256m
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
  api:
    image: ${APP_IMAGE:?Set the reviewed ECR image digest}
    env_file: /etc/ltc/runtime.env
    ports: ["127.0.0.1:8000:8000"]
    restart: unless-stopped
    mem_limit: 1g
    init: true
    stop_grace_period: 30s
    depends_on:
      redis:
        condition: service_healthy
    logging:
      driver: awslogs
      options:
        awslogs-region: "us-east-1"
        awslogs-group: "/ltc/staging/api"
        awslogs-stream: "ec2-first-host"
        mode: "non-blocking"
        max-buffer-size: "4m"
  worker:
    image: ${APP_IMAGE:?Set the reviewed ECR image digest}
    command: ["node", "dist/src/workers/worker.js"]
    env_file: /etc/ltc/runtime.env
    restart: unless-stopped
    mem_limit: 1g
    init: true
    stop_grace_period: 120s
    healthcheck:
      disable: true
    depends_on:
      redis:
        condition: service_healthy
    logging:
      driver: awslogs
      options:
        awslogs-region: "us-east-1"
        awslogs-group: "/ltc/staging/worker"
        awslogs-stream: "ec2-first-host"
        mode: "non-blocking"
        max-buffer-size: "4m"
```

The image's healthcheck is API-only, so disable it on the worker. A running worker container is not proof of successful processing. Docker restart policy restarts exited processes, not merely unhealthy containers. Non-blocking logs protect request handling but can drop buffered logs during outages; monitor logging failures and do not rely on logs as the financial ledger.

Create `/etc/ltc/release.env` (non-secret deployment pointers, root-owned) with:

```text
APP_IMAGE=YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/YOUR_REPOSITORY@sha256:REVIEWED_DIGEST
REDIS_IMAGE=redis:7@sha256:REVIEWED_COMPATIBLE_DIGEST
```

Resolve and scan the actual Redis tag/digest; placeholder values cannot run. Authenticate **root's Docker client**, since commands below use sudo:

```bash
LTC_REGION=us-east-1
LTC_REGISTRY=YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
aws ecr get-login-password --region "$LTC_REGION" | sudo docker login --username AWS --password-stdin "$LTC_REGISTRY"
sudo docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml pull
sudo docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml up -d redis api
curl --fail --max-time 10 http://127.0.0.1:8000/api/health
curl --fail --max-time 10 http://127.0.0.1:8000/api/ready
```

Readiness verifies Redis plus a basic Supabase query. It does **not** verify all required RPCs, Stripe, Resend, SQS or background-job progress. Complete the approved schema/provider checks before starting the worker:

```bash
sudo docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml up -d worker
sudo docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml ps
```

Create `/etc/systemd/system/ltc.service`:

```ini
[Unit]
Description=LTC container services
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ltc
ExecStart=/usr/bin/docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml up -d
ExecStop=/usr/bin/docker compose --env-file /etc/ltc/release.env -f /opt/ltc/compose.yaml stop
TimeoutStopSec=180

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ltc
```

Do not put image pulls or secret retrieval into an uncontrolled reboot path. Previously accepted work can resume when worker starts; enable boot startup only after its environment and ownership have been verified. Test reboot and a controlled staging worker interruption. Forced stops may leave leases/unknown provider outcomes: reconcile via supported application paths, never reset tables blindly.

For production managed Redis, remove this local Redis service and both `depends_on` blocks, use the reviewed private TLS URL, and confirm the host can reach Redis. Managed Redis security group should accept 6379 only from the API/worker security groups. Do not silently keep local Redis as a production fallback.

## 10. API DNS and Nginx HTTPS

In Namecheap, first check which nameservers are authoritative. **Domain registration at Namecheap does not guarantee its Advanced DNS controls active DNS.** If using another DNS provider, edit records there. Export the existing zone, including TTLs and mail records, before changes.

For staging, add an A record `api-staging` to the EC2 Elastic IP. For production later, add `api` to the production Elastic IP. Do not point staging to a host using production secrets.

Create `/etc/nginx/sites-available/ltc-api` for staging:

```nginx
server {
    listen 80;
    server_name api-staging.livingthecharge.org;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

The trailing-slash webhook route must retain its method/body; no SPA fallback or slash redirect belongs in this proxy. The 25 MiB proxy limit is a starting transport ceiling, not a changed application allowance. Compare it with existing multipart/file limits and test every permitted upload, including overhead; adjust deliberately if an existing valid request is larger. Do not add an aggressive Nginx rate limit that breaks Stripe retry behavior.

```bash
sudo ln -s /etc/nginx/sites-available/ltc-api /etc/nginx/sites-enabled/ltc-api
sudo nginx -t
sudo systemctl reload nginx
```

If a default Nginx site is active, deliberately disable its symlink after inspecting it; do not delete unrelated configuration. Create a default reject-only virtual host if needed so unknown hostnames do not reach the app.

Install Certbot via the [official Nginx instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap). On this Ubuntu host:

```bash
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d api-staging.livingthecharge.org
sudo /snap/bin/certbot renew --dry-run
sudo nginx -t
```

Select HTTP-to-HTTPS redirect. Verify the renewal timer and certificate expiry monitoring. Preserve inbound port 80 for the HTTP validation/redirect approach. Repeat with the production hostname on its separate host only at the approved stage.

Avoid access-log formats containing query strings or authorization values: recovery/submission/unsubscribe URLs may carry tokens. Use normalized routes where possible and restrict logs containing path tokens. Public uptime checks should use `/api/health` or `/api/ready`, never credential-bearing URLs.

**Checkpoint:** `https://api-staging.livingthecharge.org/api/ready` returns JSON/200 with valid TLS; port 8000 is unreachable publicly; HTTP redirects to HTTPS; certificate renewal works; approved CORS preflight succeeds and an unrelated origin is rejected.

## 11. Create globally delivered static hosting

In AWS Console, create a staging S3 bucket with all public access blocked, versioning, encryption and retention of previous assets. Do **not** enable the S3 website endpoint. Create CloudFront using the regular S3 bucket origin and Origin Access Control (OAC); apply the distribution-scoped bucket policy AWS provides.

Request an ACM certificate in **us-east-1** for `staging.livingthecharge.org`, validate its CNAME through authoritative DNS, and attach that alias/certificate to CloudFront. Later create the production distribution/certificate for apex and `www` if both will be supported.

Configure HTTPS redirect and compression. Default HTML/client-route behavior should disable caching or revalidate; `assets/*` should use optimized caching. Public images may cache, but give non-fingerprinted files a bounded TTL and invalidate those changed paths deliberately. Never cache authenticated API responses through the static distribution.

Attach a CloudFront viewer-request Function matching the existing routing contract. This is based on `infra/aws/app.ts`; rerun route tests if changing it:

```javascript
function handler(event) {
  var r = event.request;
  var p = r.uri;
  var asset = /^\/(assets|images)(\/|$)/.test(p);
  var route = /^\/(about|mission|impact|stories|team|donate|donation-success|mentor|login|forgot-password|set-password|reset-password|admin|profile\/submit|unsubscribe)(\/|$)/.test(p);
  if (!asset && !/^\/api(\/|$)/.test(p) && (route || p.indexOf('.') === -1)) {
    r.uri = '/index.html';
  }
  return r;
}
```

Publish the function and associate its LIVE version with the default behavior. Preserve dotted recovery/unsubscribe tokens. **Do not configure blanket S3 403/404 → index.html error responses**: missing assets/API paths must remain errors, not HTML. A private S3 origin can return 403 for a missing object; it must not be treated as a successful SPA asset.

Keep public GA4 collection off. Inspect any new security-header/CSP policy against existing fonts, video, Stripe, media and forms in staging before enforcement; do not break presentation as an incidental hardening change.

[AWS OAC setup](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) and [certificate region requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html).

Upload the frontend artifact from your workstation/runner after building with the actual environment API URL. Example commands, run in `frontend/`:

```bash
LTC_SITE_BUCKET=YOUR_STAGING_BUCKET
aws s3 sync dist/ "s3://$LTC_SITE_BUCKET/" --exclude 'index.html' --exclude 'assets/*' --cache-control 'public,max-age=3600'
aws s3 sync dist/assets/ "s3://$LTC_SITE_BUCKET/assets/" --cache-control 'public,max-age=31536000,immutable'
aws s3 cp dist/index.html "s3://$LTC_SITE_BUCKET/index.html" --content-type 'text/html' --cache-control 'no-cache,max-age=0,must-revalidate'
```

Never add `--delete` during normal releases; old open tabs and rollback need old hashed chunks. Record the index S3 version ID and frontend artifact SHA-256. Invalidate `/` and `/index.html` after release and wait for completion; enumerate changed non-fingerprinted image paths separately. Confirm client-route rewrites serve the new HTML with the configured cache policy.

## 12. Namecheap records and domain cutover

If Namecheap BasicDNS/PremiumDNS/FreeDNS is authoritative, use Domain List → Manage → Advanced DNS. Otherwise change records at the actual authoritative provider. Keep the registrar at Namecheap; moving DNS to Route 53 is optional.

| Record | Host | Target | When |
| --- | --- | --- | --- |
| CNAME | `staging` | Staging CloudFront hostname, e.g. `dEXAMPLE.cloudfront.net` | Staging setup |
| A | `api-staging` | Staging EC2 Elastic IP | Staging setup |
| ALIAS | `@` | Production CloudFront hostname | Approved production cutover |
| CNAME | `www` | Production CloudFront hostname | Only after alias and certificate configured |
| A | `api` | Production EC2 Elastic IP | Production setup; later CNAME to ALB |
| CNAME | ACM-provided validation hosts | Exact ACM-provided targets | Certificate setup; retain for renewal |
| TXT/MX/CNAME | Resend-provided hosts | Exact provider values | Sender verification; preserve unrelated email |

Namecheap supports apex ALIAS records on its supported DNS services. Remove conflicting A/AAAA/CNAME/URL Redirect records **only for the exact host being replaced**, after recording them for rollback. Do not remove MX, SPF, DKIM, DMARC or verification records indiscriminately. Don't publish AAAA records pointing nowhere. [Namecheap ALIAS procedure](https://www.namecheap.com/support/knowledgebase/article.aspx/10128/2237/how-to-create-an-alias-record/).

Use host names, not `https://...` URLs, in DNS targets. If Namecheap's editor automatically appends the domain, enter ACM validation host labels accordingly and verify the resulting full DNS name. Check restrictive CAA records if certificate validation stalls.

If using both apex and www, choose a canonical hostname. Initially both may serve the same site provided certificates, CORS and Auth redirects support them. A canonical redirect is a separately tested infrastructure behavior: preserve tokens/query strings and existing links. Do not use Namecheap masked URL forwarding as a substitute for HTTPS hosting.

Verify from outside EC2:

```bash
dig NS livingthecharge.org
dig api-staging.livingthecharge.org
dig staging.livingthecharge.org
curl -I https://staging.livingthecharge.org
curl --fail https://api-staging.livingthecharge.org/api/ready
```

During production cutover repeat for apex, www if configured, and api. Reduce affected records' TTL in advance where supported, wait out the old TTL, and retain old targets. DNS changes are not instantaneous or a substitute for backward-compatible releases.

## 13. Complete provider and application acceptance on staging

Run only against verified TEST; record commit, role, expected/actual behavior, request ID and evidence. Consult the complete [manual acceptance checklist](infra/docs/manual-acceptance.md).

| Area | Required checks |
| --- | --- |
| Database | Owner-approved metadata verification confirms required RPCs/tables/grants/RLS; missing billing storage is an error, not healthy zero totals. |
| Auth | Login, disabled users, roles, direct API permissions, refresh/logout, invitation/recovery expiry and actual HTTPS redirect emails. |
| Public site | Existing text/photos/crops/fonts/layout and forms preserved; mission/about aliases, deep links and token routes work. Missing assets/API paths never return successful HTML. |
| Stripe | Sandbox one-time/monthly checkout, cancel/expiry/pending, duplicate/out-of-order webhooks, failed installments, partial/full refunds, accurate ledger/privacy. |
| Webhook | Destination is `https://api-staging.livingthecharge.org/api/stripe/webhook/`; raw body/signature survives proxy; destination secret matches this environment. Subscribe to the exact events handled by source. |
| Email | Controlled recipients, correct verified sender, unsubscribe/suppression, frozen newsletters, retry and unknown-outcome handling. Do not equate provider acceptance with inbox delivery. |
| Queue/worker | Real SQS delivery, permissions, lease/visibility behavior, forced restart recovery, duplicate delivery, DLQ and deliberate redrive after reconciliation. |
| Redis | API readiness, distributed limits if using multiple APIs, outage behavior, counter survival expectations and no public Redis port. |
| Uploads | All valid formats/sizes, spoof rejection, failure/replacement/concurrency, reference-safe cleanup and frozen-newsletter asset protection. |
| Admin | Paginated lists/totals, roles/overrides, profiles, stories, mentorship, donations, newsletters, billing/settings and error/empty/loading states. |
| Browser | Mobile/desktop, keyboard/focus, zoom, reduced motion, unsaved drafts and provider outages. |
| Performance | USA plus Africa/Europe/Asia probes, cold/warm loads, API load and a staging soak test; record actual hardware and provider boundaries. |

Use the existing guarded integration harness only after locally verifying its TEST target. Some provider boundaries in that harness are mocked; passing it does not replace Stripe/SQS/Resend/Redis tests. Never run it on production.

Initial performance targets are in [performance.md](performance.md): public LCP ≤2.5s, CLS ≤0.1 and INP ≤200ms as eventual field p75 targets; public API processing p95 <500ms, admin list p95 <1s under a stated workload. Lab results are provisional, not field certification. Do not load-test live donation endpoints.

**Checkpoint:** no unresolved critical auth/payment/data-loss defects; every accepted background job accounted for; actual provider tests and owner public acceptance recorded.

## 14. Put monitoring in place before production

Create an SNS alert topic per environment, subscribe the operations email(s), **confirm subscriptions**, and test delivery. Define who responds and the backup contact. Send alerts to an address you can access even if this platform is down.

Create CloudWatch log groups `/ltc/staging/api`, `/ltc/staging/worker`, `/ltc/staging/host` (and production equivalents), initially 30-day retention. Give the host role stream creation and event write only to these groups. Docker awslogs uses the host role. Use unique stream names containing the instance/release identity when adding hosts.

Install the CloudWatch Agent using [AWS's EC2 instructions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html). Configure memory/disk metrics, Nginx error logs and the selected redacted host/service logs. EC2's standard metrics alone do not provide guest memory and filesystem usage. Do not ship `.env`, private keys, Docker inspect output, raw payment payloads or token-bearing access logs.

Create one dashboard with host, API, queue and provider panels. Start with these thresholds; tune from staging evidence and record changes:

| Signal | Initial alarm / action |
| --- | --- |
| EC2 status checks | Any failed status check for 2 minutes → urgent host recovery |
| CPU / burst credits | CPU >80% for 10 min; low credit balance or surplus-credit charges → investigate/resize |
| Memory | >85% for 5 min → inspect bounded workload/OOM/restarts |
| Disk | >80% for 10 min → review logs/images; never blindly delete release artifacts |
| Public website + API | External HTTPS checks every minute; 3 consecutive failures → urgent |
| Certificate | <21 days remaining → renewal investigation |
| API errors | 5xx >1% over 5 min with ≥20 requests; low traffic uses external probes too |
| API latency | p95 >1s over 10 min, interpreted alongside route/provider mix |
| SQS oldest message | >600s for 2 periods → worker/backlog investigation |
| DLQ visible messages | ≥1 → operator reconciliation, no blind redrive |
| Worker iteration errors | Sustained `iteration_failed` log events → provider/queue/schema investigation |
| Storage cleanup | `storage_cleanup_failed` event or failed cleanup rows → review references/provider failures |
| Stale accepted work | Delivery jobs/recipients or webhook claims beyond reviewed lease/retry windows → investigation |
| AWS cost | Actual 80%/100% and forecast budget breach → notify owner; budget is not an automatic cutoff |

For the single-host Nginx phase, there are no ALB metrics. Derive latency/5xx from the application's structured completion logs using CloudWatch metric filters/extraction or a logs-based dashboard. Test with redacted fixture events first; calculate percentiles only from actual timing samples. Avoid raw URLs as metric dimensions. Error percentage needs both error and request counts. After adding ALB, use target 5xx, healthy-host count and target-response-time metrics as additional signals.

Create CloudWatch Synthetics canaries (or another separately approved uptime service) for the website and API readiness from the USA and at least one overseas region. Check expected HTML/JSON, status and TLS, not merely an open port. Do not put admin credentials, payments or newsletter sends into routine public probes.

The current worker has no successful-work heartbeat metric. Implement a small host timer that reports container running/restart state, plus an approved read-only operational probe of stale jobs/claims. A running container and an empty queue can both coexist with a broken worker. Define schema-aware stale checks using actual leases/statuses; do not invent column names or use production writes as probes. Restrict any probe's credentials/logs; read-only live access still requires owner authorization. Treat missing heartbeat data as failure after the agreed window.

**Alarm rehearsal in staging:** stop API, interrupt worker, place a synthetic failed job into its reviewed failure path, simulate a failed metric, and verify alerts reach the recipient and clear after recovery. Do not deliberately fill production disks or manipulate live queue/data to test alarms. Record detection and response time.

## 15. Add controlled CI/CD after the manual release works

Existing `.github/workflows/backend-ci.yml` runs application checks and a container build with `push: false`. It does not publish or deploy. Preserve its no-migration/no-live-provider behavior.

Implement a separate release workflow in a reviewed follow-up. Its behavior should be:

1. Pull request: tests/lint/type checks/image build only; no privileged deployment credentials.
2. Approved main commit or manual dispatch: run checks, build backend image, scan, push immutable ECR tag, record digest; archive frontend artifacts and checksums.
3. Staging GitHub Environment: obtain short-lived AWS credentials using OIDC, deploy the exact image through a restricted SSM document, upload staging static artifact, and run non-destructive smoke checks.
4. Production GitHub Environment: manual approval, restricted branches, separate role/resources, exact reviewed image digest. Build frontend from the **same commit** with the production API URL; frontend build variables differ between environments, so don't promote staging HTML unchanged.
5. Limit concurrency per environment so releases cannot overlap. Failed checks block promotion; dependencies and secrets are never copied into frontend artifacts.

Use GitHub OIDC with audience `sts.amazonaws.com`, trust restricted to exact repository and GitHub Environment subjects (for example `repo:OWNER/REPO:environment:production`). Grant `id-token: write` only in appropriate release jobs. Restrict environment branches/reviewers; environment protections depend on GitHub plan/repository visibility, so verify availability or retain manual production deployment. [GitHub AWS OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

Separate build/publish and deployment permissions where practical. Deployment role needs only exact S3 prefixes, distribution invalidations, ECR metadata and the selected SSM document/tagged instances. A general SSM shell-command permission is powerful; restrict the document and inputs. Pin third-party workflow actions to reviewed commit SHAs. Never store long-lived AWS access keys in GitHub.

The host-side release command must be implemented and rehearsed before the workflow invokes it. Required algorithm:

1. Acquire a host deployment lock and validate a digest from the expected ECR repository/environment.
2. Record old image digest, frontend index version, secret/config version, queue/scheduler owner and schema compatibility.
3. Retrieve/validate runtime configuration without logging secrets; authenticate ECR using instance role and pull image.
4. For single-host deployment, accept a planned brief API interruption. Pause new newsletter acceptance operationally; disable schedule, stop worker with its grace period, reconcile in-flight ownership.
5. Atomically update release pointers, recreate API, wait with a finite deadline for liveness/readiness plus relevant smoke checks. A successful Compose command is not acceptance.
6. Start the compatible worker, verify actual staging job progress, then upload frontend assets and HTML last. Enable the sole schedule after validation.
7. On failure: stop new worker/schedule, restore previous compatible image/config and HTML; verify recovery and record the incident. Never undo database history or automatically replay unknown provider sends.

Do not expose an internet-facing deployment webhook or run `git pull && npm install` on production. SSM command output must remain free of credentials. Workflow success requires checking the remote command's final exit status, not just successful submission.

## 16. Backups, recovery and routine operations

Set explicit RPO (acceptable data loss) and RTO (acceptable outage) with the charity owner. Record actual restore times; purchasing backups is not testing recovery.

| Item | Backup / recovery |
| --- | --- |
| Supabase PostgreSQL | Verify plan-specific backups/PITR, retention, recovery owner and restore procedure. Restore drill only into an approved isolated TEST target; schema work requires separate approval. |
| Supabase Storage bytes | Separate encrypted object backup plus path/hash/record manifest. Database backups do not include uploaded bytes. |
| Frontend | Versioned S3 index and retained hashed assets; archive exact release artifact. |
| API/worker | Retained ECR digests, release record and source commit. |
| Host | Reviewed configuration/IaC and a tested clean-host rebuild; encrypted EBS snapshots where needed, with restricted secret access. |
| Secrets | Protected secret versions and documented rotation; never a public Git backup. |
| DNS | Export existing/new records, TTLs and previous targets. |
| Queue/work | Retain durable database job/recipient checkpoints; reconcile before redrive. Queue retention is not an indefinite backup. |

[Supabase backup limitations](https://supabase.com/docs/guides/platform/backups).

Rehearse: build a replacement host, apply reviewed config, pull the old compatible image, restore static index, reconnect to TEST services, and demonstrate controlled recovery. Do not restore over production or copy live personal data to a test fixture.

Weekly: review alarms, failed/stale jobs, disk/image growth, spending, provider errors and backups. Monthly: patch host in staging first, refresh audits, review IAM/access, test certificate renewal and a representative recovery drill. Keep Docker, OS and Node updates intentional and compatible; don't auto-upgrade major application dependencies.

Incident sequence: acknowledge → identify impacted workflows → pause unsafe new work → preserve release/log/request evidence → recover compatible code/host → reconcile ledger/unknown deliveries → verify public/admin functions → communicate impact → record corrective action. Availability must never be restored by weakening permissions or deleting financial/audit records.

## 17. Move from one EC2 host to a resilient production design

After the single-host staging exercise, implement EC2-specific CDK resources before production if continuous availability is required. Keep this a reviewed infrastructure change; don't deploy both old Fargate and new EC2 stacks unintentionally.

Recommended target:

- Public HTTPS ALB across two availability zones; ACM certificate in the API region.
- Two API EC2 instances in an Auto Scaling Group, private subnets, one per zone. Target port 8000 permitted only from ALB security group; no Nginx needed in this path. ALB uses `/api/ready` with bounded health checks.
- A separate worker host/group with desired count 1 initially, private subnet, separate least-privilege role, recovery automation and the single authoritative schedule. It still has restart/recovery delays; database leases/SQS checkpoints must preserve accepted work.
- Private managed Redis with encryption/TLS and failover. All API replicas share it.
- Deliberate outbound connectivity through NAT or reviewed endpoint/egress architecture. SQS/ECR/SSM endpoints do not provide internet connectivity to Supabase, Stripe or Resend; retain a working provider egress path. Price NAT/ALB/Redis before provisioning.
- Immutable launch-template versions, pinned AMI IDs and ECR digests, automated bootstrap/config validation, instance refresh and tested rollback. Boot failure must leave the instance unhealthy, not serving partial config.

Do not blindly copy the single-host Compose file: remove local Redis and localhost-only port binding, run only API on API hosts and only worker on worker hosts, update log-stream identity, metadata/roles and network restrictions. Set `TRUST_PROXY_HOPS=1` for direct ALB → API and test forwarded-IP/CORS/rate-limit behavior. Retaining Nginx behind ALB adds a hop and requires a reviewed forwarding configuration.

Switch the Namecheap `api` record from an A record to a CNAME pointing at the ALB hostname after certificate/targets work. Keep the old host available during observation. ALB certificates differ from Certbot host certificates; verify DNS certificate validation/renewal.

Use ASG health checks tied to ALB, instance warmup and a rollout plan that retains healthy capacity. Specify desired launch-template configuration explicitly for instance refresh. Auto rollback has prerequisites and does not roll back data or worker side effects; rehearse with a previous known-good release. [AWS instance refresh rollback](https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html).

Add alarms for healthy API hosts <2, ALB 5xx/latency, failed scaling and worker replacement. Replace an API instance in staging and verify users can still reach the service; also test a worker-host loss. Only then claim the tested availability level.

Kubernetes can be a later learning project. If container orchestration becomes necessary, ECS on EC2 is another path that retains EC2 administration while managing container placement; EKS is not a prerequisite for this charity's global website.

## 18. Production promotion and cutover

Do not promote by changing the staging secret to live. Provision a separate production host/resources, use a distinct secret/queue/bucket and set APP_ENV explicitly. Complete the production schema packet independently and verify its exact current state before starting dependent workflows.

Before switch:

- [ ] Correct registered domain spelling confirmed; staging and production HTTPS certificates valid.
- [ ] All local, container and staging acceptance gates passed with evidence; remaining risks explicitly accepted.
- [ ] Production schema verified and any required exact SQL separately approved/executed by owner; no automatic migrations.
- [ ] Auth URLs, primary account identity, CORS, Storage buckets and permissions match production.
- [ ] Stripe account/API version/live webhook destination/signing secret reviewed; no live payment test performed without separate authorization.
- [ ] Resend sender/DNS and audience controls reviewed; no production newsletter sent as a smoke test.
- [ ] Alarms delivered, backups verified, replacement/rollback tested, operations owner available.
- [ ] Exact Git commit, ECR digest, frontend artifact/index version and config version recorded.
- [ ] Previous live deployment, records and outstanding webhook/email work recorded.

Cutover order:

1. Schedule a window and record a rollback decision point. Freeze incompatible administrative changes as needed.
2. Drain/stop the old newsletter worker and disable its schedule. Establish one owner of accepted work. Reconcile in-flight/unknown deliveries; do not blindly copy queue messages.
3. Start production API with approved compatible schema/config and perform authorized non-destructive checks. Starting it may make public operations available; keep DNS/traffic gated until ready.
4. Move Stripe webhook ownership deliberately, preserving event history and signing-secret correctness. Never run competing non-deduplicating processors. Account for delayed/retried events; provider changes require separately authorized execution.
5. Start production worker only after accepted work and ownership are reconciled. Enable its single schedule.
6. Upload production frontend assets then index; update Namecheap website/API records at the approved time. Verify actual DNS, TLS, redirects, forms, published content and authenticated admin access.
7. Observe closely for at least an agreed 24–48-hour initial window, with longer observation covering actual scheduled/monthly workflows. Check donation ledger/webhook failures, delivery outcomes, queue age, provider outages, costs and overseas access.
8. Keep the previous deployment and artifacts until the owner accepts the observation period. Never delete the legacy reference because a healthcheck passed.

No deployment can guarantee every future failure is prevented. A completed release means known gates passed, monitoring detects problems, owners respond and tested recovery protects data.

## 19. Rollback procedure

Triggers include broken auth, unreliable checkout/webhooks, lost accepted jobs, unsafe permissions, sustained errors or a failed deployment check. Roll back compatible application code, not financial history.

1. Disable new scheduler dispatch and stop the new worker; prevent unsafe new sends and record in-flight work.
2. Restore the previous runtime/config version and ECR digest. Recreate API, verify readiness and the affected workflow without live test writes.
3. Restore the prior S3 `index.html` version and any changed non-fingerprinted assets; retain all required hashed chunks. Invalidate HTML/changed paths.
4. Restore DNS targets only if necessary; cached DNS may still reach either deployment. Keep compatible endpoints available throughout propagation.
5. Reconcile Stripe events/installments/refunds using stored provider IDs. Reclaim leases only through tested application paths. Inspect DLQ and recipient unknown outcomes before replay. Resend's limited idempotency window makes blind replay of old uncertain attempts unsafe.
6. Restart only the reconciled compatible worker/schedule owner. Verify accepted work is accounted for and alerts clear.
7. Record incident, release versions and recovery evidence. A database reversal/restore or removal of schema requires a new exact approval packet; there is no automatic down-migration.

## 20. Troubleshooting and final completion record

| Symptom | First checks |
| --- | --- |
| Nginx 502 | API container state/logs, localhost port 8000, proxy target, startup config errors |
| Readiness 503 | Redis URL/TLS/network, matching Supabase project keys and basic database permissions |
| Readiness 200 but dashboard/payment fails | Missing RPCs/schema compatibility; health is not a complete feature check |
| Worker alive but backlog grows | SQS region/role/queue URL, IMDS credentials, schema, leases, iteration logs and DLQ |
| CORS failure | Exact frontend origin, canonical hostname, HTTPS config, proxy preflight; don't replace with wildcard |
| Stripe signatures fail | Correct destination-specific secret, unchanged raw body, API path/trailing slash, version/event handling |
| Invite link fails | Supabase redirect allowlist, AUTH_REDIRECT_URL, deployed direct-route handling and token preservation |
| CloudFront 403 | OAC/bucket policy/object path, distribution state; do not make bucket public |
| Asset request returns HTML | Incorrect SPA rewrite/error mapping or upload; restore routing contract |
| Certificate pending/renewal fails | Authoritative DNS, complete validation host/CAA, HTTP validation reachability, renewal timer |
| ECR pull fails | Root Docker login, instance role, registry region/digest, outbound network |
| Disk/CPU incident | Rotated logs, retained image policy, bursts/credit balance, memory/OOM and actual workload |

Mark deployment complete only after recording:

- [ ] Website works globally, domain/TLS/DNS correct, public presentation accepted.
- [ ] API/auth/admin/uploads/donations work with the intended environment and permissions.
- [ ] Queue/worker/schedule recovery verified; failed/unknown work is visible and reconciled.
- [ ] CI passes; controlled release promotion and rollback are rehearsed.
- [ ] Host/provider/security/cost alarms reach a real responder.
- [ ] Backups include media bytes; clean-host and isolated restore drills meet recorded objectives.
- [ ] Single-host limitation explicitly accepted or resilient EC2 architecture verified.
- [ ] Commit/image/static/config/schema/DNS identities and all unverified gates recorded.

Keep the filled operational record private. This root guide explains the path; [the existing AWS runbook](infra/docs/deployment-runbook.md) remains useful for application/provider contracts, but its Fargate deployment commands do not implement this EC2 path.
