# Komorebi: V1.0 Consolidated Roadmap

**Status:** Active Execution  
**Current Phase:** Phase 2 (Data Truth & Persistence)

This roadmap outlines the path to a fully autonomous, "live" agent system. It consolidates previous plans into a single source of truth.

---

## ✅ Phase 1: Foundation (Completed)

* [x] **Core Stack:** Next.js 15, TypeScript, Tailwind, Shadcn UI.
* [x] **Database:** Neon Postgres configured (`tasks`, `activities`, `knowledge`, `gallery_items`).
* [x] **AI Integration:** Google Gemini 3.0/2.5 SDKs integrated.
* [x] **Basic UI:** Chat, Activity, Thoughts, and Settings panels.

## 🔄 Phase 2: Data Truth & Persistence (Current Focus)

The goal is to remove all mocks and ensure "What you see is what exists".

* [x] **Unified Execution Architecture:**
  * Created `lib/agent/runner.ts` as the single source of truth for task logic.
  * Implemented `/api/agent/execute` for production-grade manual triggering.
  * Aligned Cron and Manual execution paths.
* [x] **Morning Read Pipeline:**
  * Google Search Grounding enabled.
  * Outputs persisted to `gallery_items`.
  * Knowledge persisted to `knowledge` table.
* [x] **Gallery Persistence:** Ensure Gallery UI fetches from DB (server-side) and displays real items.
* [ ] **Schedule Panel Real Data:** Refactor Schedule Panel to fetch/manage tasks completely from DB (remove mock goals).
* [ ] **Memory System:** Ensure `addMemory` connects to DB vector search (pgvector).

## 🚀 Phase 3: Expanded Capabilities (Modular Tasks)

Each task will be a modular file in `lib/agent/tools/`.

* **Task 1: The Morning Read (Optimization)**
  * *Status:* V1 Executable & Optimized.
  * *Notes:* Prompt refined for high-signal content; Modal UI improved.
* **Task 3: AI Art Generation (Meaningful Media)**
  * *Status:* V1 Executable via UI & Terminal.
  * *Goal:* Daily "Bridge" art piece that visualizes the agent's memory state.
  * *Model:* `gemini-2.5-flash-image` (default), supports Imagen 4.0 models.
  * *Notes:* Unified execution path - uses `/api/agent/execute` → `runner.ts` → `performDailyArt()`.
* **Task 4: Philosophical Essay**
  * *Goal:* Long-form creation saved to Gallery.

## 🛠 Phase 4: Polish & Stability

* **Error Recovery:** If a task fails, retry logic or "post-mortem" log.
* **Voice I/O:** Complete One-Click Audio integration (Whisper/TTS).
* **Mobile Responsiveness:** Ensure dashboard works on mobile.
* **Deployment:** GitHub Actions "Heartbeat" to keep Vercel alive.

---

## Immediate Next Steps

1. **Refactor Schedule Panel:** Remove `mockGoals` from the UI store and wire up real Task CRUD operations.
2. **Gallery UI Connection:** Connect the Gallery Grid to the real database `gallery_items`.
3. **Strict Typing:** Continue strictly typing the `Task` and `Activity` interfaces across the stack.

