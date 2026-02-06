# API REFERENCE

Last reviewed: 2026-02-06 (local)

All routes are under `/api`. This document reflects current route implementations in `app/api/*`.

## Activity

### GET /api/activity

Method: GET
Query: `limit`, `since`, `level`
Response: Array of activity events from the database.
Notes: Uses `lib/activity/db-store.ts` and returns up to 100 items.

### POST /api/activity/push

Method: POST
Body: `{ action, details?, timestamp?, status?, id? }`
Response: `{ ok: true }` or `{ error }`.
Notes: Validates that `action` is present.

### GET /api/activity/stream

Method: GET (SSE)
Response: Server-Sent Events with recent activity history and new events.
Notes: Uses database history when configured, otherwise in-memory history.

## Agent

### POST /api/agent/execute

Method: POST
Body: `{ taskId, overrides? }`
Response: Task execution result from `lib/agent/runner.ts`.
Notes: `overrides` merges into task parameters for manual runs.

### POST /api/agent/chat

Method: POST (streaming)
Body: `{ messages?, prompt?, sessionId?, autonomous? }`
Response: AI SDK streaming response.
Notes: Uses `lib/agents/ai-sdk-agents.ts`, `lib/agents/tools`, and direct Google provider binding in `lib/api/google-ai-sdk.ts` (no AI Gateway key required).

### POST /api/agent/stream

Method: POST (SSE)
Body: `{ task, autonomous?, maxSteps? }`
Response: Server-Sent Events with step-by-step execution updates.

### GET /api/agent/memory

Method: GET
Query: `type`, `limit`
Response: `{ memories, knowledge }`.

### POST /api/agent/memory

Method: POST
Body: `{ action: "add", item }`
Response: `{ success }`.

### DELETE /api/agent/memory

Method: DELETE
Query: `id` or `layer`
Response: `{ success: true }`.

### POST /api/agent/subagent

Method: POST
Body: `{ action, config?, configs?, task?, context?, options? }`
Response: `{ success: true, result }`.
Notes: Supports actions `spawn`, `parallel`, and `autonomous`.

### GET /api/agent/subagent

Method: GET
Response: Available sub-agent roles and supported actions.

## Browser

### POST /api/browser

Method: POST
Body: `{ url }`
Response: `{ success, title, url, snapshotUrl }`.
Notes: Uses Playwright and stores snapshot in local storage.

## Chat

### POST /api/chat

Method: POST (SSE)
Body: `{ messages, model?, temperature? }`
Response: Server-Sent Events with streamed text.
Notes: Uses `lib/api/gemini.ts`.

## Cron

### GET /api/cron

Method: GET
Headers: `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.
Response: `{ results }` or `{ message: "No tasks due" }`.
Notes: Executes due tasks from the database.

## Database

### GET /api/db/migrate

Method: GET
Response: Available migrations.

### POST /api/db/migrate

Method: POST
Body: `{ migration: "schema" | "sandbox" }` or `{ rawSql }`
Response: Migration results and per-statement status.
Notes: Intended for development/setup only.

## Gallery

### GET /api/gallery

Method: GET
Query: `category`, `type`, `limit`
Response: `{ items, source }`.
Notes: Uses database when configured, otherwise filesystem index.

### POST /api/gallery

Method: POST
Body: `{ type, content, title?, prompt?, category?, metadata? }`
Response: `{ success, item, source }`.

### DELETE /api/gallery

Method: DELETE
Query: `id`
Response: `{ success: true }`.

## Generate

### POST /api/generate

Method: POST
Body: `{ prompt, type? }`
Response: Text or text plus images depending on `type`.
Notes: Uses AI SDK with direct Google provider binding in `lib/api/google-ai-sdk.ts`.

### POST /api/generate/image

Method: POST
Body: `{ prompt, count?, aspectRatio?, model? }`
Response: `{ success, image }` or `{ success, images }`.
Notes: Uses Imagen or Gemini image models via `lib/api/imagen.ts`.

### POST /api/generate/code

Method: POST
Body: `{ action, prompt?, code?, language?, context?, instructions? }`
Response: `{ success, result }` or `{ success, explanation }`.

## Goals

### GET /api/goals

Method: GET
Response: Array of goals.

### POST /api/goals

Method: POST
Body: Goal fields.
Response: Created goal.

### PUT /api/goals

Method: PUT
Body: `{ id, ...updates }`.
Response: Updated goal.

### DELETE /api/goals

Method: DELETE
Query: `id`
Response: `{ success: true }`.

## Sandbox

### GET /api/sandbox/health

Method: GET
Response: `{ ready, checkedAt, checks, issues, recommendations }`.
Notes: Returns dependency/readiness status for `DATABASE_URL`, sandbox table preflight, and `GOOGLE_API_KEY` with actionable setup messages.

### GET /api/sandbox/projects

Method: GET
Query: `status`, `limit`, `offset`
Response: `{ projects, count }`.

### POST /api/sandbox/projects

Method: POST
Body: `{ name, description?, framework?, language?, createdBy?, metadata? }`
Response: Created project.

### GET /api/sandbox/projects/[projectId]

Method: GET
Response: Full project details.

### PATCH /api/sandbox/projects/[projectId]

Method: PATCH
Body: Partial project updates.
Response: Updated project.

### GET /api/sandbox/projects/[projectId]/dependencies

Method: GET
Response: `{ dependencies, count }`.

### PUT /api/sandbox/projects/[projectId]/dependencies

Method: PUT
Body: `{ dependencies: [{ name, version?, dev? }] }`
Response: Updated dependency list.

### GET /api/sandbox/projects/[projectId]/files

Method: GET
Query: `prefix` or `path`
Response: File list or a single file.

### POST /api/sandbox/projects/[projectId]/files

Method: POST
Body: `{ path, content, fileType?, createdBy?, metadata? }`
Response: Created file version.

### DELETE /api/sandbox/projects/[projectId]/files

Method: DELETE
Query: `path`
Response: `{ deleted: true, file }`.

### GET /api/sandbox/projects/[projectId]/executions

Method: GET
Query: `limit`, `offset`, or `id`
Response: Execution list or a single execution.

### POST /api/sandbox/projects/[projectId]/executions

Method: POST
Body: `{ command, executionType?, input?, model? }`
Response: Execution result (non-streaming).

### POST /api/sandbox/projects/[projectId]/executions/stream

Method: POST (SSE)
Body: `{ command, executionType?, input?, model? }`
Response: Server-Sent Events with streaming execution output.

## Tasks

### GET /api/tasks

Method: GET
Response: Task list.

### POST /api/tasks

Method: POST
Body: `{ name, description, schedule, enabled? }`
Response: Created task.

### PUT /api/tasks

Method: PUT
Body: `{ updates: [{ id, parameters?, schedule?, enabled? }] }`
Response: `{ updated, tasks }`.

### DELETE /api/tasks

Method: DELETE
Query: `id`
Response: `{ success: true }`.

## Test

### GET /api/test

Method: GET
Response: `{ message }`.

### GET or POST /api/test/morning-read

Method: GET or POST
Headers: `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.
Response: `{ success, report }`.

### GET /api/test/debug-auth

Method: GET
Response: Debug details about `CRON_SECRET` and auth header.
