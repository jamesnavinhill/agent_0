# Agent Zero: Project Rules & Core Principles

**Version:** 1.0  
**Date:** January 19, 2026

This document defines the foundational principles for the development of Agent Zero. All code, architecture, and feature implementations must adhere to these rules to ensure specific, logical, and safe operation.

---

## 1. First Principles & Philosophy

* **Agentic Native:** The system is built for an autonomous agent, not just a user. Interfaces, APIs, and logs must be readable and actionable by the agent itself.
* **Data Truth:** **NO MOCKS** in production paths. The UI must reflect the actual state of the database. If data doesn't exist, the UI should be empty or show a loading state, never fake data.
* **Persistence:** Every creative output (text, image, code) must be persisted to the database (`gallery_items`, `knowledge`) and linked to an Activity. Nothing is ephemeral.
* **Modularity:** Each agent task or capability must reside in its own isolated file/module (e.g., `lib/agent/tools/morning-read.ts`). Avoid monolithic "god functions".

## 2. Architecture & Code Standards

* **Type Safety:** Strict TypeScript everywhere. No `any` unless absolutely necessary and documented.
* **Client/Server Separation:**
  * **Server:** core agent logic, DB access, secrets (`CRON_SECRET`).
  * **Client:** UI, reading state, triggering via secure API endpoints.
  * **Boundary:** Never import server-only code (like `neon.ts`) into client components. Use API routes as the bridge.
* **Database First:** State lives in Neon (Postgres). The Zustand store is a client-side cache, not the source of truth.

## 3. Execution & Scheduling

* **Unified Execution:** Whether triggered via Cron or "Start Now" button, the **exact same code path** must be executed.
  * *Pattern:* Client calls API -> API calls Server Function.
* **Activity Logging:** Every significant action start, step, and completion must be logged to the `activities` table.
* **Error Handling:** Fail gracefully. Log errors to the activity stream so the agent (and user) knows what went wrong.

## 4. UI/UX Guidelines

* **Real-Time Feedback:** The UI should react immediately to agent activities (via polling or SSE).
* **Aesthetics:** High-quality, "Premium" feel. Dark mode default. Glassmorphism where appropriate.
* **Transparency:** The user should always know *what* the agent is doing and *why* (via Thoughts/Activity panels).

## 5. Development Workflow

* **Atomic Commits:** Implementation plans must be granular. Test -> Commit -> Verify.
* **Documentation:** Update `docs/` when architecture changes. Keep `task.md` current.
* **Clean Up:** Remove temporary scripts and test files after use. Maintain a pristine codebase.
