# LTC frontend architecture

`frontend/` in the standalone `ltc/` repository is one Vite application with three deliberately separated experiences.

## Runtime areas

| Area | Source | URL scope | Audience |
| --- | --- | --- | --- |
| Public website | `src/site` | `/`, `/about`, `/stories`, etc. | Everyone |
| Staff administration | `src/admin` | `/admin/*` | Authorized LTC staff |
| Stakeholder portal | `src/portal` | `/portal/*` | Students, mentors, ambassadors, institutions |

All three areas share application providers, authentication infrastructure, the API client, design foundations, and reusable primitives. Feature-specific components and API calls stay inside their domain.

## Dependency direction

```text
app -> site | admin | portal | auth | shared
site -> shared
admin -> auth | shared
portal -> auth | shared
auth -> shared
shared -> third-party packages only
```

Domains must not import implementation files from another domain. If multiple domains genuinely need something, extract the smallest reusable part to `shared`.

## Module shape

Create files only when a feature is implemented. A mature feature can use this shape:

```text
feature/
├── FeaturePage.jsx
├── components/
├── hooks/
├── feature.api.js
├── feature.permissions.js
└── feature.utils.js
```

Small features should remain small; these subfolders are not mandatory.

## Routing and access

- `src/app/router/publicRoutes.jsx` owns public website routes.
- `src/app/router/authRoutes.jsx` owns login and recovery routes.
- `src/app/router/adminRoutes.jsx` owns protected staff routes.
- `src/app/router/portalRoutes.jsx` will own protected, role-specific stakeholder routes.
- Unimplemented admin and portal modules must not be registered as routes.
- Frontend guards improve navigation and UX, but backend permissions remain authoritative.

The current backend exposes staff/admin permissions but does not yet provide the student, mentor, ambassador, and institution role claims needed for portal authorization. Portal route registration must wait for that contract.

## Layout boundaries

- The public website currently uses `src/shared/layouts/Navbar.jsx` and `Footer.jsx`.
- Staff pages will use `src/admin/layout` when the admin shell is separated from the existing dashboard.
- Stakeholder pages will use `src/portal/layout` for shared portal navigation; role-specific navigation belongs to the applicable role module.

## Static assets

- `public/` contains directly served static assets only.
- `src/assets/` contains assets imported by React.
- React pages and components never belong in `public/`.

## Planned implementation sequence

1. Separate the existing admin dashboard into an admin layout plus story and newsletter routes.
2. Add backend user-role and current-user contracts.
3. Extend the auth provider with current-user and role information.
4. Implement role-aware guards.
5. Build mentorship APIs and the mentor/student portal modules.
6. Add ambassador and institution modules only when their backend contracts exist.
