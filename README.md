# Living The Charge (LTC)

Living The Charge helps talented Kenyan students access internships and professional experiences by covering costs such as transport and meals. It brings together donors, mentors and supporters to make these opportunities accessible regardless of a student's financial circumstances.

This project is LTC's website and administration platform.

## What it does

- Shares the mission, team and student stories.
- Lets supporters donate, pledge, apply to mentor and subscribe to updates.
- Gives authorized staff tools to manage content, donations, newsletters and user access.

## For developers

| Folder | Purpose | Technology |
| --- | --- | --- |
| `frontend/` | Public website and admin portal | React, Vite |
| `backend/` | API and background email worker | Node.js, TypeScript |
| `infra/` | AWS infrastructure and deployment configuration | AWS CDK, Docker |

Supabase provides authentication, PostgreSQL and media storage. Stripe handles donations, Resend sends email, and Redis/AWS SQS support rate limiting and background jobs.

Use Node **24.20.0** and run `npm ci` in each application folder. Configure local environments using the [backend](backend/.env.example) and [frontend](frontend/.env.example) examples. Use confirmed TEST services for development; keep credentials out of Git and the frontend.

## Setup and deployment

- [EC2 deployment guide](AWS-EC2-DEPLOYMENT-GUIDE.md): server setup, domain, Docker, CI/CD, monitoring and recovery.
- [Launch readiness](infra/docs/launch-readiness.md): completed checks and remaining release requirements.
- [Manual acceptance](infra/docs/manual-acceptance.md): workflows to verify before launch.
- [Contributor instructions](AGENTS.md): project rules and database safeguards.

**Status:** implementation and verification are in progress. Production launch is not yet cleared. Database changes require separate approval and never run automatically.
