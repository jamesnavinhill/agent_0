# AGENTS

This file guides automated agents working in this repo.

## Project Name

Komorebi.

## Source of Truth

Use the docs in `docs/` (uppercase filenames). If there is a mismatch, defer to the code.

## Setup Checklist

1. Install dependencies with `pnpm install`.
2. Copy `.env.local.example` to `.env.local` and set `GOOGLE_API_KEY`, `DATABASE_URL`, and `CRON_SECRET`.
3. Run `pnpm run db:migrate` to apply `lib/db/schema.sql`.
4. Seed tasks by running these commands:

```bash
pnpm run db:seed:morning-read
pnpm run db:seed:media-task
pnpm run db:seed:motion-art
pnpm run db:seed:morning-ritual
```

## Key Directories

- `app/` for Next.js routes and API endpoints.
- `components/` for UI.
- `lib/` for agent logic, scheduler, and API wrappers.
- `scripts/` for migrations and seeds.
- `public/` for local media storage.

## Scheduling

- Server cron endpoint: `GET /api/cron` with `Authorization: Bearer <CRON_SECRET>`.
- Local Windows scheduler uses `scripts/run-cron.ps1` or `scripts/run-cron.vbs`.

## Data and Media

- Database: Neon Postgres, schema in `lib/db/schema.sql`.
- Media: local files under `public/` (see `docs/STORAGE.MD`).

## Rules of Engagement

- Do not commit secrets in `.env.local`.
- Do not delete files under `public/generated`, `public/gallery`, or `public/research` unless explicitly asked.
- Keep docs in `docs/` uppercase and move obsolete docs to `docs/_legacy`.
- Prefer small, focused changes and keep outputs consistent with the existing API contracts.

