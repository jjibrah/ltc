# Shared infrastructure

Only code reused across multiple domains belongs here.

- `api`: HTTP infrastructure, endpoint constants, and normalized errors.
- `components`: genuinely reusable UI primitives and feedback components.
- `hooks`: cross-domain hooks.
- `layouts`: current public/global layouts. Admin and portal shells stay in their domains.
- `permissions`: reusable permission primitives once backend role contracts exist.
- `styles`: global design foundations.
- `utils`: domain-neutral helpers.

Feature-specific components such as donation forms, newsletter editors, mentor dashboards, and student cards remain in their owning modules.
