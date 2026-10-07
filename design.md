> Packaging update: the owner subsequently requested this standalone `ltc/` repository. Active `frontend/`, `backend/` and `infra/` paths are relative to this directory. Legacy/reference material stays outside it. Historical layout statements below describe the earlier workspace; see [README](README.md) and [AGENTS](AGENTS.md) for current organization.

# LTC design preservation and admin interface specification

Date: 7 October 2026  
Status: implementation constraints and acceptance specification; no redesign has been performed  
Related plans: [implementation.md](implementation.md) and [performance.md](performance.md)

> DATABASE APPROVAL RULE: Design work never authorizes database changes. The current database is live; the owner will create the test database. Do not apply migrations, bootstrap SQL, index/constraint changes, or resets on any target automatically. Prepare the exact SQL/target/effects/recovery plan and ask the owner for explicit approval before execution. A UI requirement that needs schema support must be reported, not silently implemented against live data.

## 1. Design brief

Preserve the public-facing Living The Charge website's existing content, photographs, branding, page composition, typography, colors, and interactions while the API implementation and repository structure change. Performance work may improve delivery and responsiveness; it must not replace the visible public experience.

Keep the existing React/Vite frontend and public/admin domain separation. Admin work in this release completes migration parity and approved functional reliability corrections; it does not authorize a wholesale visual redesign or every planned program-management module.

Use existing CSS tokens and reusable components. The public website is editorial and mission-led; admin is a focused operational interface. Those areas can retain their existing differences without acquiring a second design system or unrelated component framework.

## 2. Sources of truth and required discovery

Before presentation changes, read `AGENTS.md`, this document, the required `/home/jjibrah/brokefyi-supa-fcking-uiux.md` when available, and relevant installed design skills. Treat the owner's preservation requirement and project tokens as authoritative. If a named local workflow file is unavailable in another environment, report that and follow the repository specification; do not install skills or a loading library without authorization.

Current paths become `frontend/...` after the structural move:

| Source | Current location | Coverage and caveat |
| --- | --- | --- |
| Declared public tokens | `LTC-frontend/src/shared/styles/globals.css` | Brand colors, typography, radius and motion variables |
| Legacy/reset/utilities | `LTC-frontend/src/shared/styles/index.css` | Also defines overlapping variables and body/button rules; loaded after globals |
| Admin surface | `LTC-frontend/src/admin/styles/admin.css` | Scoped admin colors, navigation, lists, cards, dialogs |
| Auth surface | `LTC-frontend/src/auth/auth.css` | Existing auth colors, backgrounds, card and form styling |
| Tailwind configuration | `LTC-frontend/tailwind.config.js` | Content paths; checked-in config does not explicitly disable preflight |
| Component conventions | `src/admin/components/AdminPrimitives.jsx`, shared layouts, site components | Existing interactions/layout behavior; inspect before extracting or replacing |
| Motion | Framer Motion dependency, `ScrollReveal`, `useScrollReveal`, CSS transitions, carousel timers | Several independent mechanisms; reduced-motion behavior needs actual verification |
| Router | `src/app/router/*Routes.jsx` | Public, auth, admin and planned portal boundaries |
| Tests | Existing backend tests and frontend build/lint scripts | No frontend browser test suite was found in the audit; manual visuals remain necessary |

A source declaration is not proof of the rendered value. The audit found globals/index cascade conflicts and existing admin/auth values outside the documented radius/shadow rules. Capture the rendered baseline before consolidating. Do not silently change the public site by declaring globals alone authoritative and deleting effective overrides.

Document gaps in spacing, typography scale, semantic feedback colors, focus styling, z-index, and motion tokens. Introduce only justified tokens for approved touched surfaces; do not spread new arbitrary values throughout components.

## 3. Declared tokens and preservation policy

The following are declared in globals.css; verify actual computed values per surface:

| Token/role | Declared baseline | Rule |
| --- | --- | --- |
| Primary | `--color-primary: #1F3A6E` | Existing navy brand identity |
| Secondary | `--color-secondary: #D4A96A` | Existing warm gold; do not replace with a generated palette |
| Accent | `--color-accent: #E8593C` | Existing coral; do not make every action use it |
| Blush | `--color-blush: #D9C4C4` | Existing secondary surface/accent usage |
| Background | `--color-bg: #F7F7F5` | Preserve actual public surface appearance |
| Deep background | `--color-bg-deep: #1A1A2E` | Preserve existing dark areas |
| Main text | `--color-text: #1C1C1C` | Existing text role |
| Muted text | `--color-text-muted: #6B6B6B` | Verify contrast against actual rendered background |
| Border | `--color-border: #DDDCD7` | Subtle surfaces and separation |
| Serif headings | `--font-primary: Times New Roman, Times, serif` | Preserve actual use; several existing headings intentionally use Inter |
| Secondary serif | `--font-secondary: Cormorant Garamond, serif` | Preserve existing secondary styles |
| Body | `--font-body: Inter, sans-serif` | Preserve weights, metrics, wrapping, and spacing |
| Radius | globals declares small/medium/large as 4px | index.css overrides them; do not globally normalize during migration |
| Motion | globals declares 0.2s/0.4s curves | index.css and components override some; preserve baseline, reduce only for a justified touched interaction |

Existing admin tokens include `--admin-primary`, `--admin-navy`, `--admin-surface`, `--admin-surface-muted`, `--admin-border`, `--admin-ink`, and `--admin-muted`. Reuse their role mappings; future feedback colors should become named semantic tokens with verified contrast rather than isolated hardcoded colors.

New or deliberately restyled admin cards/action buttons follow the project maximum 4px radius and flat border treatment. Badges/search controls may use the permitted pill shape. Existing public radii/shadows remain baseline unless a specific public appearance change is authorized. Do not impose admin geometry on preserved public pages.

The repository says Tailwind preflight should be disabled, while the current config does not show that setting. Audit the effective reset and flag this inconsistency. Switching preflight or changing global reset is a deliberate compatibility change requiring visual evidence; never use it as incidental cleanup.

## 4. Public-site preservation inventory

Capture full-page and key-state screenshots on the existing build before switching endpoints. Use the same fixtures and wait for the same loading/font/image state in before/after comparisons.

| Route/surface | Preserve and verify |
| --- | --- |
| `/` | Hero photographs/order/crops/overlays, headline/body copy, CTA labels, section order, editorial spacing, video and footer |
| `/about` and `/mission` | Existing shared page and alias, all mission text, images, sections and links |
| `/impact` | Existing impact content, calculator formulas/controls/results, page composition and imagery |
| `/stories` | Story cards, ordering, publication rules, excerpts, portraits, modal formatting and navigation |
| `/team` | Hero crop/overlay, department filters, leadership/wider-team grouping, card ordering, bios/portraits/modals |
| `/donate` | Campaign content, photograph, tiers/forms/modals, verified progress, supporter consent and pledge presentation |
| `/donation-success` | Payment verification states and existing navigation; no premature success claim |
| `/mentor` | Existing mentorship text/form/options, validation and submission behavior |
| `/profile/submit/:token` | Valid/expired/revoked link states, profile fields, portrait controls and submission feedback |
| `/unsubscribe/:token` | Existing unsubscribe outcome and link behavior |
| Shared navbar/footer | Logo, link labels/targets, desktop/mobile navigation, sticky behavior, email capture and footer copy |
| Donation/pledge/team/story modals | Trigger behavior, content, scroll locking, close actions and keyboard behavior |

Preserve SEO title/description/canonical behavior, favicon, robots and sitemap paths, external links, and auth/public URL compatibility. Do not copy stale sample content over actual published content when changing data sources. Do not seed production with fixtures.

Optimized image variants must depict the same source photo with the same focal point/crop and acceptable quality. Keep the full-size source safely available for future edits. Content changes, image substitutions, new section layouts, generated imagery, animations, or rebranding require separate scope.

## 5. Admin release boundaries and navigation

The existing admin navigation has Overview, Fundraising, People, Communications, Content, and Security groups plus My profile/Logout. Preserve familiar destinations and permission-based visibility. Keep one sidebar and one primary page-content area; avoid nested shells or unnecessary wrappers.

Existing functional release inventory:

| Surface | Minimum migration/parity requirement |
| --- | --- |
| Dashboard | Verified aggregates, pending review counts, content overview, permission-valid quick actions, last-updated/error handling |
| Users and permissions | Search/filter/page users; invitation lifecycle; roles/defaults/overrides; account detail/status/activity; protected actions and reasons |
| Team profiles | Directory/filter/order, submission links, review/edit, publish/unpublish/reject/request changes, deletion and audit visibility |
| Newsletters | List, compose, autosave, banner/attachments, safe preview, durable immediate send, honest status/failure feedback |
| Mentor requests | Search/filter/page applications, complete details, permission-controlled status review and failure recovery |
| Donations and pledges | Ledger listing, accurate independent summaries, restricted manual entry, publication consent, separate pledge authorization/data states |
| Stories | Draft/edit/photo/preview/order/publish controls; current formatting and deletion workflow |
| Audit log | Paginated history/details, readable actor/action/date/target, authorization, empty/error states |
| My profile | Existing linked profile and password-management behavior |
| Login/recovery/invitation pages | Current links/flows, field validation, session checking, useful expiry/retry behavior |

The existing user-detail component is disconnected by a redirect; present and fix that intended route as an explicit functional correction within the approved migration. Do not remove it to simplify the router. Access must reflect backend rules rather than a sidebar-only permission decision.

Subscriber management and scheduled newsletters have incomplete UI/contracts. Their complete specifications are below for planning, but adding them is not automatically required to replace FastAPI. If included in the approved release, implement/test both UI and backend contract; otherwise report the gap and keep unsupported controls unrouted.

## 6. Detailed admin interaction requirements

### Common page structure

- Clear title and short task-focused description; one obvious primary action where appropriate.
- Relevant filters/search next to a result count and pagination. Counts distinguish filtered/page counts from global totals.
- URL-preserved list/filter/page context when beneficial, with stable browser back/forward behavior.
- Table/grid uses existing patterns; primary identity and status appear before secondary detail/actions.
- Details expose complete values and timestamps; long emails/IDs/messages wrap or offer accessible full-value inspection/copy.
- Buttons remain identifiable at narrow widths; critical actions are never available only on hover.
- No decorative KPI/chart unless its data and meaning are established. Do not populate unavailable reports with invented numbers.

### Users and authorization

Show name, email, role, status, invitation/activation state, and relevant activity. Details include effective inherited/explicit permissions, reasons, and account history. Distinguish a role label from actual permission grants. Check super-admin-only operations against backend policy; a custom UI permission must not promise an operation rejected by role restrictions.

Invitation UI must show sent/pending/expired/revoked outcomes accurately. Avoid misleading language about passwords: a recovery link is not a regenerated password. Show reasons/confirmation for sensitive role, status, override, and deletion actions. Protected-account rules come from consistent server state/configuration, not a different hardcoded email in each screen.

### Profiles and stories

Preserve field validation and preview order. Explain pending/rejected/changes-requested/publication states. Review notes should be available to the appropriate user. Image previews are temporary until save succeeds; failed uploads must not look committed. Reordering provides keyboard move controls and pending/error recovery alongside drag behavior.

Story preview renders sanitized formatting consistent with the public modal. Draft visibility is server-enforced. Destructive asset/record actions are confirmed and cannot leave a publicly referenced image broken.

### Donations and pledges

Display settled payment totals derived from ledger data, date range, currency, successful installments, and refund treatment. Do not call checkout attempts money raised or pledges money received. Include source/reference/privacy fields where the existing API provides them. Restrict manual recording to authorized roles and require a clear historical-payment context.

Donation and pledge failures must remain independent. Preserve anonymity/publication consent; do not automatically reveal a donor because an admin changes status. Formatting uses existing locale/currency conventions, with exact amounts and understandable timezone labels. Numeric columns align consistently with tabular numerals where supported.

### Newsletters and subscribers

Autosave has observable saving/saved/failed/unsaved states. Preserve draft text after errors and coordinate saves so older responses cannot overwrite newer typing. Flush/confirm saved content before sending; failed save blocks send and gives a recovery path.

Preview is sandboxed and does not execute content scripts. Attachments list filename/type/size/upload outcome; unsupported sent attachments must not be described as delivered. Sending shows accepted/progress/failed/partial outcomes, with provider acceptance distinguished from confirmed recipient delivery. Closing a modal or navigating away must not cancel a durably accepted server job.

If scheduling is approved, include explicit timezone, scheduled timestamp, cancel/reschedule restrictions, audience/content snapshot rules, and late/failed status. If subscriber management is approved, provide search/status/source filters, pagination, consent history, unsubscribe/suppression handling, and controlled import/export without silently resubscribing people.

### Audit and system feedback

Record actor/action/target/time/reason clearly; retain identifiers/history after user deletion. Expose raw technical diagnostics only to operators. End-user error text should identify a useful next action; logs carry detailed request IDs, not credential-bearing links.

## 7. State and accessibility contract

For every touched asynchronous surface:

| State | Required behavior |
| --- | --- |
| Initial loading | Reserve final layout with a meaningful indicator; never a blank page |
| Refreshing | Retain useful previous content, mark pending/stale state, avoid full-page flashing |
| Empty | Explain no records versus no filter matches; offer a relevant permitted action |
| Error | Clear message and retry/back/recovery; distinguish denied access from provider outage |
| Disabled | Explain why when needed; retain labels and focus/keyboard behavior appropriately |
| Saving | Prevent duplicate submissions, retain entered values, preserve relevant focus |
| Saved/success | Confirm only committed state; announce without stealing focus |
| Partial/unknown outcome | Explain verification/recovery; never imply completion or automatically repeat irreversible work |
| Offline | Retain draft/context; provide bounded retry and safe reconnection behavior |

Reuse existing primitives and approved packages. Do not install a spinner/skeleton/component library merely because a skill mentions it. Loading presentation and backend state triggers must be reviewed separately.

Accessibility target for touched surfaces is WCAG 2.2 AA, with keyboard and screen-reader verification. Requirements:

- Native buttons/links/forms; descriptive accessible names for icon-only controls; meaningful image alt text and decorative-icon handling.
- Visible keyboard focus, sensible tab order, and focus that is not entirely obscured by sticky headers, sidebars, or footers. Fully unobscured focus is a stronger preferred outcome; do not mislabel an enhanced AAA rule as AA.
- Visible keyboard focus, sensible tab order, and focus that is not entirely obscured by sticky headers, sidebars, or footers. Fully unobscured focus is a stronger preferred outcome; do not mislabel an enhanced AAA rule as AA. See [W3C focus visibility guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- Dialogs have a name, controlled initial focus, focus containment, Escape behavior, background interaction control, scroll handling, and focus restoration to the trigger.
- Table structure is semantic with column labels and text status indicators; meaning is not color alone.
- Forms have persistent labels, correct autocomplete/password semantics, inline field errors and accessible error summaries where useful.
- Verify rendered contrast: normal text at least 4.5:1, large text at least 3:1, and relevant non-text controls/focus cues at least 3:1. If a preserved public combination fails, report the precise conflict and obtain approval for a visual correction rather than silently recoloring.
- Verify rendered contrast: normal text at least 4.5:1, large text at least 3:1, and relevant non-text controls/focus cues at least 3:1. If a preserved public combination fails, report the precise conflict and obtain approval for a visual correction rather than silently recoloring. See [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Support zoom and reflow, long text, keyboard-only usage, and touch. Prefer approximately 44px touch areas for key actions, while verifying applicable AA target-size criteria/exceptions instead of claiming every existing 44px requirement is an AA mandate.
- Support zoom and reflow, long text, keyboard-only usage, and touch. Prefer approximately 44px touch areas for key actions, while verifying applicable AA target-size criteria/exceptions instead of claiming every existing 44px requirement is an AA mandate. See [W3C minimum target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Destructive operations require a clear confirmation/reason or a tested undo where appropriate; financial/permission actions retain appropriate confirmation.

## 8. Typography, responsive layout, and motion

Preserve public font files, weights, actual face selection and wrapping. Do not switch serif headings, introduce a different body font, or reset all heading styles while moving folders. Existing Inter heading exceptions remain. Changes to font loading must retain visual metrics and avoid layout jumps.

Admin forms/tables prioritize readable, consistent text rather than tiny dense labels. Use tabular figures for changing metrics/financial columns, right-align numeric columns, and keep full values accessible. This follows [Craft tabular-number guidance](https://craft.gustavofior.com/tabular-numbers); it does not require replacing the font.

Test at 320, 375, 768, 1024, and 1440 CSS pixels, plus 200% zoom. Public layouts retain current breakpoints; add only necessary repairs backed by comparison. Admin sidebar collapses with an accessible trigger/backdrop, scrolling tables stay within their region, form columns stack, and dialogs fit without clipping primary actions. Do not force global sideways scrolling or hide records to fit.

Prefer shallow component/DOM structure and existing primitives. Keep load-bearing positioning, overflow, isolation, and transforms when removing wrappers. No backend/routing rewrite should be hidden inside a presentation-only commit.

For new/touched admin interactions, keep frequent actions immediate and subtle; occasional spatial transitions may use existing motion tokens. See [Craft hover-restraint guidance](https://craft.gustavofior.com/hover-restraint). Nested corners should respect existing outer radius and inset; project 4px limits remain authoritative rather than importing demo radii.

Reduced-motion handling must stop unnecessary carousel autoplay/reveal transforms and expose content immediately. Loading state remains understandable without perpetual spinning. Do not merely slow animation and label that a complete reduced-motion treatment. Retain the ordinary public experience for users who have not requested reduced motion.

## 9. Future complete-admin roadmap: separate scope

These modules describe the broader platform discussed by the owner. They are planning items, not instructions to build during the backend transition or to create empty navigable routes.

| Planned module | Future page/workflow requirements |
| --- | --- |
| Donor directory | Contact/history/preferences, recurring support, anonymity/consent, permission-controlled notes |
| Campaign management | Goals, dates/status, related donations, verified public progress and supporter moderation |
| Endowment/funding | Recorded fund movement, approved allocations/disbursements, supporting evidence and reconciliation; confirm accounting ownership |
| Students/internships | Student/institution records, application decisions, placement, funding, mentor assignment, milestones/documents/outcomes |
| Institutions | Partner contacts, agreements/status, students and placement relationships |
| Mentor relationships | Availability/expertise, assignment, contact/follow-up, activity tracking beyond application review |
| Ambassadors | Applications, approvals, institution/region, activities/referrals and reporting |
| Subscriber directory | Existing backend integrated into a complete UI with source/consent/suppression and paginated management |
| Newsletter scheduling | Reviewable schedule/cancel/reschedule and durable delivery workflow |
| Media library | Files/optimized variants/alt descriptions, usage references and safe replacement/deletion |
| Reports | Verified donations/campaign/subscriber/student/funding reports with controlled exports |
| Settings/system health | Organization settings, integration health, failed-job recovery and operator visibility; no browser secrets |
| Enhanced account security | MFA/session management after a separately scoped identity/security decision |

Each added module requires approved business rules, real API contracts, permission codes, synthetic test data, and owner-approved SQL if schema changes are needed. UI need is never permission to migrate the live database.

## 10. Visual/manual acceptance and evidence

Capture before/after pairs for every public route and affected state, using identical viewport, data, scroll position, font readiness and image readiness. Pixel differences from antialiasing can be explained; changes in wording, crop, spacing, type scale, layout, CTA hierarchy, or hidden content need explicit review.

Run these checks:

- [ ] Public text, images, section order, logo, colors, fonts, spacing and interactions match baseline.
- [ ] Hero optimization preserves crop/overlay/quality and correct mobile source selection.
- [ ] Public deep links, alias routes, modals, forms, calculator, donation verification, unsubscribe and submission links work.
- [ ] Admin navigation/routes match authorized operations; no empty future modules are exposed.
- [ ] Lists and numeric summaries remain accurate past the first page, with privacy/permission boundaries preserved.
- [ ] Loading/refresh/empty/error/offline/disabled/partial outcomes are distinguishable and recoverable.
- [ ] Keyboard/tab/focus/dialog restoration, touch, zoom/reflow and reduced-motion scenarios are verified.
- [ ] Long names/emails/bios/amounts do not clip essential values or actions.
- [ ] Public/auth/admin CSS changes have isolated effects; consolidation did not silently change computed styling.
- [ ] No new palette, font, library, generated photo, or public layout was introduced without authorization.
- [ ] No design task caused an automatic DB migration or live test-data write.

The implementing AI reports changed presentation files, preserved baseline evidence, intentional functional corrections, token additions/conflicts, tested states/viewports, and unverified areas. Static source review is not visual verification. The owner performs final manual testing; unresolved accessibility/design conflicts remain explicit rather than being dismissed or quietly changed.
