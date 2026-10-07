# Staff administration

The existing authenticated portal lives under `/admin/*`. Routes, permissions, API clients, validation and data remain shared with the existing application contracts.

## Implemented presentation conventions

- Compact admin-only spacing/type tokens in `styles/admin.css`; public styles remain untouched.
- PageHeader supports optional `help` and visible `subtitle`; required instructions, identities, errors and action consequences remain visible.
- PageInfo opens by pointer, touch or keyboard and dismisses with Escape/outside interaction. It makes no requests and stores no preferences.
- Native dialogs isolate background content, contain forward/reverse tab navigation and restore focus. The sandboxed email iframe forwards Escape to its preview dialog.
- Mobile navigation isolates the main content, traps keyboard focus while open and excludes closed links from the tab order.
- Newsletter title/body/uploads remain the existing editor workflow. Save failures retain text, prevent sending, and show a dismissible explanation. The editor returns an internal UI outcome for an unsubmitted send; request formats and validation stay unchanged.
- Existing react-hot-toast feedback is mounted inside the admin shell. Unknown send verification explicitly asks staff to check status before sending again.
- Pagination sits below its own records; amounts use exact formatting and tabular numerals. Counts remain local unless the endpoint supplies a global total.

Current modules: dashboard, newsletters, stories, team profiles/review, mentor requests, donations/pledges, users/permissions, audit, my profile and existing first-login password handling. Planned student, institution, ambassador, subscriber-directory and other future modules were not built.

## Local verification

From `frontend/`:

```sh
npm run lint
npm test
VITE_API_URL=http://127.0.0.1:18080 npm run build
node tests/admin-ui-browser.mjs
```

The browser harness serves the production build locally, intercepts every API request, blocks external traffic and uses synthetic tokens/data. It does not start the backend or access a database, payment or email provider. Set `LTC_CHROMIUM` locally if the installed Chromium binary differs from the harness default. Optional `--dist=/absolute/build/path` and `--output=/absolute/artifact/path` select a frozen build and evidence directory; `--interactions-only` runs focused checks.

For normal frontend development, configure `VITE_API_URL` in `frontend/.env` to your intended local API and run `npm run dev`. No Python is needed. Never paste secrets into chat. This UI work does not authorize any migration or live-provider test.

`admin-ui.test.mjs` fingerprints complete pre-redesign transport expressions and permission checks. The browser suite adds rendered keyboard/dialog/drawer, blocked/unknown send, independent failure, accessible-name and sampled-contrast checks. Source tests are not a substitute for rendered accessibility checks.

## Remaining manual acceptance

Review with communications and operational staff, real screen readers, desktop 200% text/browser zoom, forced colors, long real records and representative latency. The automated zoom capture uses page-scale emulation; it does not certify desktop text zoom or WCAG conformance. Real provider delivery and production data are outside the synthetic harness.

Dashboard shortcuts check destination permissions; this redesign does not grant additional access.

Evidence and detailed results are recorded in the repository-root `admin/implementation.md`. Roll back scoped admin presentation files without resetting the checkout or altering any database.

The sidebar/topbar use admin-only Google Geist, regular navigation labels, background-only selection, a compact desktop rail and breadcrumbs. Geist loading was browser-verified; mobile controls retain touch sizing. Graphite dark mode uses semantic colours. Compact summary strips, table directories and 3:1 editor/support layouts follow the owner's latest direction. Editors preserve supported drafts in memory in the same tab or confirm discard; logout clears them.

Dashboard follow-up adds Billing, Settings, shared deadlines and permission-filtered audit activity. Desktop navigation can collapse from the topbar and remembers the preference locally. Billing visibility uses super-admin role or `donations.view`; all writes require super admin. Shared storage is pending the owner-run migration described in `backend/docs/operations-billing-review.md`. Until installed, unavailable storage is explicit. GA4 reporting is implemented but requires owner configuration per `backend/docs/analytics-setup.md`; public collection stays OFF. Payment recording logs an already-made external payment and never charges a provider.

Latest evidence: 135 full browser states/12 interaction groups, then 18 focused states/11 groups on the final build with actual Geist loading. Reports are under `node_modules/.cache/ltc-admin-verification/release` and `release-focused`. See `infra/docs/launch-readiness.md` for current test results, dependency findings and pending production gates.
