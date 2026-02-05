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

**Phase 1: Hosting Baseline**

Checklist:
- [ ] Create `.env.production` (or set OS-level env vars) with:
- [ ] `GOOGLE_API_KEY`
- [ ] `DATABASE_URL`
- [ ] `CRON_SECRET`
- [ ] Run `pnpm run build`
- [ ] Run `pnpm run start`
- [ ] Open `http://localhost:3000`
- [ ] Open `http://<LAN_IP>:3000` from another device on the same network
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
- [ ] Verify tasks execute and update in UI

**Phase 2 Done When**

- Scheduled tasks trigger reliably.
- Cron endpoint works with the secret.

**Phase 3: Remove Vercel Dependencies**

Checklist:
- [ ] Remove `@vercel/analytics` usage
- [ ] Remove `@vercel/analytics` dependency
- [ ] Replace `lib/storage/blob.ts` with a filesystem-first storage interface
- [ ] Verify filesystem storage is stable
- [ ] Remove `@vercel/blob` dependency
- [ ] Remove `vercel.json` from runtime config usage

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
- Keep a backup of `.env.production` and database credentials.
