# Agent Zero: V1.0 Consolidated Roadmap

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

* [x] **Morning Read Pipeline Fix:**
  * Unified execution path (Client uses generic API endpoint).
  * Persisted outputs to `gallery_items`.
  * Persisted knowledge to `knowledge` table.
* [ ] **Gallery Persistence:** Ensure Gallery UI fetches from DB (server-side) and displays real items.
* [ ] **Schedule Panel Real Data:** Refactor Schedule Panel to fetch/manage tasks completely from DB (remove mock goals).
* [ ] **Memory System:** Ensure `addMemory` connects to DB vector search (pgvector).

## 🚀 Phase 3: Expanded Capabilities (Modular Tasks)

Each task will be a modular file in `lib/agent/tools/`.

* **Task 1: The Morning Read (Optimization)**
  * *Status:* V1 Executable.
  * *Next:* Improve prompt for better formatting, link validation.
* **Task 2: Code Maintenance**
  * *Goal:* Agent reads its own repo, runs `tsc`, and logs issues.
  * *Model:* Gemini 3 Pro (Vibe-coding).
* **Task 3: AI Art Generation**
  * *Goal:* Daily "Bridge" art piece.
  * *Model:* Imagen / Gemini Image.
* **Task 4: Philosophical Essay**
  * *Goal:* Long-form creation saved to Gallery.

## 🛠 Phase 4: Polish & Stability

* **Error Recovery:** If a task fails, retry logic or "post-mortem" log.
* **Voice I/O:** Complete One-Click Audio integration (Whisper/TTS).
* **Mobile Responsiveness:** Ensure dashboard works on mobile.
* **Deployment:** GitHub Actions "Heartbeat" to keep Vercel alive.

---

## Immediate Next Steps

1. **Verify Morning Read Fix:** Ensure "Start Now" button works and updates the DB.
2. **Refactor Schedule Panel:** Remove `mockGoals` and wire up real Task CRUD.
3. **Clean Code:** Remove unused scripts and verify strict type safety.
