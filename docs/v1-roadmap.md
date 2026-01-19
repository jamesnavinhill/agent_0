# Agent Live: V1.0 Roadmap & Audit

## 1. System Audit: Existing Implementation

### Status Overview
The current codebase establishes a solid foundation for the agent architecture but relies on a mix of real backend logic and mocked frontend data for demonstration purposes.

### Component Analysis

| Component | Status | Implementation Details |
|-----------|--------|------------------------|
| **Database** | ✅ **Real** | Neon Postgres configured. Tables for `tasks` exist and are queried via `lib/db/tasks.ts`. |
| **Scheduler (Backend)** | ✅ **Real** | Custom cron parser in `lib/scheduler/cron.ts`. `/api/cron` endpoint executes real logic using Gemini. |
| **Scheduler (UI)** | ⚠️ **Hybrid** | `SchedulePanel` displays some real tasks (`useAgentStore`) but **heavily relies on mocked goals** (`mockGoals` array with "Create AI Art Collection" etc.) for the progress bars (1/4, 2/3). |
| **Agent Store** | ⚠️ **Hybrid** | `lib/store/agent-store.ts` connects to `/api/tasks` but contains hardcoded initial state for demonstration (`tasks` array). |
| **Agent Logic** | 🚧 **Partial** | Basic "Text Generation" task execution is implemented. Complex capabilities (Computer Use, Image Gen) are stubbed or limited. |
| **Trigger Mechanism** | ❌ **Blocked** | Relies on Vercel Cron (`* * * * *`) which is currently failing due to platform limits. |

### Clarification on User Questions
*   **"What triggers the agent to begin working?"**
    *   Currently, the **Vercel Cron Job** is the sole trigger. It hits `/api/cron` which checks the DB for due tasks.
    *   **Issue:** If the cron job fails (as it is now), the agent does nothing. It does not "wake up" on its own.
    *   **Fix:** We must switch to an external reliable trigger (GitHub Actions) to ensure the heartbeat continues.

## 2. V1.0 Roadmap

This roadmap focuses on moving from "Demo/Mock" state to a fully functional "Live" system.

### Priority 1: Core Reliability (The Heartbeat)
*   **Difficulty:** Low
*   **Goal:** Ensure the agent actually runs on schedule. * The schedule.. this is crucial. will be dialing it in and adjusting. worth considering an protected admin page/api where i can adjust while its live. for now lets rock with every 15 minutes as we test out its abilities. of course we want good insights into the logging, processes etc for dialing in and debugging. i think its worth it to introduce whatever makes sense here thru vercel, idk if there speed insights or analytics give us any valuable info for those in particularly (well add them eventually anyways so if there helpful at all we can add these here during this phase)
*   **Action:**
    1.  **Remove** Cron config from `vercel.json`.
    2.  **Create** GitHub Action workflow (`.github/workflows/scheduler.yml`) to ping `/api/cron` every 10-15 mins.
    3.  **Verify** execution logs in GitHub.

### Priority 2: Data Truth (Remove Mocks)
*   **Difficulty:** Medium
*   **Goal:** UI should only show what is actually happening. *We want this to be really robust - clean and well implemented. we had created the mock ui/ux and are happy with the overall layout, placement (minus a few tweaks) but we should stick to this when possible as well as assure to remove any unused and surface, on brand, anything that wasnt mocked that we want to surface. each page and section has value from our original plan and ambition. a systematic way to assure this is dialed in and top notch is worth a bit of extra time and planning
*   **Action:**
    1.  **Database Schema**: Create `goals` table (linked to `tasks`).
    2.  **Backend**: Create CRUD endpoints for Goals.
    3.  **Frontend**: Refactor `SchedulePanel` to fetch Goals from API instead of `const mockGoals`.
    4.  **Store**: Update `useAgentStore` to remove hardcoded `tasks` and manage state purely from API responses.

### Priority 3: Expanded Capabilities (The Brain)
*   **Difficulty:** High
*   **Goal:** Enable the agent to do more than just "Generate Text". * Next session planning for a full analysis and outline.
*   **Action:**
    1.  **Tool Integration**: Implement real handlers for:
        *   `morningRead`: Use **Gemini Search Grounding** to research high-signal sources.
        *   `generateImage`: Use **Imagen 3** / Gemini Pro Image models.
        *   `computerUse`: Use E2B Sandbox for safe execution.
    2.  **Memory & Output System**:
        *   **Knowledge Bank**: Store researched papers/reports in a `knowledge` table (title, url, summary, embedding).
        *   **Output Gallery**: Ensure the UI (Gallery Panel) fetches from `gallery_items` table where we store Art, Essays, and Reports.
        *   **Logs**: Store browser history and "thought process" in `activities` table for the Live Monitor.

### Priority 4: Third-Party Vendors & Integration
*   **LLM Provider**: **Google Gemini** (Current implementation). Consider fallback to **OpenAI** or **Anthropic** for specific complex tasks. *were happy with googles offering, well look to add some specific models for specific tasks, but we have the sub to google ai pro, and dont want to spend money on other providers currently. having the ability to plug in other providers may prove useful, certainly for the opensource code for others to enjoy, but for us and this particular stage for v1, were not interested in other providers
*   **Database**: **Neon** (Serverless Postgres). Excellent choice, keep it.
*   **Orchestration**: **GitHub Actions** (Recommended). Free, reliable.
*   **Browser/Computer Use**: **E2B** or **Browserless.io**.
    *   *Note:* Running browser sessions directly in Vercel Serverless Functions is difficult due to size/timeout limits.
    *   *Recommendation:* Use **E2B** Sandbox for safe, sandboxed code execution and browser control. *Open to your reco here with e2b. certainly prefer the cleaner safer route where possible. 

### Decision Trade-offs
*   **GitHub Actions vs. Vercel Cron**: GitHub Actions introduces a slight external dependency but offers significantly better free-tier limits and logs.
*   **Mock Removal**: Will make the UI look "empty" initially until the agent actually creates data. This is necessary for a real audit. We might want to keep a "Demo Mode" toggle for showing off the UI capabilities.

## 3. Next Steps (Immediate)
1.  **Execute Priority 1**: Fix the deployment and scheduling immediately.
2.  **Execute Priority 2**: Clean up the `SchedulePanel` to reflect real state.

---
*Based on `docs/full-scope.md` and codebase audit.*
