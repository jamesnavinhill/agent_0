# Self-Hosting Roadmap (Windows, No Containers)

Date: 2026-02-05

**Goal**
Refactor Agent Zero to run locally on a Windows host without Vercel dependencies, while keeping Neon Postgres and local filesystem storage.

**Decisions (Locked)**

- OS: Windows.
- Containers: none.
- Deployment: single-instance, personal use.
- Database: managed Postgres (Neon).
- Storage: local filesystem, default path `public/gallery`.
- Scheduling: Windows Task Scheduler calling `/api/cron`, Eastern Time.
- Access: LAN by default (not public internet).
- Analytics: logging only for now.
- Cleanup: deferred; no automatic retention policy initially.

**Non-Goals**

- No containerization.
- No new vendors for storage.
- No public internet exposure by default.
- No full observability stack (Sentry/PostHog) in phase 1.

**Prerequisites**

- Node.js and pnpm installed on the Windows host.
- Neon `DATABASE_URL`, `GOOGLE_API_KEY`, and `CRON_SECRET` available.
- Firewall access to port 3000 on LAN only.

**Phase 0: Database Initialization (Neon)**

Checklist:

- [x] Copy the Neon connection string for the new project and set `DATABASE_URL` in `.env.local`.
- [x] Ensure required extensions are enabled:
  - `pgcrypto`
  - `vector` (pgvector)
- [x] Apply schema from `lib/db/schema.sql` using the local script:
  - `pnpm tsx scripts/migrate.ts`
- [x] (Optional) Seed initial tasks if you want a starting schedule:
  - `pnpm tsx scripts/seed-morning-read.ts`
  - `pnpm tsx scripts/seed-media-task.ts`
  - `pnpm tsx scripts/seed-motion-art.ts`
- [x] (Optional) Verify DB connectivity:
  - `pnpm tsx scripts/check-db.ts`

**Phase 0 Done When**

- Schema is applied successfully and tables exist.
- App loads without DB errors and memory/knowledge panels return data.

**Phase 1: Hosting Baseline**

Checklist:

- [x] Create `.env.local` (or set OS-level env vars) with:
- [x] `GOOGLE_API_KEY`
- [x] `DATABASE_URL`
- [x] `CRON_SECRET`
- [x] Run `pnpm run build`
- [x] Run `pnpm run start`
- [x] Open `http://localhost:3000`
- [x] Open `http://<LAN_IP>:3000` from another device on the same network
- [ ] Confirm `public/gallery` is writable

**Phase 1 Done When**

- App loads on localhost and LAN.
- Gallery can save and read files from `public/gallery`.
- No Vercel dependency is required to run.

**Phase 2: Scheduling**

Checklist:

- [ ] Create a Windows Task Scheduler job to hit `http://localhost:3000/api/cron`
- [ ] Include `Authorization: Bearer <CRON_SECRET>` header
- [ ] Set interval to 1 minute (adjust later if needed)
- [ ] Verify tasks execute and update in UI or in the `tasks` table
- [ ] If media generation fails, confirm `GOOGLE_API_KEY` is set and skip media tasks for now

Suggested Task Scheduler action (uses `.env.local` for the secret, no console pop-ups):

```bat
schtasks /Create /TN "AgentZeroCron" /SC MINUTE /MO 1 /TR "wscript.exe C:\\Users\\james\\projects\\agent_0\\scripts\\run-cron.vbs"
```

If the task already exists and is popping up windows, update it to run hidden:

```bat
schtasks /Change /TN "AgentZeroCron" /TR "wscript.exe C:\\Users\\james\\projects\\agent_0\\scripts\\run-cron.vbs"
```

Kill switch commands:

```bat
schtasks /Change /TN "AgentZeroCron" /Disable
schtasks /Change /TN "AgentZeroCron" /Enable
schtasks /Delete /TN "AgentZeroCron" /F
schtasks /Run /TN "AgentZeroCron"
```

**Phase 2 Done When**

- Scheduled tasks trigger reliably.
- Cron endpoint works with the secret.

**Phase 3: Remove Vercel Dependencies**

Checklist:

- [x] Remove `@vercel/analytics` usage
- [x] Remove `@vercel/analytics` dependency
- [x] Replace `lib/storage/blob.ts` with a filesystem-first storage interface (now `lib/storage/local.ts`)
- [x] Verify filesystem storage is stable
- [x] Remove `@vercel/blob` dependency
- [x] Remove `vercel.json` from runtime config usage

**Phase 3 Done When**

- App builds and runs with no Vercel packages.
- Storage and gallery still function on local disk.

**Phase 4: Hardening (Optional)**

Checklist:

- [ ] Add a manual cleanup script (disabled by default)
- [ ] Add a warning if disk usage exceeds a threshold
- [ ] Add backup guidance for `public/gallery` and Postgres

**Phase 4 Done When**

- Cleanup and backup options are documented and available but not required.

**Validation Checklist**

- `/api/cron` returns 200 with valid auth.
- Gallery read/write uses filesystem and shows `source: "filesystem"`.
- Memory and knowledge panels load data from Neon.
- App runs without Vercel credentials or deployment settings.

**Risks and Mitigations**

- Disk growth: track storage usage monthly, add cleanup if needed.
- Task frequency overload: adjust scheduler interval or throttle tasks.
- LAN exposure: restrict Windows Firewall rule to local subnet.

**Rollback Plan**

- If changes break runtime, revert to last known good commit.
- Keep a backup of `.env.local` and database credentials.
