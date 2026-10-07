# Frontend/backend integration boundary

## Audited backend routes

The Node.js migration preserves these backend contracts and the frontend has
service-layer mappings for them:

- `POST /api/auth/login/`, `POST /api/auth/refresh/`
- `POST /api/auth/forgot-password/`, `POST /api/auth/set-password/`
- `GET|POST|PATCH|DELETE /api/admin/stories/`
- `GET|POST|PATCH|DELETE /api/admin/newsletters/`
- `POST /api/admin/newsletters/:id/banner/`
- `POST|DELETE /api/admin/newsletters/:id/attachments/`
- `GET /api/admin/newsletters/:id/preview/`
- `POST /api/admin/newsletters/:id/send/`
- `GET /api/admin/newsletters/:id/status/`
- `GET /api/admin/subscribers/count/`

The application remains on the mock data source while frontend workflows are
being designed. Selecting API mode must be an explicit integration step.

The current application runs with `VITE_DATA_SOURCE=mock`. React pages consume domain services; mock services provide local development data and API services can later implement the same methods.

## Frontend responsibilities

- Render UI and manage local presentation state.
- Perform client-side validation for useful feedback.
- Display normalized service responses and errors.
- Provide loading, empty, error, and success states.

## Backend responsibilities

Authentication, authorization, password hashing, temporary credentials, invitation tokens and TTL enforcement, database persistence, profile approval security, file validation/storage, email delivery, newsletter sending/scheduling, rate limiting, and audit logs must be server-side.

## Suggested integration order

1. Authentication
2. Users
3. Team Profiles
4. Profile Submission Links
5. Public Profile Submission
6. Mentors
7. Newsletter Subscribers
8. Newsletter Drafting/Scheduling
9. Stories
10. Dashboard aggregation

## Suggested contracts

These are proposed contracts, not implemented endpoints.

| Domain | Operations |
| --- | --- |
| Users | `GET /api/admin/users`, `GET /api/admin/users/:id`, `POST /api/admin/users/invitations`, `PATCH /api/admin/users/:id`, disable/enable actions |
| Team profiles | `GET/PATCH /api/admin/team-profiles/:id`, approve, publish, request-changes, reject, unpublish actions |
| Submission links | `POST/GET /api/admin/profile-submission-links`, `GET /api/profile-submission-links/:token`, revoke action |
| Public submission | `POST /api/profile-submissions` |
| Mentors | list/detail/status operations under `/api/admin/mentors` |
| Newsletter | subscribers, drafts, schedules, and send operations under `/api/admin/newsletters` |
| Stories | existing list/detail CRUD contract via `storiesService` |

API DTOs should be mapped to frontend models at the service boundary. The mock implementation must never be treated as a security boundary: localStorage passwords, frontend tokens, frontend TTL checks, and client-side authorization are development-only.
