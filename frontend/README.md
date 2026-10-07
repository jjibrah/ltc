# LTC frontend

Canonical Vite/React frontend for Living The Charge.

- `src/site`: public website features
- `src/admin`: implemented staff administration features
- `src/auth`: authentication, session storage, and route guards
- `src/shared`: reusable infrastructure, layouts, hooks, and styles
- `src/app`: providers, application bootstrap, and centralized routing
- `public`: directly served static assets only

Future admin and portal boundaries are tracked without fake pages or public routes. See
`ARCHITECTURE.md` for dependency rules, module ownership, and the implementation sequence.

## Local development

Copy `.env.example` to `.env`, configure the backend and Stripe values, then run:

```sh
npm install
npm run dev
```
