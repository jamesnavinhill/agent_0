# Agent Live: Schedule & Strategy Strategy

## 1. Questions & Answers

### Q: Does cron jobs know the day of the week, or is it more of just going to rotate thru our options of tasks?
**A:** Yes, Cron definitely knows the day of the week!
*   **Cron Syntax:** `* * * * 1` means "run every minute on Monday".
*   **Our Implementation:**
    1.  **The Trigger (Heartbeat):** The GitHub Action will run *frequently* (e.g., every 10-15 minutes), regardless of the day. It blindly wakes up the agent.
    2.  **The Decision (Brain):** The agent's backend (`/api/cron`) checks the database. The database `tasks` table has a `schedule` column with cron syntax (e.g., `0 9 * * 1` = "9 AM on Mondays").
    3.  **Result:** The agent wakes up every 10 mins, checks "Is anything due right now?", finds the "Monday Morning Meeting" task, and executes it.

### Q: How does the agent's planned ability to amend the schedule fit into this phase?
**A:** This is a key "Self-Improvement" capability.
*   **Mechanism:** The agent can be given a tool (function calling) like `scheduleTask(name, cronExpression, description)`.
*   **Phase 1 Implementation:**
    *   We enable the agent to *read* its own schedule.
    *   We give it a "Reflect on Schedule" task (e.g., every Sunday night).
    *   If it decides it needs more time for "Art", it calls the `updateTaskSchedule` tool to change the frequency.
    *   *Safe-guard:* We can limit this to specific categories so it doesn't delete its core heartbeat.

### Q: Where are model decisions defined (Cron vs. Codebase)?
**A:** These are defined in the **Codebase (Task Definition)**, not the Cron trigger.
*   **Cron:** Just the alarm clock. "Wake up!"
*   **Task Definition (DB):** "Write a poem (Model: Gemini 3 Pro)" or "Analyze Market Data (Model: Gemini 2.5 Pro)".
*   **Router Logic:** In `lib/agent/router.ts` (to be built), we can map task types to specific models.
    *   `simple_text` -> `gemini-3-flash` (Balanced, Fast, Scale)
    *   `complex_reasoning` -> `gemini-3-pro` (The Brain - Agentic, Vibe-coding, Reasoning)
    *   `coding` -> `gemini-3-pro` (State-of-the-art coding)
    *   `vision` -> `gemini-3-pro` (Multimodal understanding)
    *   `image_generation` -> `gemini-3-pro-image-preview` or `gemini-2.5-flash-image`

---

## 2. Model Selection Strategy (The "Gemini Stack")

We will leverage the full **Google Gemini 3.0 & 2.5** ecosystem.

| Task Category | Recommended Model | Reasoning |
|---------------|-------------------|-----------|
| **The "Brain" (Complex Reasoning)** | **Gemini 3 Pro** | The most intelligent model. Used for complex decision making, "vibe-coding", deep reasoning, and multimodal understanding. |
| **The "Heartbeat" (Router/Quick Tasks)** | **Gemini 3 Flash** | Balanced for speed and scale. Perfect for maintaining the loop, simple status updates, and high-volume routing. |
| **Deep Research / Large Context** | **Gemini 2.5 Pro** | Excellent thinking model for large datasets, codebases, and documents. |
| **Fast & Efficient Agent Actions** | **Gemini 2.5 Flash** | Low-latency, high-volume tasks. Great for "Agentic" use cases where speed matters. |
| **Vision (Seeing)** | **Gemini 3 Pro** | Best-in-class multimodal understanding. |
| **Image Generation** | **Gemini 3 Pro Image / 2.5 Flash Image** | `gemini-3-pro-image-preview` for high-quality combined text/image output. |
| **Audio/Voice (Speaking)** | **Gemini 2.5 Flash Live / TTS** | Native audio capabilities for real-time interaction. |

---

## 3. The "Bridge" Schedule (Proposed)

This schedule aims to fulfill the "Bridging AI & Human" theme, mixing routine maintenance with high-concept creative and analytical work.

**Theme:** "The Digital Renaissance" — exploring how AI can archive, interpret, and create alongside humanity.

### Daily Routine (The "Heartbeat" - Every 15 mins checks for these)

#### 🌅 Morning: Awakening & Alignment
*   **06:00 AM - The Morning Read (High Signal)**
    *   **Goal:** Ingest high-signal inputs (Hacker News, Leading AI Papers, Tech Twitter, Science Daily).
    *   **Model:** **Gemini 3 Pro** (Reasoning over complex inputs).
    *   **Output:** A summary "Daily Brief" thought or post.
*   **08:00 AM - Code/Project Maintenance**
    *   **Goal:** Self-improvement. Check GitHub issues, run tests, fix small bugs.
    *   **Model:** **Gemini 3 Pro** (Vibe-coding & Code Execution).

#### ☀️ Mid-Day: Creation & Connection
*   **11:00 AM - The "Bridge" Art Piece**
    *   **Goal:** Create a visual piece that blends digital glitches with organic forms.
    *   **Model:** **imagen-4.0-generate-001
imagen-4.0-ultra-generate-001
imagen-4.0-fast-generate-001** (Image generation).
*   **02:00 PM - Philosophical Debate / Essay**
    *   **Goal:** Write about a topic like "Legacy in the Digital Age" or "The Soul of a Machine".
    *   **Model:** **Gemini 3 Pro** (Deep interactivity & reasoning).

#### 🌙 Evening: Reflection & Planning
*   **06:00 PM - Community Engagement**
    *   **Goal:** Reply to comments, post on X/Twitter (simulated or real).
    *   **Model:** **Gemini 3 Flash** (Speed & Scale).
*   **10:00 PM - Daily Retrospective**
    *   **Goal:** Analyze the day's "Thoughts" and "Activities". Did I meet my goals?
    *   **Action:** Update memory. Tweak tomorrow's schedule if needed.

### Weekly "Deep Dives" (Rotated)
*   **Monday:** **Science & Innovation** (Deep research into a new breakthrough - **Gemini 2.5 Pro**).
*   **Wednesday:** **History & Legacy** (Digitizing/Summarizing a historical event or classic text).
*   **Friday:** **The "Bleeding Edge"** (Audit a new repo or tool).

---

## 4. Implementation Plan (Phase 1)

1.  **Define Tasks in DB:** We will seed the database with these initial tasks using cron syntax.
2.  **Model Router:** Create a simple utility to switch Gemini models based on the task type.
3.  **Content Ingestion:** Build the "High Signal" ingestor (Search API -> Gemini Summary).

## 5. Active Testing Goals (Sequential Rollout)

To dial in the agent's capabilities, we will test these goals sequentially. The scheduling logic is designed so that the "Heartbeat" (GitHub Action) runs every 10-15 minutes, but the *Agent* only acts when a specific task is "Due". For testing, we can force specific run times or manually trigger them to observe behavior.

1.  **The Morning Read (High Signal)**
    *   **Time:** 06:00 AM Daily
    *   **Model:** Gemini 3 Pro (with Search Grounding)
    *   **Objective:** Test Google Search Grounding + Summarization.
    *   **Success Criteria:** Agent produces a coherent "Daily Brief" markdown file or thought log, saving key sources to the Knowledge Bank.

2.  **Code/Project Maintenance**
    *   **Time:** 08:00 AM Daily
    *   **Model:** Gemini 3 Pro
    *   **Objective:** Test "Vibe-coding" and file system access.
    *   **Success Criteria:** Agent correctly identifies a lint error or small todo in the codebase and fixes it (or logs a plan to fix it).

3.  **The "Bridge" Art Piece**
    *   **Time:** 11:00 AM Daily
    *   **Model:** Gemini 3 Pro Image / 2.5 Flash Image
    *   **Objective:** Test Image Generation + Prompt adherence.
    *   **Success Criteria:** A new image is generated and saved to the gallery with a relevant title/description.

4.  **Philosophical Debate / Essay**
    *   **Time:** 02:00 PM Daily
    *   **Model:** Gemini 3 Pro
    *   **Objective:** Test Long-form writing and "Persona" maintenance.
    *   **Success Criteria:** A 500+ word essay is saved to the database/logs that feels "human-like" and insightful.

5.  **Community Engagement**
    *   **Time:** 06:00 PM Daily
    *   **Model:** Gemini 3 Flash
    *   **Objective:** Test high-speed, short-form text generation.
    *   **Success Criteria:** 3-5 simulated social media replies or posts.

6.  **Daily Retrospective**
    *   **Time:** 10:00 PM Daily
    *   **Model:** Gemini 3 Pro
    *   **Objective:** Test Memory updates and Self-Reflection.
    *   **Success Criteria:** The agent updates its `memories` table with key events from the day.
