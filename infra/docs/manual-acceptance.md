# Owner manual acceptance

Use the confirmed TEST project, test-mode payment credentials and controlled recipients. Record role, route/state, expected/actual outcome, request ID, device/viewport and pass/fail. Never use live credentials or reset/truncate a database. Schema changes require exact packet/target approval.

- Verify public routes, about/mission alias, direct links/back/forward, unchanged text/photos/crops/fonts/colors/spacing and all public modals/forms/calculator/carousel/video.
- Compare Team responsive variants against the original photograph on mobile/desktop. Test real font/video loading; automated captures blocked these external services.
- Check login/wrong credentials, recovery/invitation expiry/revoke, refresh/logout, concurrent tabs and temporary provider outage. Operator test credentials are local in backend/.env.
- Exercise super_admin/admin/staff/viewer and custom grants/denials with direct API requests, not only navigation. Reconcile protected-account stable IDs with retained database policies before production.
- Test users/detail/invitations/roles/overrides/audit; team profiles/submission links/image uploads/review/publish/order; stories/drafts/uploads/preview/publication; mentorship and subscription/unsubscribe.
- Create enough synthetic records to pass multiple pages in each admin list. Verify search/status/role/department filters across pages, context recovery, no stale response replacement, and global donation totals independent of the current page. Module-access filter is currently explicitly page-local; directories beyond the existing 200-profile reorder contract need further review.
- Test newsletter ordered autosave, failed save blocking send, sanitized sandboxed preview, bounded banner/attachments, suppression, frozen snapshots, duplicate delivery claims, API/worker restarts, queue outage/recovery, DLQ and unknown provider outcomes. Provider acceptance is not delivery confirmation.
- Use Stripe sandbox to test one-time/monthly checkout, cancellation/expiry, pending verification, slow/duplicate/out-of-order webhooks, failed installment, partial/full refunds, restricted historical donation and supporter consent.
- Test keyboard/focus/dialog restoration, 320/375/768/1024/1440 widths, 200% zoom, reduced motion, long text, loading/empty/error/offline/disabled/partial states. Do not claim WCAG or complete visual acceptance from static source checks.
- Run actual Redis distributed protection, SQS redrive/visibility, container health/graceful shutdown and rolling deployment rehearsal only in isolated staging. Docker/SQS/Redis live checks are pending here.
- Measure cold/warm browser loads, transfer graph, LCP/CLS and interactions, API processing separately from network time, load/soak and regional probes. Initial budgets remain those in performance.md; no field p75 or global p95 success is claimed.
- Review npm audit findings without forced frontend dependency changes; configure alarms/budget and backup/restore owners; verify compatible release rollback before cutover.

Settings and service Billing were subsequently owner-authorized. Verify shared billing on confirmed TEST only after separately approved manual SQL: finance read-only, super-admin edits/payment recording, stale edits, duplicate replay, actual deadlines/currency separation and history after an uncertain result. Payments here record already-paid provider bills; they never charge a provider. Verify the collapsible sidebar, Geist, both themes, readable empty states, editor draft restoration/discard and logout cleanup.

GA4 setup/reporting was subsequently authorized, with public collection explicitly OFF. Verify the independent reporting panel, not-configured/error/valid-empty/limited states and read-only service-account access after local owner configuration. No consent UI or collection is approved in this release. See analytics-setup.md and launch-readiness.md.

Future subscriber UI, newsletter scheduling, students/institutions/ambassadors/fundraising modules remain outside this migration.
