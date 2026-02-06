# DEVELOPMENT

Last reviewed: 2026-02-05 (local)

## Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.local.example` to `.env.local` and set required values.
3. Run `pnpm run dev` to start the Next.js dev server.

## Database Tasks

- `pnpm run db:check` verifies database connectivity.
- `pnpm run db:migrate` applies both `lib/db/schema.sql` and `scripts/create-sandbox-tables.sql`.
- `pnpm run db:seed:morning-read` seeds the Morning Read task.
- `pnpm run db:seed:media-task` seeds Meaningful Media.
- `pnpm run db:seed:motion-art` seeds Motion Art.
- `pnpm run db:seed:morning-ritual` seeds the Morning Ritual flow.
- `pnpm run db:repair:videos` repairs gallery video URLs if needed.

## Scripts

Additional scripts in `scripts/` include:

- `scripts/run-cron.ps1` and `scripts/run-cron.vbs` for local cron triggers.
- `scripts/check-model.ts` and `scripts/test-veo.ts` for model diagnostics.
- `scripts/verify-browser-task.ts` for browser snapshot testing.

## Tests

- `pnpm run test` runs Vitest.
- `pnpm run test:ui` runs Vitest UI.
- `pnpm run test:coverage` runs coverage.
