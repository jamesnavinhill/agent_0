# KOMOREBI V2 ROADMAP

Date: 2026-02-05  
Status: In Progress (Phases 0-3 completed on 2026-02-06)

## Purpose

This roadmap resets Komorebi around current code reality, removes redundant UI surfaces, fixes reliability gaps, and prioritizes core capability completion (sandboxing, memory bridge, sub-agents).

## Audit Inputs Used

- Current docs source of truth: `docs/API.MD`, `docs/ARCHITECTURE.MD`, `docs/COMPONENTS.MD`, `docs/CONFIG.MD`, `docs/DATABASE.MD`, `docs/DEVELOPMENT.MD`, `docs/MEDIA_GENERATION.MD`, `docs/MODELS.MD`, `docs/SCHEDULING.MD`, `docs/STORAGE.MD`.
- Memory-bridge input: `docs/_legacy/first-convo.md`.
- Legacy planning context reviewed: `docs/_legacy/full-scope.md`, `docs/_legacy/schedule.md`, `docs/_legacy/self-hosting-roadmap.md`, `docs/_legacy/self-hosting-refactor-report.md`, `docs/_legacy/v1-roadmap.md`, `docs/_legacy/task.md`, `docs/_legacy/project_rules.md`.
- Code verification pass across panel, routing, hooks, DB, scheduler, gallery, sandbox, and agent/tool layers.

## Locked Direction For V2

These are treated as product decisions for this roadmap:

- Keep Live Monitor logs as the primary operational log surface.
- Remove standalone Thought Stream tab.
- Keep Thought Stream in Chat, but make it collapsible.
- Remove global top header/ready strip and reclaim space for page/tab content headers.
- Remove Create tab (or fully repurpose it only if explicitly re-scoped).
- Improve settings information architecture and accent color picker quality.
- Improve modal usability for Daily Brief and Gallery media.
- Fix gallery download behavior to return the actual media file.
- Keep sandboxing in roadmap with explicit migration/setup dependencies.
- Add memory/knowledge retrieval bridge for agent runtime.

## Verified Findings (Current State)

1. Activity Log is redundant and behavior is inconsistent.

- Evidence: `components/panels/activity-panel.tsx` renders Zustand-local `activities`, while `components/panels/monitor-panel.tsx` reads `/api/activity` (DB-backed log stream).
- Evidence: `lib/store/agent-store.ts` sets every added activity to `status: "running"`; multiple call sites generate mismatched IDs and fail to complete them (`hooks/use-agent-chat.ts`, `hooks/use-image-generation.ts`, `hooks/use-code-generation.ts`).
- Evidence: `lib/scheduler/executor.ts` adds execution activities but does not close lifecycle status.
- Impact: perpetual-running rows and trust erosion.

1. Thought Stream exists in two places.

- Evidence: standalone route in `app/page.tsx` (`case "thoughts"`) and chat-side panel render in `renderSecondaryPanel`.
- Impact: duplicate concept and nav clutter.

1. Chat Thought Stream is not practically collapsible on desktop.

- Evidence: collapse toggle is tied to `sidebarOpen` but header toggle button is `lg:hidden` in `app/page.tsx`.
- Impact: desktop cannot cleanly collapse the right-side thought stream from chat.

1. Global header duplicates panel headers and wastes vertical space.

- Evidence: global header in `app/page.tsx` plus local headers inside many panels (`chat`, `thoughts`, `activity`, `create`, `settings`, `sandbox`, etc.).
- Evidence: status state already exists in bottom bar (`components/agent/status-bar.tsx`).
- Impact: reduced usable canvas on every tab.

1. Chat input controls are not visually aligned as a coherent input row.

- Evidence: mixed button and textarea sizing in `components/input/multimodal-input.tsx` with `items-end` and uneven vertical rhythm.
- Impact: perceived quality drop on primary interaction surface.

1. Create tab does not provide durable value in current implementation.

- Evidence: `components/panels/create-panel.tsx` generates preview/code locally.
- Evidence: generation hooks write to local store (`addOutput`) but do not persist through `/api/gallery` (`hooks/use-image-generation.ts`, `hooks/use-code-generation.ts`, `lib/store/agent-store.ts`).
- Impact: user confusion ("create" appears non-persistent), overlaps with chat/tool workflows.

1. Sandbox project fetch/create failures are expected in default setup but not surfaced clearly.

- Evidence: sandbox tables are in `scripts/create-sandbox-tables.sql`, but `pnpm run db:migrate` only applies `lib/db/schema.sql` (`scripts/migrate.ts`, `package.json`).
- Evidence: sandbox API depends on tables in `lib/db/sandbox.ts` and routes under `app/api/sandbox/projects/*`.
- Evidence: UI shows generic errors (`hooks/use-sandbox.ts` throws generic messages).
- Impact: sandbox appears broken without explicit migration sequencing.

1. Agent runtime still lacks memory/knowledge retrieval bridge in chat orchestration.

- Evidence: `/api/chat` only streams model output from message history (`app/api/chat/route.ts`).
- Evidence: orchestrator toolset saves knowledge but has no retrieval tools (`lib/agents/tools/index.ts`).
- Evidence: memory endpoints exist for UI (`app/api/agent/memory/route.ts`) but not injected into agent context.
- Impact: stored memories/knowledge are underutilized during conversation and autonomous reasoning.

1. First-convo memory bridge suggestions are still unimplemented.

- Evidence from `docs/_legacy/first-convo.md`: active recall tool, passive context injection, and distillation layer were explicitly proposed.
- Impact: known design intent not yet translated into runtime architecture.

1. Settings API configuration is dense, single-column, and space-inefficient.

- Evidence: long, one-column collapsible form in `components/panels/settings-panel.tsx`.
- Impact: high cognitive load and weak scanability.

1. Accent color picker is basic (hue only), not full-range.

- Evidence: `ThemeProvider` stores only `accentHue` (`components/providers/theme-provider.tsx`), and settings expose presets + hue slider only.
- Impact: cannot produce the refined chroma/lightness control requested.

1. Daily Brief modal reading width is constrained.

- Evidence: gallery dialog uses `max-w-4xl`, with textual content constrained further by `max-w-3xl` (`components/panels/gallery-panel.tsx`).
- Impact: reduced readability for long-form Morning Brief content.

1. Gallery detail download behavior is incorrect for media in modal.

- Evidence: detail modal `handleDownload` always writes `.txt` (`components/panels/gallery-panel.tsx`).
- Impact: image/video item detail download does not match user expectation.

1. Gallery media modal composition wastes space and feels awkward.

- Evidence: fixed 85vh shell, broad padding, and capped media height (`max-h-[60vh]`) regardless of media type in `components/panels/gallery-panel.tsx`.
- Impact: oversized frame around undersized media.

1. Breadcrumb return path is incomplete.

- Evidence: "Stacks" button returns from stack detail, but "Creations >" text is not interactive (`components/panels/gallery-panel.tsx`).
- Impact: discoverability and navigation affordance mismatch.

1. Demo data still injects mock thoughts/activities/outputs/memories at startup.

- Evidence: `components/demo/demo-initializer.tsx`.
- Impact: violates "data truth/no mocks in production path" principle from legacy rules.

## V2 Delivery Phases (Checklist)

### [x] Phase 0: Baseline Reliability and Data Truth (Completed 2026-02-06)

Target: 1-2 days

Implementation:

- [x] Add explicit sandbox migration step to standard setup path (or merge sandbox tables into baseline migration strategy).
- [x] Add runtime preflight checks for required DB tables and clearer error messages.
- [x] Remove or gate demo initializer from production/dev default path.
- [x] Align activity lifecycle model so each start has a deterministic completion/error update.

Acceptance:

- [x] Fresh setup can run sandbox project list/create without hidden migration steps.
- [x] No perpetual-running activity rows after normal chat/create/scheduler usage.
- [x] No mock/demo records appear unless explicitly enabled.

### [x] Phase 1: Navigation and Telemetry Consolidation (Completed 2026-02-06)

Target: 2-3 days

Implementation:

- [x] Remove standalone Thoughts nav/tab.
- [x] Keep chat-side Thought Stream and add explicit desktop/mobile collapse control.
- [x] Decommission Activity tab (preferred) or convert it to a thin DB-backed view that does not duplicate monitor semantics.
- [x] Keep Live Monitor as the canonical operational log view.

Acceptance:

- [x] Single thought stream surface (chat sidebar).
- [x] Single canonical log surface (monitor).
- [x] Navigation reflects only active/meaningful features.

### [x] Phase 2: Header and Input UX Cleanup (Completed 2026-02-06)

Target: 1-2 days

Implementation:

- [x] Remove global top header strip from `app/page.tsx`.
- [x] Let each panel own its header and reclaim vertical space.
- [x] Keep bottom status bar as global status indicator.
- [x] Rebuild chat input row with strict alignment rules for textarea + attach/mic/send controls.

Acceptance:

- [x] No duplicated top "Ready" header.
- [x] Chat controls align consistently at all widths.

### [x] Phase 3: Settings IA and Accent Picker Upgrade (Completed 2026-02-06)

Target: 2-4 days

Implementation:

- [x] Restructure API configuration into responsive multi-column layout.
- [x] Group controls by function (chat, image, video, scheduling sync).
- [x] Replace hue-only picker with full-range picker.
- [x] Add 2D color field.
- [x] Add hue slider.
- [x] Add chroma slider.
- [x] Add lightness slider.
- [x] Update theme model from single `accentHue` to full accent token state.

Acceptance:

- [x] Settings use space efficiently on desktop while remaining usable on mobile.
- [x] Accent control supports precise color shaping (hue/chroma/lightness).

### [ ] Phase 4: Gallery and Modal Usability

Target: 2-3 days

Implementation:

- [ ] Fix modal download logic to branch by output type (image/video/audio/text/code) and download real media file when available.
- [ ] Improve media modal geometry so image/video are the primary visual focus with minimal dead space.
- [ ] Widen Daily Brief reading modal and tune prose width for long-form readability.
- [ ] Make breadcrumb root ("Creations") clickable to return to stacks.

Acceptance:

- [ ] Download from gallery detail returns expected file type.
- [ ] Daily Brief modal is comfortably readable on desktop.
- [ ] Media modal feels proportional to content.
- [ ] Breadcrumb supports return to stacks.

### [ ] Phase 5: Create Tab Resolution

Target: 1 day

Implementation:

- [ ] Remove Create tab and nav item (preferred, per current request), OR re-scope with persistence-first contract.
- [ ] If retained in future: all outputs must persist via `/api/gallery` and appear after refresh.

Acceptance:

- [ ] No dead-end creation workflow in navigation.

### [ ] Phase 6: Sandbox Completion Track

Target: 3-5 days

Implementation:

- [ ] Complete setup parity for sandbox DB lifecycle.
- [ ] Improve UI error surfacing with server message passthrough.
- [ ] Add health/readiness indicators for sandbox dependencies.
- [ ] Confirm fetch/create project flow and basic file/dependency/execution cycle.

Acceptance:

- [ ] Sandbox project CRUD works in default configured environment.
- [ ] Errors are actionable and explicit when prerequisites are missing.

### [ ] Phase 7: Memory Bridge and Agent Evolution

Target: 4-6 days

Implementation:

- [ ] Implement `recall_memory(query, layer?, limit?)`.
- [ ] Implement `search_knowledge(query, tags?, limit?)`.
- [ ] Implement passive context injection of top relevant memories/knowledge snippets into chat/agent prompts.
- [ ] Implement distillation layer summarizing completed tasks (Morning Read, Ritual, Media) into compact memory nodes.
- [ ] Add citation-capable memory references in responses where applicable.

Acceptance:

- [ ] Agent can cite specific memory/knowledge entries from storage during chat.
- [ ] Morning workflows produce both rich artifacts and distilled retrievable memory nodes.

## Cross-Cutting Quality Gates

- [ ] No mock data in production execution paths.
- [ ] UI state and DB state remain consistent after refresh.
- [ ] Each critical panel has at least one focused test path.
- [ ] Setup docs include all required migration steps for enabled features.

## Legacy Backlog Carried Forward (Validated)

- Memory retrieval and contextual injection (from V1 + first-convo bridge discussion) remains a core unfinished capability.
- Sandbox hardening and setup reliability from self-hosting roadmap remains partially complete.
- Task/schedule UX still needs final data-truth polish in several controls (toggle/edit affordances).
- Sub-agent feature exists, but should be integrated with stronger memory/sandbox context for practical utility.

## Suggested Execution Order

- [x] Phase 0 (stability, migrations, no-mock baseline)
- [x] Phase 1 + 2 (navigation consolidation + core UX cleanup)
- [x] Phase 3 (settings redesign + full accent controls)
- [ ] Phase 4 (gallery/modal fixes)
- [ ] Phase 5 (remove Create tab)
- [ ] Phase 6 + 7 (sandbox completion + memory bridge)

## V2 Definition of Done

- [ ] No redundant telemetry surfaces.
- [ ] No perpetual-looping activity artifacts in UI.
- [ ] Chat thought stream is collapsible and clean.
- [ ] Top global header removed; vertical space reclaimed.
- [ ] Create tab removed (or fully persistence-backed if reintroduced).
- [ ] Settings layout and accent picker are polished and space-efficient.
- [ ] Daily Brief and Gallery modals are readable and media-centered.
- [ ] Gallery download returns actual media files.
- [ ] Sandbox default setup path is explicit and functional.
- [ ] Agent can actively and passively use memory/knowledge in runtime.
