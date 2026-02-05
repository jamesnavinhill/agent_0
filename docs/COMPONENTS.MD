# COMPONENTS

Last reviewed: 2026-02-05 (local)

This document lists the major UI components and their roles based on the current `components/` directory.

## Panels

Panels are top-level views rendered in the main UI.

- `components/panels/activity-panel.tsx` shows recent activity events.
- `components/panels/chat-panel.tsx` renders the main chat interface.
- `components/panels/create-panel.tsx` handles manual creation workflows.
- `components/panels/gallery-panel.tsx` shows images, videos, and other outputs.
- `components/panels/memory-panel.tsx` shows memory and knowledge items.
- `components/panels/monitor-panel.tsx` shows task execution logs.
- `components/panels/sandbox-panel.tsx` manages sandbox projects and executions.
- `components/panels/schedule-panel.tsx` manages scheduled tasks and manual runs.
- `components/panels/settings-panel.tsx` manages UI and model settings.
- `components/panels/sub-agents-panel.tsx` controls sub-agent execution.
- `components/panels/thoughts-panel.tsx` displays agent thoughts.

## Navigation and Layout

- `components/navigation/*` controls the sidebar and nav UI.
- `components/providers/theme-provider.tsx` provides theme and accent color state.
- `components/error-boundary.tsx` provides UI safety for component errors.

## Agent UI

- `components/agent/*` contains agent-specific UI widgets.
- `components/input/*` handles the multimodal input area.

## UI Building Blocks

- `components/ui/*` contains Shadcn UI and Radix-based primitives.

## State and Hooks

- `lib/store/agent-store.ts` holds global UI state (messages, activities, outputs, tasks, memory).
- `hooks/use-settings.ts` persists UI settings (models, temperature, schedules).
- `hooks/use-memory.ts` handles memory export logic.
