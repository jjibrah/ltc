# Deploy Living The Charge to AWS

Deploy **staging first**, using the confirmed TEST database and Stripe test-mode credentials. These commands are for the owner to run manually. This guide does not authorize an agent to deploy resources or execute SQL.

The application repository root is `ltc/`. GitHub currently runs checks; it does **not** automatically deploy.

| Part | Hosting |
| --- | --- |
| Public website and admin frontend | Private S3 bucket + CloudFront |
| Node API | ECS Fargate behind an HTTPS load balancer |
| Background worker | Separate ECS Fargate service |
| Jobs | SQS + dead-letter queue |
| Rate limiting | Private Redis |
| Credentials | Secrets Manager |
| Database, Auth, Storage | Existing Supabase |
| Payments and email | Existing Stripe and Resend |

**Review costs before provisioning:** the template creates two NAT gateways, a load balancer, at least three Fargate tasks and replicated Redis. A budget alert does not cap spending.

Production cutover is still gated on database compatibility, provider acceptance, container verification, staging rehearsal and unresolved dependency findings. Read [launch readiness](infra/docs/launch-readiness.md) before deploying.

## 1. Prepare your computer and repository

Publish the standalone `ltc/` repository to GitHub using [the README](README.md). Install Node **24.20.0**, AWS CLI v2 and Docker. Enable Docker Desktop's WSL integration if using WSL, then verify:

```bash
node --version
aws --version
docker version
```

Use Bash and run the following steps in the same terminal so local variables remain available. Start inside `ltc/` (or the root of its fresh GitHub clone):

```bash
LTC_ROOT="$PWD"

cd "$LTC_ROOT/frontend"
npm ci

cd "$LTC_ROOT/backend"
npm ci

cd "$LTC_ROOT/infra"
npm ci
npm run build
```

Review the known dependency findings in the readiness report. Do not use forced major dependency upgrades as an incidental deployment step.

## 2. Configure AWS access

Use an AWS deployment profile with suitable permissions. If using IAM Identity Center:

```bash
aws configure sso --profile ltc-staging
aws sso login --profile ltc-staging

export AWS_PROFILE=ltc-staging
export AWS_DEFAULT_REGION=us-east-1

aws sts get-caller-identity
```

Verify the returned account is the intended staging account. `us-east-1` matches the confirmed TEST database region; confirm the production database region separately. If not using IAM Identity Center, configure the appropriate owner-managed AWS profile instead. Do not use root-account access keys or commit credentials.

Reference: [AWS CLI authentication guidance](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

## 3. Prepare staging domains and HTTPS certificates

Example hostnames, requiring ownership and DNS access:

- Website: `staging.livingthecharge.org`
- API: `api-staging.livingthecharge.org`

In **AWS Certificate Manager**, request and DNS-validate:

- The website certificate in **us-east-1**.
- The API certificate in the chosen API region.

CloudFront requires its ACM certificate in us-east-1. Wait until both certificates are issued, and keep their ARNs locally. The infrastructure references existing certificates; it does not create them or DNS records.

Reference: [AWS certificate requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html).

## 4. Create the staging runtime secret

In **Secrets Manager → Store a new secret → Other type of secret**, create `ltc/staging/runtime` in the API region.

Add these exact keys, with real values entered privately in AWS:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FRONTEND_URL
AUTH_REDIRECT_URL
CORS_ORIGINS
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_API_VERSION
RESEND_API_KEY
RESEND_FROM_ADDRESS
ORG_MAILING_ADDRESS
PRIMARY_SUPER_ADMIN_ID
```

For the example staging hostnames:

```text
FRONTEND_URL=https://staging.livingthecharge.org
AUTH_REDIRECT_URL=https://staging.livingthecharge.org/set-password
CORS_ORIGINS=https://staging.livingthecharge.org
```

Supabase credentials must belong to the confirmed **TEST** project. A PostgreSQL pooler URL alone does not configure the API's Supabase Auth/Storage integration. Use Stripe test-mode credentials and controlled email recipients. Confirm the Stripe API version against the [runbook](infra/docs/deployment-runbook.md) and the actual webhook configuration; do not change the version incidentally.

Configure the Stripe sandbox webhook destination as:

```text
https://api-staging.livingthecharge.org/api/stripe/webhook/
```

Configure the donation events handled by the application, including checkout completion/async success/async failure/expiry, invoice paid/payment failure, payment-intent failure, subscription update/deletion and refund creation/update. Store this destination's signing secret in `STRIPE_WEBHOOK_SECRET`. A local Stripe CLI forwarding secret is not the deployed destination's signing secret.

Redis and SQS URLs are supplied by the infrastructure; do not enter localhost URLs. Copy the complete runtime secret ARN locally. Every injected JSON key must exist or ECS task initialization can fail.

**Never put secrets in GitHub source, frontend variables or chat.** GA4 reporting remains optional and disabled by default; public collection remains off.

## 5. Review infrastructure and create the image repository

From `ltc/infra`, set nonsecret deployment values. Replace every placeholder before running commands:

```bash
cd "$LTC_ROOT/infra"

LTC_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"
LTC_SITE_DOMAIN="staging.livingthecharge.org"
LTC_SITE_CERT_ARN="YOUR_WEBSITE_CERTIFICATE_ARN"

LTC_CONTEXT=(
  --context deployment=LtcStaging
  --context "siteDomain=$LTC_SITE_DOMAIN"
  --context "siteCertificateArn=$LTC_SITE_CERT_ARN"
)

npx cdk synth --app 'node dist/app.js' "${LTC_CONTEXT[@]}"
```

Review the generated templates. Keep the same context values throughout this release. Synthesis creates local artifacts only.

The next commands **create AWS resources and incur costs**:

```bash
npx cdk bootstrap \
  "aws://$LTC_ACCOUNT_ID/$AWS_DEFAULT_REGION" \
  --app 'node dist/app.js' \
  "${LTC_CONTEXT[@]}"

npx cdk deploy LtcStagingFoundation \
  --app 'node dist/app.js' \
  "${LTC_CONTEXT[@]}"
```

Save the Foundation stack's `RepositoryUri` output. Deploy Foundation and publish the image before deploying the application stack; its services cannot start without the selected image.

Reference: [AWS CDK bootstrap documentation](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-bootstrap.html).

## 6. Build and push the API/worker image

Both services use the same image. Replace the repository URI with the Foundation output:

```bash
cd "$LTC_ROOT"

LTC_TAG="staging-20261007-01"
LTC_ECR_URI="REPOSITORY_URI_FROM_FOUNDATION_OUTPUT"

docker build --platform linux/amd64 \
  -f infra/docker/api.Dockerfile \
  -t "ltc-node:$LTC_TAG" .

aws ecr get-login-password --region "$AWS_DEFAULT_REGION" |
  docker login --username AWS --password-stdin \
    "$LTC_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"

docker tag "ltc-node:$LTC_TAG" "$LTC_ECR_URI:$LTC_TAG"
docker push "$LTC_ECR_URI:$LTC_TAG"
```

Use a new tag for every release: the ECR repository uses immutable tags. **Do not proceed if the Docker build fails.** Record the image tag and digest. Container build/start was not verified in the implementation workspace because Docker Desktop WSL integration was unavailable.

Reference: [AWS ECR push instructions](https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html).

## 7. Deploy the application infrastructure

Replace each placeholder; the budget must be a reviewed numeric USD amount:

```bash
cd "$LTC_ROOT/infra"

LTC_RUNTIME_SECRET_ARN="YOUR_STAGING_SECRET_ARN"
LTC_API_CERT_ARN="YOUR_API_CERTIFICATE_ARN"
LTC_ALERT_EMAIL="YOUR_MONITORING_EMAIL"
LTC_MONTHLY_BUDGET="YOUR_REVIEWED_BUDGET_IN_USD"

npx cdk diff LtcStagingMigration \
  --app 'node dist/app.js' \
  "${LTC_CONTEXT[@]}"

npx cdk deploy LtcStagingMigration \
  --app 'node dist/app.js' \
  "${LTC_CONTEXT[@]}" \
  --parameters "LtcStagingMigration:ApplicationEnvironment=staging" \
  --parameters "LtcStagingMigration:ImageTag=$LTC_TAG" \
  --parameters "LtcStagingMigration:RuntimeSecretArn=$LTC_RUNTIME_SECRET_ARN" \
  --parameters "LtcStagingMigration:ApiCertificateArn=$LTC_API_CERT_ARN" \
  --parameters "LtcStagingMigration:AlertEmail=$LTC_ALERT_EMAIL" \
  --parameters "LtcStagingMigration:MonthlyBudgetUsd=$LTC_MONTHLY_BUDGET"
```

Review the approval prompt before accepting. Save these outputs:

- `WebsiteBucket`
- `CloudFrontDomain`
- `ApiDns`
- `QueueUrl`

Confirm the monitoring subscription email. Check ECS service events and CloudWatch logs if tasks fail. Common causes include missing secret keys, a missing image tag, incorrect Supabase credentials and dependency connectivity failures. A failed first rollout is not a healthy rollback baseline.

Reference: [CDK deployment parameters](https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html).

## 8. Connect DNS and publish the frontend

In the DNS provider:

- Point the staging website hostname to `CloudFrontDomain`.
- Point the staging API hostname to `ApiDns`.

Use Route 53 aliases where appropriate, or supported CNAME records for these subdomains. In TEST Supabase Auth settings, configure the staging site URL and allow the `/set-password` redirect. Wait for DNS and HTTPS to work.

Build and upload the frontend:

```bash
cd "$LTC_ROOT/frontend"

VITE_API_URL=https://api-staging.livingthecharge.org \
VITE_GA4_ENABLED=false \
npm run build

LTC_WEBSITE_BUCKET="WEBSITE_BUCKET_FROM_STACK_OUTPUT"

aws s3 sync dist/ "s3://$LTC_WEBSITE_BUCKET/" \
  --exclude "index.html" \
  --exclude "assets/*" \
  --cache-control "public,max-age=300"

aws s3 sync dist/assets/ "s3://$LTC_WEBSITE_BUCKET/assets/" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp dist/index.html "s3://$LTC_WEBSITE_BUCKET/index.html" \
  --content-type "text/html" \
  --cache-control "no-cache"
```

Upload HTML last. **Do not use `--delete`:** retain old hashed assets for existing tabs and rollback. Keep the S3 bucket private; CloudFront's origin access control serves it. Upload only `frontend/dist/`, never `.env`, application source or backend files.

For later releases, invalidate HTML through the CloudFront console. Record the previous index object version and current frontend release. Changing `VITE_API_URL` requires rebuilding the frontend.

Reference: [AWS S3 upload/filter guidance](https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html).

## 9. Verify staging before production

```bash
curl --fail https://api-staging.livingthecharge.org/api/health
curl --fail https://api-staging.livingthecharge.org/api/ready
```

Then complete [manual acceptance](infra/docs/manual-acceptance.md):

- Public pages, images, direct links and existing contact links.
- Login, recovery, permissions and admin navigation.
- Individual/organization pledges and privacy.
- Stripe sandbox one-time/monthly donations, cancellation, pending/confirmed states, refunds and webhook retries.
- Worker recovery, queue/dead-letter behavior and monitoring.
- Mobile/keyboard access and provider failures without invented success or totals.

A passing readiness endpoint alone does **not** prove payment-schema compatibility. Verify current database compatibility through the owner-controlled process in [launch readiness](infra/docs/launch-readiness.md).

**Never execute SQL automatically.** Any required schema work needs exact SQL, SHA-256, exact TEST/PRODUCTION target, effects/risks/verification/recovery, explicit approval and a wait for that approval. These deployment commands do not run migrations. Never use live credentials for staging integration tests, live payments or production newsletters.

## 10. Promote only after acceptance

Repeat the release with:

- Context prefix **`LtcProduction`**, producing `LtcProductionFoundation` and `LtcProductionMigration`.
- A separate production AWS profile/resources/runtime secret.
- Production hostnames and matching certificates.
- Explicit `ApplicationEnvironment=production`.
- The confirmed production Supabase region and separately verified production schema.
- A reviewed release image tag; publish it to the production Foundation repository before deploying services.

Do not reuse the staging TEST secret in production. Schema approval for TEST never authorizes production schema changes.

Before switching public traffic, record database backups/PITR and a separate Storage-object backup, previous image/static/configuration versions and outstanding jobs. Drain/reconcile old newsletter delivery and establish a single payment-webhook/worker/scheduler owner. Do not run old and new non-deduplicating payment processors concurrently.

Keep the previous live deployment available during the observation window. Monitor readiness, API failures/latency, task restarts, payment reconciliation, queue age and dead letters. Process-local metrics are not cross-replica production evidence.

## Rollback

Follow the detailed [deployment and rollback runbook](infra/docs/deployment-runbook.md):

1. Stop/reconcile the new release's worker/scheduler ownership before switching it back.
2. Restore the previous compatible API image/configuration and frontend index version; retain hashed assets.
3. Reconcile payment events and unknown delivery outcomes before redrive.
4. Preserve financial/job/audit records. Never automatically down-migrate, delete rows or restore over live.

ECS deployment rollback requires a previous healthy deployment and does not roll back database changes. SQL recovery cannot restore deleted Storage bytes.

Start with steps 1–4. Do not create the application stack until staging credentials, certificates, database compatibility and the cost review are settled.
