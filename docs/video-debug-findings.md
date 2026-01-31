# Video Generation Debug Investigation Findings

**Date:** January 20, 2026  
**Investigator:** AI Analysis  
**Status:** ROOT CAUSE IDENTIFIED

---

*Need to remove cron jobs from vercel before committing to avoid issues*

## Executive Summary

The video generation task ("Motion Art") completes in ~5 seconds instead of the required ~50+ seconds because **the UI trigger path bypasses the video generation logic entirely**. The task falls through to an incorrect handler that calls the chat API instead of the Veo video API.

This is not a bug in the video generation code itself—the direct test script (`scripts/test-veo.ts`) works perfectly. The issue is an **architectural gap in the task routing system**.

---

## Root Cause Analysis

### The Problem

There are **two parallel task execution systems** that are not unified:

| System | Location | Used By | Has Video Routing? |
|--------|----------|---------|-------------------|
| Server-side Runner | `lib/agent/runner.ts` | `/api/agent/execute`, `/api/cron` | ✅ **YES** (line 41-44) |
| Client-side Executor | `lib/scheduler/executor.ts` | UI "Start Now" button via `useScheduler` | ❌ **NO** |

### The Flow That Breaks

```
UI Click "⚡ Start Now"
    │
    └── useScheduler.runNow(taskId)
            │
            └── Scheduler.executeTask()          ← lib/scheduler/index.ts
                    │
                    └── executeByCategory()       ← lib/scheduler/executor.ts
                            │
                            └── switch(task.category)
                                    │
                                    ├── "art"        → executeArtTask()       ✅ calls /api/agent/execute
                                    ├── "code"       → executeCodeTask()
                                    ├── "research"   → executeResearchTask()  ✅ calls /api/agent/execute
                                    ├── "philosophy" → executeTextTask()
                                    ├── "blog"       → executeTextTask()
                                    ├── "browser"    → executeBrowserTask()
                                    │
                                    └── default      → executeCustomTask()    ❌ calls /api/chat (WRONG!)
```

### Why `video` Falls Through

The `executeByCategory()` function in [executor.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/executor.ts#L56-75):

```typescript
async function executeByCategory(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  switch (task.category) {
    case "art":
      return executeArtTask(task, context)
    case "code":
      return executeCodeTask(task, context)
    case "research":
      return executeResearchTask(task, context)
    case "philosophy":
    case "blog":
      return executeTextTask(task, context)
    case "browser":
      return executeBrowserTask(task, context)
    default:  // ← "video" lands here!
      return executeCustomTask(task, context)
  }
}
```

The `video` category is **not listed**. The task with category `"video"` falls through to `executeCustomTask()`, which:

1. Calls `/api/chat` with a generic prompt
2. Returns in ~5 seconds with a chat response (not a video)
3. Never touches the Veo API

### Evidence

From `scripts/seed-motion-art.ts`:

```typescript
INSERT INTO tasks (..., category, ...)
VALUES (..., 'video', ...)  // category = "video"
```

From `lib/agent/runner.ts` (line 41-44):

```typescript
} else if (task.name.includes("Motion") || task.category === "video") {
    console.log("[Runner] -> Video generation path")
    output = await generateVideo(task)
    console.log("[Runner] Video generation completed:", output)
}
```

The runner **does** have correct routing, but the UI never reaches it because the client-side executor short-circuits with a different path.

---

## Violation of Project Rules

This breaks the explicit rule in [project_rules.md](file:///c:/Users/james/projects/agent_0/docs/project_rules.md#L29):

> **Unified Execution:** Whether triggered via Cron or "Start Now" button, the **exact same code path** must be executed.

The current architecture violates this principle:

- **Cron**: `/api/cron` → `executeTask()` (runner.ts) → `generateVideo()` ✅
- **UI Start Now**: `useScheduler` → `executor.ts` → `executeCustomTask()` → `/api/chat` ❌

---

## Current Architecture Assessment

### What Works

| Feature | Status | Notes |
|---------|--------|-------|
| Veo API wrapper | ✅ | `lib/api/veo.ts` is correctly implemented with polling |
| Direct script test | ✅ | `scripts/test-veo.ts` generates videos successfully |
| Runner video routing | ✅ | `lib/agent/runner.ts` routes `video` category correctly |
| Cron execution | ✅ | Would work if using runner.ts |
| Art task from UI | ✅ | `executeArtTask()` correctly delegates to `/api/agent/execute` |
| Research task from UI | ✅ | `executeResearchTask()` correctly delegates to `/api/agent/execute` |

### What Doesn't Work

| Feature | Status | Issue |
|---------|--------|-------|
| Video task from UI | ❌ | Falls through to wrong handler |
| Category type safety | ❌ | `video` not in `TaskCategory` union type |
| Edit task from UI | ⚠️ | No explicit handler in executor.ts |

---

## Multi-Step Task Orchestration Analysis

### Current Capabilities

The scheduler supports:

1. **Cron-based scheduling** - Works correctly via `/api/cron`
2. **Single-task execution** - Works via runner for server-initiated tasks
3. **Category-based routing** - Partially implemented (gaps for video, edit)

### Missing Capabilities for Multi-Step Tasks

Per `project_rules.md` Section 7, multi-step tasks require:

| Requirement | Current Status | Gap |
|-------------|----------------|-----|
| Atomic, testable operations | 🟡 Partial | Each tool is atomic, but no workflow abstraction |
| Intermediate result persistence | ✅ | Gallery and memory systems exist |
| Memory informs next step | 🟡 Partial | Memory retrieval exists but no step chaining |
| Graceful failure handling | ✅ | Try-catch with activity logging |
| Step sequencing | ❌ | No workflow engine |
| Resumable workflows | ❌ | No workflow state persistence |

### Current Workaround Pattern

The existing pattern for "multi-step" is manual chaining inside single functions:

```typescript
// In performMorningRead():
1. Fetch memories (step 1)
2. Generate search queries (step 2)
3. Execute searches (step 3)
4. Compile report (step 4)
5. Save to gallery (step 5)
6. Add memory (step 6)
```

This works but:

- Not resumable if interrupted
- Not reusable across different task types
- No visibility into intermediate steps

---

## Recommendations

### Immediate Fix (Low Effort)

Add `video` case to `executeByCategory()` in [executor.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/executor.ts#L56-75):

```typescript
case "video":
  return executeVideoTask(task, context)  // New handler that calls /api/agent/execute
```

This maintains the current architecture pattern used by `art` and `research`.

### Architectural Improvement (Medium Effort)

Simplify the client-side executor to **always** delegate to `/api/agent/execute` for any task that requires server-side resources:

```typescript
// executor.ts - simplified
async function executeByCategory(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  // Categories that need server-side execution
  const serverCategories = ["art", "video", "research", "browser"]
  
  if (serverCategories.includes(task.category)) {
    return executeServerTask(task, context)  // Always use /api/agent/execute
  }
  
  // Only pure client-side tasks here
  switch (task.category) {
    case "philosophy":
    case "blog":
      return executeTextTask(task, context)
    default:
      return executeCustomTask(task, context)
  }
}
```

### Long-term Enhancement (High Effort)

For true multi-step workflow support, consider:

1. **Workflow Engine**: Create `lib/workflow/engine.ts` with step definitions, state persistence
2. **Step Definitions**: Define workflows as DAGs of atomic operations
3. **Resume Capability**: Store workflow state in database, enable resumption on failure
4. **Visibility**: Log each step to activity stream with step number/total

---

## Additional Platform Constraint

> [!WARNING]  
> **Vercel Timeout Limitation**

The API routes have `maxDuration = 60` seconds:

- [api/agent/execute/route.ts](file:///c:/Users/james/projects/agent_0/app/api/agent/execute/route.ts#L6): `export const maxDuration = 60`
- [api/cron/route.ts](file:///c:/Users/james/projects/agent_0/app/api/cron/route.ts#L10): `export const maxDuration = 60`

But `lib/api/veo.ts` allows polling for up to **5 minutes** (`MAX_POLL_TIME_MS = 5 * 60 * 1000`).

This means on Vercel's free tier, video generation will **always timeout** after 60 seconds if it takes longer than that to complete.

**Workarounds:**

1. Use Vercel Pro (300-second limit for serverless functions)
2. Upgrade to Edge runtime with streaming (no timeout)
3. Implement a queue-based background job system (e.g., Inngest, Trigger.dev)

---

## Verification Commands

```bash
# Test Veo API directly (THIS WORKS)
npx tsx scripts/test-veo.ts

# Check task configuration in DB
Invoke-RestMethod -Uri http://localhost:3000/api/tasks | ConvertTo-Json

# Trigger task via API (bypasses client executor)
$body = '{"taskId": "<YOUR_MOTION_ART_TASK_ID>"}'
Invoke-RestMethod -Uri http://localhost:3000/api/agent/execute -Method POST -Body $body -ContentType "application/json"
```

---

## Files Analyzed

| File | Relevance |
|------|-----------|
| [lib/scheduler/executor.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/executor.ts) | **Primary issue** - missing video routing |
| [lib/agent/runner.ts](file:///c:/Users/james/projects/agent_0/lib/agent/runner.ts) | Has correct video routing |
| [lib/api/veo.ts](file:///c:/Users/james/projects/agent_0/lib/api/veo.ts) | Veo API wrapper - correctly implemented |
| [lib/agent/tools/media.ts](file:///c:/Users/james/projects/agent_0/lib/agent/tools/media.ts) | Video generation function - correctly implemented |
| [lib/scheduler/index.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/index.ts) | Scheduler class - routes to executor |
| [hooks/use-scheduler.ts](file:///c:/Users/james/projects/agent_0/hooks/use-scheduler.ts) | UI hook - calls scheduler.runNow() |
| [app/api/agent/execute/route.ts](file:///c:/Users/james/projects/agent_0/app/api/agent/execute/route.ts) | API endpoint - 60s timeout limit |
| [docs/project_rules.md](file:///c:/Users/james/projects/agent_0/docs/project_rules.md) | Documents "Unified Execution" rule |
| [scripts/seed-motion-art.ts](file:///c:/Users/james/projects/agent_0/scripts/seed-motion-art.ts) | Task seeding - category is "video" |

---

## Conclusion

The video generation system is **correctly implemented** at the API and tool layer. The failure occurs because the UI trigger path uses a client-side executor that lacks routing for `video` category tasks.

**The fix is straightforward**: Add a `video` case to `executeByCategory()` that delegates to `/api/agent/execute`, matching the pattern used by `art` and `research` tasks.

For multi-step task orchestration, the current system is **adequate for linear, single-task execution** but lacks infrastructure for:

- True workflow composition
- Step resumption
- Cross-task dependencies

These enhancements would require additional tooling if future use cases demand complex multi-step workflows.

---

## Future Scheduling & Orchestration Strategy

### GitHub Actions for Multi-Step Workflows

To support complex multi-step workflows and autonomous scheduling without relying on paid Vercel features or external cron services, we will implement **GitHub Actions** as the primary orchestration engine.

#### Why GitHub Actions?

- **Free Tier:** Generous free tier for public/private repositories.
- **Workflow Control:** Can execute complex logic (loops, retries, conditions) beyond simple pinging.
- **Integration:** Native access to the repository for code-driven schedule definitions.

#### Implementation Pattern

The GitHub Action will act as a "heartbeat" or external driver that:

1. **Triggers:** Runs on a schedule (e.g., every 5-10 minutes) + `workflow_dispatch` for manual runs.
2. **Executes:** Calls the `/api/cron` or specific `/api/jobs/check` endpoints.
3. **Polls:** For multi-step tasks (like video generation), the Action can enter a loop:
   - Call trigger endpoint.
   - Wait (sleep).
   - Poll status endpoint until completion or timeout.
   - Trigger next step upon success.

#### Example Workflow Structure

```yaml
name: Agent Scheduler
on:
  schedule:
    - cron: '*/10 * * * *' # Every 10 minutes
  workflow_dispatch:

jobs:
  orchestrate-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scheduled Tasks
        run: curl -X GET "${{ secrets.VERCEL_URL }}/api/cron" -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Poll for Async Jobs (Video/Research)
        run: |
          # Simple polling loop pattern
          for i in {1..5}; do
            echo "Checking pending jobs..."
            curl -X GET "${{ secrets.VERCEL_URL }}/api/jobs/check" -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
            sleep 60
          done
```

### Transition Plan

1. **Current Phase (Manual/Development):**
   - Use Client-side UI triggers ("Start Now" button) for immediate testing.
   - Manually trigger `/api/jobs/check` for async job finalization.
   - Validate logic and "juggling" capabilities manually.

2. **Future Phase (Automated/Production):**
   - Disable client-side direct execution for scheduled tasks.
   - Deploy GitHub Actions workflows to handle the "pulse" of the agent.
   - Agent moves from reactive (waiting for UI) to active (driven by external scheduler).
