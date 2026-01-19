# Vercel Cron Job Analysis & Solutions

## Current Situation

The latest deployment to Vercel has resulted in failures (indicated by "X" in GitHub deployments). The issue is linked to Vercel Cron usage limits.

### Analysis of Current Implementation

- **Configuration**: The `vercel.json` file configures a cron job with the schedule `* * * * *`.
  ```json
  "crons": [
      {
          "path": "/api/cron",
          "schedule": "* * * * *"
      }
  ]
  ```
- **Frequency**: This schedule attempts to trigger the `/api/cron` endpoint **every minute**.
- **Functionality**: The endpoint (`app/api/cron/route.ts`) checks for due tasks in the database, executes them using the Gemini API, and updates their status.
- **Limit Hit**: Vercel's Hobby (Free) plan limits Cron Jobs to **one per day** (technically, it allows 1 cron job, but frequent execution like every minute is often throttled or disallowed, leading to deployment warnings or runtime failures). Even on Pro plans, excessive invocation of serverless functions can lead to timeouts or cost spikes.

## Proposed Solutions

### Option 1: GitHub Actions (Recommended)

Move the scheduling responsibility from Vercel to GitHub Actions. This was the original recommendation in the `full-scope.md` feasibility report.

**Details:**
- Create a workflow `.github/workflows/cron.yml`.
- Use `schedule` event with cron syntax.
- Use `curl` to hit the Vercel deployment URL `/api/cron`.
- Secure the endpoint with a `CRON_SECRET`.

**Pros:**
- **Free**: GitHub Actions has a generous free tier (2,000 minutes/month).
- **Flexible**: Can run every 5-10 minutes easily without hitting Vercel's cron specific limits (just normal function invocation).
- **Control**: Easier to debug and manage logs in GitHub.

**Cons:**
- Requires external request to the Vercel app (slight latency).

**Implementation Step:**
Create `.github/workflows/scheduler.yml`:
```yaml
name: Agent Scheduler

on:
  schedule:
    - cron: '*/10 * * * *' # Run every 10 minutes
  workflow_dispatch: # Allow manual trigger

jobs:
  trigger-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Call Agent Cron Endpoint
        run: |
          curl -X GET ${{ secrets.VERCEL_APP_URL }}/api/cron \
          -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 2: Reduce Vercel Cron Frequency

Keep using Vercel Cron but reduce the frequency to match the plan limits.

**Details:**
- Change `vercel.json` schedule to run daily or hourly (if allowed).

**Pros:**
- Native integration.

**Cons:**
- **Too Slow**: The agent needs to be more active than once a day.
- **Unreliable on Free Tier**: Vercel Hobby plan cron guarantees are lower.

### Option 3: External Cron Service

Use a dedicated service like EasyCron, Mergent, or cron-job.org.

**Pros:**
- Dedicated dashboard.
- Reliable.

**Cons:**
- Another account to manage.
- Potential costs.

## Recommendation

**Adopt Option 1 (GitHub Actions).**
It aligns with the original architectural vision, provides sufficient frequency (e.g., every 10-15 minutes), and stays within free tier limits of both platforms.

### Immediate Action Plan
1. Remove `"crons"` section from `vercel.json` to fix deployment errors.
2. Push changes to fix the build.
3. Set up the GitHub Action workflow.
4. Add `CRON_SECRET` and `VERCEL_APP_URL` to GitHub Repository Secrets.
