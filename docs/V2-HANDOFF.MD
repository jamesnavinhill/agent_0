# KOMOREBI V2 HANDOFF

Date: 2026-02-05  
Purpose: Session handoff + execution protocol for implementing `docs/V2-ROADMAP.MD` phase-by-phase with minimal re-discovery.

## How To Use This Handoff

When starting a new session, provide:

- `docs/V2-ROADMAP.MD`
- `docs/V2-HANDOFF.MD`
- Prompt: `Implement Phase X`

The executing agent should treat this document as operational instructions and `docs/V2-ROADMAP.MD` as scope/acceptance criteria.

## Source Of Truth Order

1. Current codebase behavior.
2. Current uppercase docs in `docs/`:

- `docs/API.MD`
- `docs/ARCHITECTURE.MD`
- `docs/COMPONENTS.MD`
- `docs/CONFIG.MD`
- `docs/DATABASE.MD`
- `docs/DEVELOPMENT.MD`
- `docs/MEDIA_GENERATION.MD`
- `docs/MODELS.MD`
- `docs/SCHEDULING.MD`
- `docs/STORAGE.MD`

3. `docs/V2-ROADMAP.MD` (phase plan and acceptance).
4. Legacy docs only for context, never overrule code/current docs.

## Phase Execution Contract

For any `Implement Phase X` request, execute in this order:

1. Read phase scope + acceptance in `docs/V2-ROADMAP.MD`.
2. Verify current implementation status in code before editing.
3. Implement only in-phase items unless blockers force scoped prerequisite changes.
4. Run relevant checks/tests.
5. Update docs (required):

- Mark phase status and completion date in `docs/V2-ROADMAP.MD`.
- Append a completion entry in `docs/V2-HANDOFF.MD` under `Phase Completion Log`.

1. Summarize:

- What changed
- What was validated
- Any residual risks/open items

## Required Setup / Validation Commands

Run as needed for each phase:

```powershell
pnpm install
pnpm run lint
pnpm run test
pnpm run build
```

DB-related phases (0, 6, 7) may also require:

```powershell
pnpm run db:migrate
node scripts/run-migration.mjs sandbox
pnpm run db:check
```

If a command cannot run, document why and what was validated instead.

## Non-Negotiable Guardrails

- No mock/demo data in production path (see `components/demo/demo-initializer.tsx`).
- No destructive git/file reset behavior.
- Keep changes focused to the active phase.
- Preserve API contracts unless explicitly included in phase scope.
- Do not regress Live Monitor as canonical operational log surface.
- Keep docs in `docs/` uppercase filenames.

## Known Hotspots (From V2 Audit)

- Activity status lifecycle mismatch:
- `lib/store/agent-store.ts`
- `hooks/use-agent-chat.ts`
- `hooks/use-image-generation.ts`
- `hooks/use-code-generation.ts`
- `lib/scheduler/executor.ts`
- Duplicate telemetry surfaces:
- `components/panels/activity-panel.tsx`
- `components/panels/monitor-panel.tsx`
- Thought stream duplication/collapse behavior:
- `app/page.tsx`
- `components/panels/thoughts-panel.tsx`
- `components/navigation/nav-rail.tsx`
- Create persistence gap:
- `components/panels/create-panel.tsx`
- `hooks/use-image-generation.ts`
- `hooks/use-code-generation.ts`
- Sandbox migration dependency:
- `scripts/migrate.ts`
- `scripts/create-sandbox-tables.sql`
- `lib/db/sandbox.ts`
- Memory bridge gap:
- `app/api/chat/route.ts`
- `app/api/agent/chat/route.ts`
- `lib/agents/tools/index.ts`
- `app/api/agent/memory/route.ts`
- Settings/accent architecture:
- `components/panels/settings-panel.tsx`
- `components/providers/theme-provider.tsx`
- `app/globals.css`
- Gallery modal/download behavior:
- `components/panels/gallery-panel.tsx`
- `lib/utils/export-utils.ts`

## Phase Completion Log

Use this format after each completed phase.

### Template

```md
## Phase N Completed - YYYY-MM-DD

Scope completed:
- ...

Acceptance checks:
- [x] ...
- [x] ...

Validation run:
- `pnpm run lint` -> pass/fail
- `pnpm run test` -> pass/fail
- `pnpm run build` -> pass/fail

Docs updated:
- `docs/V2-ROADMAP.MD` (status updated)
- `docs/V2-HANDOFF.MD` (this entry added)

Residual risks / follow-ups:
- ...
```

### Entries

- None yet.

## Quick Start Prompt For Next Agent

Use this exact pattern:

```text
Implement Phase X from docs/V2-ROADMAP.MD using docs/V2-HANDOFF.MD as execution protocol.
On completion, update both docs with status, validations, and residual risks.
```
