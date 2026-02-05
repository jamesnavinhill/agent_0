# Self-Hosting Refactor Report (Komorebi)

Date: 2026-02-05

## Scope

Move off Vercel deployment and run locally on your own server. Provide a robust, first-principles view of options for server, storage, and scheduling. Identify Vercel-specific coupling in the codebase and outline refactor directions. No assumptions about your target environment.

## Codebase Findings (Vercel / Hosting Coupling)

- Vercel Analytics has been removed from `app/layout.tsx` and `package.json`.
- Vercel Blob has been replaced with local filesystem storage via `lib/storage/local.ts` (gallery and media flows).
- `vercel.json` has been removed; env vars are now handled locally.
- Database access is implemented via `@neondatabase/serverless` (`lib/db/neon.ts`), with all database queries routed through that pool.
- The schema uses PostgreSQL-specific features: `vector` extension, `gen_random_uuid()`, `tsvector` / `plainto_tsquery`, `jsonb`, and `text[]` arrays (`lib/db/schema.sql`). [S6][S7][S8]
- Gallery API already has a filesystem fallback to `public/gallery` when Blob/DB are not configured (`app/api/gallery/route.ts`). This relies on Node's filesystem APIs. [S5]
- The cron entrypoint is HTTP-based (`/api/cron`). There is no in-process scheduler; it assumes an external scheduler is calling the endpoint.

## Constraints Implied by Current Schema

- The schema requires PostgreSQL (not SQLite) due to use of full-text search functions and `tsvector`/`tsquery` operators. [S6]
- `gen_random_uuid()` requires the `pgcrypto` extension. [S7]
- The `vector` type requires the pgvector extension. [S8]

## Server / Hosting Options (Self-Hosted)

### Option A: Standard Node.js Self-Host (Minimal change)

- Use `next build` + `next start` for production on your own server. [S1]
- Keep the integrated Next.js server (no custom server) to preserve Next.js optimizations. [S4]
- Pros: smallest change, supports all Next.js features. [S1]
- Cons: you must manage process supervision, TLS, and OS patching. A reverse proxy is recommended when self-hosting. [S2]

### Option B: Standalone Output (Portable / container-friendly)

- Enable `output: 'standalone'` in `next.config.mjs` to generate a minimal deployable server bundle. [S3]
- Pros: leaner deployments, easier container builds. [S3]
- Cons: you must copy `public` and `.next/static` alongside the standalone server if you want the server to host those assets. [S3]

### Option C: Custom Server (Only if you truly need it)

- Next.js supports custom servers, but warns this removes important optimizations. [S4]
- Pros: full control over routing/server behavior.
- Cons: loss of optimizations; not recommended unless required. [S4]

## Storage Options (Local Filesystem Default)

### Option A: Local Filesystem (Already supported)

- The Gallery route writes to `public/gallery` using Node `fs` when Blob is not configured. This uses the host machine's filesystem (not browser storage). [S5]
- Pros: no extra infrastructure, fastest change.
- Cons: not durable, not shared across multiple app instances, backups are your responsibility.

### Option B: S3-Compatible Object Storage (Recommended for durability)

- Use Amazon S3 or an S3-compatible server (e.g., MinIO) and replace `lib/storage/local.ts` with an S3 client implementation. [S10][S11][S12]
- Pros: durability, scalable, can be shared across multiple app instances.
- Cons: extra infrastructure and credentials.

## Database Options

### Option A: Keep managed Postgres (Neon or another provider)

- Change is mostly operational; code can remain similar if you keep a Postgres connection string.
- Consider swapping `@neondatabase/serverless` for `pg` if you move off Neon to a standard Postgres server.

### Option B: Self-host Postgres

- Must install and enable `pgcrypto` and pgvector extensions. [S7][S8]
- Pros: full control, stays local.
- Cons: you own backups, upgrades, HA, and maintenance.

## Scheduling Options (Replace Vercel Cron)

### Option A: OS Scheduler (cron / systemd timers)

- Use a system scheduler to call `/api/cron` on an interval. Cron format reference: [S14]. systemd timer reference: [S13].
- Pros: simple, no new infrastructure.
- Cons: platform-specific management.

### Option B: Container/Kubernetes CronJob

- If you deploy in Kubernetes, use a CronJob to call the endpoint or run a job container. [S15]
- Pros: consistent with containerized deployments.
- Cons: requires Kubernetes.

### Option C: Database-native scheduling (pg_cron)

- Neon supports `pg_cron` but jobs run only while compute is active and schedules are interpreted in UTC. [S16]
- Supabase Cron uses `pg_cron`, supports running SQL or HTTP requests, and can schedule as frequently as every second. [S17]
- Pros: no external scheduler; job history in database.
- Cons: database compute must be active; schedules are UTC; vendor-specific operational limits.

## Recommended Refactor Direction (Conditional)

- Keep the integrated Next.js server (`next build` + `next start`) unless you have a concrete need for a custom server. [S1][S4]
- Replace local storage with an S3-compatible storage adapter if you need durability and multi-instance support. Otherwise, keep the filesystem default. [S5][S10][S11][S12]
- Keep PostgreSQL (required by schema). If you move off Neon to self-hosted Postgres, replace the Neon driver with `pg` and ensure `pgcrypto` + pgvector are installed. [S6][S7][S8]
- Replace Vercel Cron with OS-level scheduling or a container CronJob, depending on your target environment. [S13][S14][S15]

## Decisions Locked (2026-02-05)

- OS: Windows. No containers.
- Deployment: single-instance (personal use).
- Database: keep managed Postgres, prefer Neon for now; Supabase is a fallback if Cron/other services become a priority.
- Storage: local filesystem for objects with very generous (or unlimited) retention by default; optional cleanup can be added later.
- Media location: `public/gallery` inside the repo by default.
- Scheduling: frequent runs, Eastern Time; prefer Windows Task Scheduler calling `/api/cron` as the primary trigger. [S18][S19]
- Access: LAN by default (not public internet).
- Analytics: optional; prioritize logging for debugging over full analytics.

## Data Handling Notes (Memory / Knowledge)

- Memory and knowledge remain in Postgres. No migration is required if Neon stays in place.
- Local fallback exists for memories only when `DATABASE_URL` is not set; knowledge currently has no local fallback.

## Concrete Refactor Tasks (Non-breaking)

- Remove `@vercel/analytics` usage (or replace with a self-hosted analytics provider if you still need analytics).
- Replace `lib/storage/local.ts` with a storage interface (S3 + filesystem implementations) if you later add object storage. [S10][S11][S12]
- Decide whether to keep `@neondatabase/serverless` or migrate to `pg` and update `lib/db/neon.ts` accordingly.
- Replace `vercel.json` with your own environment management (e.g., `.env.production` or OS-level env vars).
- Add a deployment playbook for your target OS (service manager, logs, backups, TLS, firewall).

## Open Questions

1. Do you want to implement a storage cleanup job now (disabled by default) or defer until needed?
2. Do you want hosted error tracking now, or keep logging-only for the first self-hosted phase?

## Execution Plan (Phased)

### Phase 1: Hosting + Scheduling (Windows)

- Document Windows Task Scheduler setup to call `/api/cron` on a frequent interval. [S18][S19]
- Ensure environment variables are set for production (no Vercel config dependency). [S1]
- Verify LAN access path and firewall rules during deployment (documented in runbook).

### Phase 2: Storage Simplification

- Introduce a storage interface with a filesystem implementation using Node `fs`. [S5]
- Keep local filesystem storage as the default; add object storage only if needed. [S10][S11][S12]
- Add an optional environment variable for the media root directory to place gallery files on an external drive.
- Add an optional cleanup script (disabled by default) for future maintenance.

### Phase 3: Observability

- Keep local logging as the baseline.
- If needed, add hosted error tracking later (minimal integration, no self-hosting required).

## Concrete Implementation Plan (Checklist)

### 0) Pre-flight (Inventory and Risk)

- [ ] Confirm current Node.js and pnpm versions used locally.
- [ ] Decide whether to keep `@neondatabase/serverless` or switch to `pg` (only if leaving Neon).
- [ ] Identify any Vercel-only features currently in use (Analytics, Blob, Cron).
- [ ] Confirm target LAN access pattern (host binds to LAN IP; Windows Firewall rule).

### 1) Hosting (Self-Hosted Next.js on Windows)

- [ ] Create a local production env file (example: `.env.production`) with:
  - `GOOGLE_API_KEY`
  - `DATABASE_URL` (Neon)
  - `CRON_SECRET`
  - Optional: `MEDIA_ROOT_DIR` (if you ever want to move gallery off repo)
- [ ] Build and run locally with:
  - `pnpm run build`
  - `pnpm run start`
- [ ] Validate app in browser via:
  - `http://localhost:3000`
  - `http://<LAN_IP>:3000` (from another device)
- [ ] Add a simple Windows Firewall inbound rule for port 3000 (LAN-only scope).

### 2) Scheduling (Windows Task Scheduler)

- [ ] Add a Windows Task Scheduler job to call `/api/cron` on your desired interval.
- [ ] Ensure the task includes the `Authorization: Bearer <CRON_SECRET>` header.
- [ ] Validate the job by checking `/api/cron` responses and confirming tasks run in UI.

Suggested command for a scheduled task:

```bat
schtasks /Create /TN "KomorebiCron" /SC MINUTE /MO 1 /TR "powershell -Command \"Invoke-WebRequest -UseBasicParsing -Headers @{Authorization='Bearer %CRON_SECRET%'} http://localhost:3000/api/cron\""
```

Notes:

- Frequency can be adjusted (e.g., every 1-5 minutes).
- For more frequent runs, consider shorter intervals plus internal task-level scheduling.

### 3) Storage (Local Filesystem First)

- [ ] Confirm that `public/gallery` is writable on the host.
- [ ] Verify gallery write/read flows without Blob configured:
  - Upload item ? file appears in `public/gallery`
  - Gallery list returns `source: "filesystem"`
- [ ] Add storage interface abstraction if you later add object storage.

### 4) Database (Neon, no migration required)

- [ ] Ensure Neon DB has required extensions (`pgcrypto`, `pgvector`) enabled.
- [ ] Apply `lib/db/schema.sql` if database is empty.
- [ ] Confirm memory/knowledge panels load in UI and show Neon-backed data.

### 5) Analytics / Logging

- [ ] Remove `@vercel/analytics` from `app/layout.tsx` if you do not need it.
- [ ] Keep server logs as baseline observability.
- [ ] Optional later: add hosted error tracking (Sentry) for exceptions only.

### 6) LAN Access Hardening (Optional)

- [ ] Bind server to `0.0.0.0` if you want LAN devices to access.
- [ ] Restrict Windows Firewall rule to local subnet.
- [ ] If you ever need remote access, consider a VPN or a secure tunnel.

### 7) Documentation Updates

- [ ] Update README with self-hosting instructions (Windows, LAN access, Scheduler).
- [ ] Add a short “Ops Runbook” in `docs/` with:
  - How to restart the server
  - How to check logs
  - How to update environment variables
  - How to run cleanup if needed

## Implementation Notes (Decisions Applied)

- Use filesystem storage by default (`public/gallery`).
- Avoid new vendors unless needed.
- Use Windows Task Scheduler as the cron trigger.
- Keep Neon as the managed Postgres backend.

## Sources (Official)

- [S1] Next.js App Router Deploying: <https://nextjs.org/docs/app/getting-started/deploying>
- [S2] Next.js Self-Hosting Guide (reverse proxy, image optimization): <https://nextjs.org/docs/pages/guides/self-hosting>
- [S3] Next.js `output: 'standalone'` (App Router): <https://nextjs.org/docs/app/api-reference/config/next-config-js/output>
- [S4] Next.js Custom Server Guide (trade-offs): <https://nextjs.org/docs/pages/guides/custom-server>
- [S5] Node.js `fs` module: <https://nodejs.org/api/fs.html>
- [S6] PostgreSQL Text Search Functions/Operators: <https://www.postgresql.org/docs/18/functions-textsearch.html>
- [S7] PostgreSQL `pgcrypto` extension (`gen_random_uuid`): <https://www.postgresql.org/docs/current/pgcrypto.html>
- [S8] pgvector extension (`CREATE EXTENSION vector`): <https://github.com/pgvector/pgvector>
- [S10] Amazon S3 GetObject API: <https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html>
- [S11] Amazon S3 PutObject API: <https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html>
- [S12] MinIO AIStor (S3-compatible object store): <https://docs.min.io/enterprise/aistor-object-store/>
- [S13] systemd timer units: <https://man7.org/linux/man-pages/man5/systemd.timer.5.html>
- [S14] crontab format reference: <https://man7.org/linux/man-pages/man5/crontab.5.html>
- [S15] Kubernetes CronJob: <https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/>
- [S16] Neon pg_cron: <https://neon.com/docs/extensions/pg_cron>
- [S17] Supabase Cron: <https://supabase.com/docs/guides/cron>
- [S18] schtasks commands: <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks>
- [S19] schtasks create: <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks-create>


