# The Flush Plan: From Prototype to Production

## 1. Audit Findings (The "Reality Check")

Use this audit to understand why the app feels "mocked" and "disconnected".

### 🔴 Critical Ops Issues

1. **Disconnect between "Monitor" and "Agent"**
    - **Issue**: `components/panels/monitor-panel.tsx` subscribes to a **client-side** `EventEmitter`. The Agent (running in `/api/chat` or `/api/agent`) emits events on the **server-side**.
    - **Result**: The terminal will NEVER show what the server is doing. They are on two different computers (User's Browser vs Vercel Server).
    - **Fix**: Implement Server-Sent Events (SSE) or Database Polling. The Agent writes logs to Neon DB; The Client polls (or streams) these logs.

2. **Scheduler will NOT work on Vercel**
    - **Issue**: `lib/scheduler/index.ts` relies on `setInterval` and an in-memory `Scheduler` class.
    - **Result**: On Vercel (Serverless), the process freezes/dies immediately after a request finishes. Your implementation dies every time the page loads.
    - **Fix**: Move to **Vercel Cron Jobs** + Database.
        - Create `app/api/cron/route.ts`.
        - Configure `vercel.json` to hit it every X minutes.
        - Store tasks in Neon DB.

3. **Mocked UI Components**
    - **Monitor Panel**: "Browser" view is hardcoded HTML (`Agent browsing arxiv.org...`).
    - **Schedule Panel**: `mockGoals` and `mockTasks` are hardcoded in the React component. They do not persist.

## 2. The Plan

We will execute this in layers.

### Phase 1: The "Spinal Cord" (Database & Events)

*Objective: Connect the brain (Server) to the body (Client).*

- [ ] **Database Schema**: Create tables in Neon (`activites`, `tasks`, `goals`).
- [ ] **Activity Logger**: Rewrite `lib/activity/bus.ts` to write events to Neon DB `activities` table.
- [ ] **Activity API**: Create `GET /api/activity` (polled by SWR) or `GET /api/stream` (SSE) to feed the Monitor Panel.
- [ ] **Wire Monitor**: Update `monitor-panel.tsx` to fetch real data from this API.

### Phase 2: The "Clock" (Scheduler)

*Objective: Make the agent fully autonomous.*

- [ ] **Persistence**: Rewrite `use-scheduler` hook to fetch/save tasks to `GET/POST /api/tasks`.
- [ ] **Execution Engine**: Move logic from `Scheduler` class (memory) to `/api/cron` (stateless).
- [ ] **Trigger**: Add `vercel.json` cron config.

### Phase 3: The "Eyes" (Real Browser Visibility)

*Objective: Show what the agent is actually seeing.*

- [ ] **Browser Snapshot**: When the agent uses `browser` tool, standard output is text. We need it to capture a screenshot or DOM snapshot.
- [ ] **Storage**: Upload snapshot to **Vercel Blob**.
- [ ] **Display**: Return the Blob URL in the Activity Log. Monitor Panel displays this image.

### Phase 4: Unmocking the UI (Goals & Tasks)

*Objective: CRUD for everything.*

- [ ] **Goals**: Create table `goals`. Wire `SchedulePanel` to `POST /api/goals`.
- [ ] **Feedback**: Add toast notifications for "Saved", "Deleted".

## 3. Implementation Order

1. **Migrate Activity Bus** (Fixes "No terminal activity")
2. **Unmock Scheduler** (Fixes "Schedule not working")
3. **Unmock Goals** (Fixes "Placeholders")
4. **Browser Visibility** (Fixes "I don't see the agent working")

## 4. Why Vercel Blob/Neon?

- **Neon**: Stores the *text* logs and task schedules.
- **Vercel Blob**: Stores the *images* (screenshots) the agent sees.
- **Vercel Cron**: Wakes the agent up to check the schedule.

---
**Status**: Ready to Execute Phase 1.
