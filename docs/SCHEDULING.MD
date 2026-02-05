# SCHEDULING

Last reviewed: 2026-02-05 (local)

Komorebi supports two scheduling paths: client-side scheduling and a server cron endpoint. Both converge on `POST /api/agent/execute`.

## Client Scheduler

- Implementation: `lib/scheduler/*`.
- Evaluates 5-field cron expressions (minute hour day-of-month month day-of-week).
- `Scheduler.runNow` triggers a task immediately even if it is disabled.
- Manual UI runs use `/api/agent/execute` and can include overrides from Settings.

## Server Cron Endpoint

- Endpoint: `GET /api/cron`.
- When `CRON_SECRET` is set, requests must include `Authorization: Bearer <CRON_SECRET>`.
- The cron endpoint executes all due tasks from the database.

## Windows Task Scheduler (Local)

This repo includes scripts to trigger `/api/cron` without opening a terminal window.

- `scripts/run-cron.ps1` reads `.env.local` and calls the cron endpoint with the secret.
- `scripts/run-cron.vbs` runs the PowerShell script hidden.

## Task Records

Task records live in the `tasks` table (`lib/db/schema.sql`). Each task includes:

- `schedule` for cron.
- `enabled` flag.
- `category` and `parameters` for routing and configuration.

## Flow Tasks

Flow tasks chain multiple tasks in sequence.

- `lib/agent/runner.ts` executes flow steps and stops on the first failure.
- `scripts/seed-morning-ritual.ts` creates a Morning Ritual flow, disables its included steps for scheduling, and keeps `Motion Art` standalone.

## Seeded Tasks

Seed scripts live in `scripts/` and are run via `pnpm`.

- `pnpm run db:seed:morning-read`
- `pnpm run db:seed:media-task`
- `pnpm run db:seed:motion-art`
- `pnpm run db:seed:morning-ritual`
