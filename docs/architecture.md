# KOMOREBI ARCHITECTURE

Last reviewed: 2026-02-05 (local)

## Overview

Komorebi is a Next.js 16 (App Router) application that combines a client UI with server API routes for agent execution, media generation, scheduling, and persistence. The UI runs in the browser and calls `app/api/*` endpoints. Server routes call the task runner and tool modules in `lib/`.

## Core Runtime Pieces

- UI and panels live in `app/` and `components/`.
- API routes live in `app/api/*`.
- Task execution lives in `lib/agent/runner.ts` and `lib/agent/tools/*`.
- Agent orchestration (AI SDK) lives in `lib/agents/*`.
- Scheduling lives in `lib/scheduler/*` and the `/api/cron` endpoint.
- Persistence uses Neon Postgres (via `lib/db/*`) plus local filesystem storage under `public/` (via `lib/storage/local.ts`).

## Primary Execution Flow

Manual task runs, cron runs, and UI scheduler runs all converge on the same server runner.

1. The UI or scheduler calls `POST /api/agent/execute` with a task id.
2. `lib/agent/runner.ts` resolves the task category and invokes a tool (research, media, agent, subagent, or prompt-based execution).
3. Tool modules call Gemini, Imagen, or Veo through wrappers in `lib/api/*`.
4. Outputs are persisted to the gallery table and to local files under `public/`.
5. Activities and task status updates are written back to the database.

## Agent Orchestration

- `POST /api/agent/chat` streams AI SDK agent responses using the orchestrator agent in `lib/agents/ai-sdk-agents.ts`.
- `POST /api/agent/stream` provides SSE updates for autonomous or orchestrator runs.
- `POST /api/agent/subagent` can spawn sub-agents (researcher, creator, reviewer, coder).

## Scheduling

- Browser scheduler (`lib/scheduler/*`) evaluates cron expressions client-side and calls `/api/agent/execute` for manual runs.
- Server cron endpoint (`GET /api/cron`) executes due tasks and is designed to be called by an external scheduler (Windows Task Scheduler in this repo).

## Persistence

- Database: Neon Postgres via `lib/db/neon.ts` and schema in `lib/db/schema.sql`.
- Local files: `lib/storage/local.ts` writes to `public/` (or a `MEDIA_ROOT_DIR` inside `public/`).
- Gallery items are stored in Postgres with file URLs pointing to local media.

## Naming Note

The codebase still contains the name "Agent Zero" in some system prompts and comments. The project name moving forward is Komorebi. Documentation in `docs/` uses Komorebi as the official name.
