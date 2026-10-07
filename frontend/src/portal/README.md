# Stakeholder portal

Authenticated stakeholder workspaces will live under `/portal/*` and are separated by role.

```text
portal/
├── layout/
├── student/
│   ├── dashboard/
│   ├── profile/
│   ├── applications/
│   └── mentorship/
├── mentor/
│   ├── dashboard/
│   ├── profile/
│   ├── students/
│   └── mentorship/
├── ambassador/
│   ├── dashboard/
│   ├── profile/
│   ├── institution/
│   └── applicants/
└── institution/
    ├── dashboard/
    ├── profile/
    ├── students/
    └── applications/
```

These boundaries are tracked now, but no fake pages or routes are provided. Portal implementation requires backend identity, role, and mentorship contracts first.
