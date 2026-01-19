# Sprint 5 - Implementation Plan

> **Date:** January 19, 2026
> **Status:** Planning
> **Focus:** Voice I/O, Multi-Agent Orchestration, Agent Visibility, Verification & Testing

---

## Executive Summary

Sprint 5 focuses on enhancing agent capabilities with voice input/output, multi-agent spawning, improved visibility into agent operations, and establishing a robust testing foundation. This sprint also includes a comprehensive review and validation of Sprints 1-4.

---

## Priority Items

### 1. Speech-to-Text (STT) - Browser-Based Whisper

**Current State:** `multimodal-input.tsx` records audio as a blob (`audio/webm`) and attaches it to messages, but **no transcription occurs**.

**Goal:** Stream user speech input directly to the chat input field using browser-based Whisper.

**Implementation:**

#### [NEW] [whisper-client.ts](file:///c:/Users/james/projects/agent_0/lib/voice/whisper-client.ts)

Browser-based Whisper integration using `@xenova/transformers` (runs entirely in-browser, no server needed, free):

```typescript
// Key functions:
// - loadWhisperModel(): Load whisper-tiny or whisper-base model
// - transcribeAudio(blob: Blob): Promise<string> - Transcribe audio blob to text
// - TranscriptionStream: Real-time transcription with interim results
```

#### [MODIFY] [multimodal-input.tsx](file:///c:/Users/james/projects/agent_0/components/input/multimodal-input.tsx)

- Add real-time transcription during recording
- Display interim results in the input field as user speaks
- Final transcription replaces blob attachment with text
- Add loading state for model initialization

**Dependencies to add:**

```json
"@xenova/transformers": "^3.3.3"
```

> [!NOTE]
> Using `@xenova/transformers` provides a fully browser-based solution with no API costs. Model size options:
>
> - `whisper-tiny` (~40MB) - Fast, good for real-time
> - `whisper-base` (~74MB) - Better accuracy

---

### 2. Text-to-Speech (TTS) - Agent Voice Output

**Current State:** No TTS capability exists.

**Goal:** Agent can speak any of its outputs, thoughts, or creations on-demand using a free, fast browser-based model.

**Implementation:**

#### [NEW] [tts-client.ts](file:///c:/Users/james/projects/agent_0/lib/voice/tts-client.ts)

Browser-based TTS using Web Speech API (free, built into all modern browsers):

```typescript
// Key functions:
// - speak(text: string, options?: TTSOptions): void
// - stop(): void
// - getVoices(): SpeechSynthesisVoice[]
// - TTSOptions: { rate, pitch, voice, onEnd }
```

#### [NEW] [use-tts.ts](file:///c:/Users/james/projects/agent_0/hooks/use-tts.ts)

React hook for TTS control:

```typescript
// Provides: { speak, stop, isSpeaking, voices, selectedVoice, setVoice }
```

#### [MODIFY] [chat-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/chat-panel.tsx)

- Add speaker icon button on each assistant message
- Add "Read All" button option
- Visual indicator when speaking

#### [MODIFY] [thoughts-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/thoughts-panel.tsx)

- Add ability to read thoughts aloud
- Toggle for auto-read new thoughts

#### [MODIFY] [activity-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/activity-panel.tsx)

- Add speak option for activity entries

> [!TIP]
> Web Speech API is completely free and requires no additional dependencies. For higher quality, a future enhancement could integrate ElevenLabs or similar, but browser TTS is sufficient for MVP.

---

### 3. Multi-Agent Spawning & Orchestration

**Current State:** [orchestrator.ts](file:///c:/Users/james/projects/agent_0/lib/autonomy/orchestrator.ts) exists with basic task proposal logic. No true multi-agent capability.

**Goal:** Enable the primary agent to spawn sub-agents for parallel task execution.

**Implementation:**

#### [NEW] [types.ts](file:///c:/Users/james/projects/agent_0/lib/agents/types.ts)

```typescript
interface SubAgent {
  id: string
  name: string
  role: "researcher" | "creator" | "executor" | "reviewer"
  status: "idle" | "working" | "complete" | "error"
  task?: string
  result?: unknown
}

interface AgentPool {
  maxAgents: number
  activeAgents: SubAgent[]
}
```

#### [NEW] [sub-agent.ts](file:///c:/Users/james/projects/agent_0/lib/agents/sub-agent.ts)

Sub-agent execution logic:

- Each sub-agent gets its own context
- Reports progress back to parent orchestrator
- Can execute specific task types

#### [NEW] [agent-pool.ts](file:///c:/Users/james/projects/agent_0/lib/agents/agent-pool.ts)

Agent pool manager:

- Spawn new sub-agents
- Track active agents
- Collect results
- Handle failures

#### [MODIFY] [orchestrator.ts](file:///c:/Users/james/projects/agent_0/lib/autonomy/orchestrator.ts)

- Add ability to spawn sub-agents for complex tasks
- Coordinate parallel execution
- Aggregate results

#### [NEW] [use-sub-agents.ts](file:///c:/Users/james/projects/agent_0/hooks/use-sub-agents.ts)

React hook for UI visibility into sub-agents:

- List active sub-agents
- Their current tasks and status
- Progress indicators

#### [MODIFY] [agent-store.ts](file:///c:/Users/james/projects/agent_0/lib/store/agent-store.ts)

Add sub-agent state:

```typescript
subAgents: SubAgent[]
addSubAgent: (agent: SubAgent) => void
updateSubAgent: (id: string, updates: Partial<SubAgent>) => void
removeSubAgent: (id: string) => void
```

---

### 4. Enhanced Agent Visibility (Thinking, Progress, Work)

**Current State:** [thoughts-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/thoughts-panel.tsx) and [activity-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/activity-panel.tsx) exist but show limited information. [monitor-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/monitor-panel.tsx) uses mock terminal data.

**Goal:** Surface real agent work, thinking, and progress to the user.

**Implementation:**

#### [MODIFY] [monitor-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/monitor-panel.tsx)

- Replace mock terminal with real activity log stream
- Live terminal output from task execution
- Progress bars for long-running tasks
- Real-time system metrics (tokens used, time elapsed)

#### [NEW] [agent-logger.ts](file:///c:/Users/james/projects/agent_0/lib/logging/agent-logger.ts)

Structured logging for agent operations:

```typescript
// Log levels: debug, info, action, thought, error
// Each log entry includes: timestamp, level, source, message, metadata
// Integrates with activity bus
```

#### [MODIFY] [bus.ts](file:///c:/Users/james/projects/agent_0/lib/activity/bus.ts)

- Add log levels to activity events
- Add source tracking (which component/agent)
- Add metadata support for richer events

#### [MODIFY] [thoughts-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/thoughts-panel.tsx)

- Show thinking chain with proper hierarchy
- Expand/collapse thought details
- Filter by thought type

#### [MODIFY] [activity-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/activity-panel.tsx)

- Real-time streaming from activity bus
- Better visual hierarchy
- Clickable to see details

---

### 5. Live Browser Preview

**Current State:** [monitor-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/monitor-panel.tsx) mentions browser preview but shows placeholder. [lib/browser/](file:///c:/Users/james/projects/agent_0/lib/browser/) has interface stubs.

**Goal:** Show live preview of what the agent sees when browsing.

**Implementation:**

#### [NEW] [headless-capture.ts](file:///c:/Users/james/projects/agent_0/lib/browser/headless-capture.ts)

Screenshot capture service:

- Capture current page state
- Return as base64 or blob URL

#### [NEW] [route.ts](file:///c:/Users/james/projects/agent_0/app/api/browser/screenshot/route.ts)

API endpoint for browser screenshots (if using server-side browser)

#### [MODIFY] [monitor-panel.tsx](file:///c:/Users/james/projects/agent_0/components/panels/monitor-panel.tsx)

- Add browser preview section
- Periodic screenshot refresh during browsing
- Action overlay showing clicks/typing

> [!WARNING]
> Full browser preview requires either:
>
> 1. **Client-side:** Using popup windows (current approach in browser tools)
> 2. **Server-side:** Puppeteer/Playwright running on a server
>
> For Sprint 5, we'll focus on showing the action log and last screenshot from popups.

---

### 6. Scheduled Task Adjustment

**Current State:** Default scheduled task in [agent-store.ts](file:///c:/Users/james/projects/agent_0/lib/store/agent-store.ts) has essay-related tasks that may be too aggressive.

**Goal:** Change default creative task to generate 1 solid essay (run often).

**Implementation:**

#### [MODIFY] [agent-store.ts](file:///c:/Users/james/projects/agent_0/lib/store/agent-store.ts)

Update default scheduled tasks:

```typescript
{
  id: "st2",
  name: "Write thoughtful essay",
  description: "Compose one thoughtful, well-researched essay on a topic of significance",
  schedule: "0 */6 * * *", // Every 6 hours
  category: "philosophy",
  enabled: true,
  prompt: "Write a single, comprehensive essay (800-1200 words) exploring a meaningful topic..."
}
```

---

## Sprint 1-4 Review & Validation

### Sprint 1: Foundation ✅

| Item | Status | Notes |
|------|--------|-------|
| UI shell | ✅ Complete | All panels exist |
| Gemini API integration | ✅ Complete | [gemini.ts](file:///c:/Users/james/projects/agent_0/lib/api/gemini.ts) working |
| Chat route streaming | ✅ Complete | SSE streaming in [route.ts](file:///c:/Users/james/projects/agent_0/app/api/chat/route.ts) |
| Orb animations | ✅ Complete | [agent-orb.tsx](file:///c:/Users/james/projects/agent_0/components/agent/agent-orb.tsx) with state animations |
| Memory persistence | ✅ Complete | [local-store.ts](file:///c:/Users/james/projects/agent_0/lib/memory/local-store.ts) using localStorage |

**Gaps to address:**

- [ ] Add logging to Gemini API calls
- [ ] Add error boundaries around orb component

---

### Sprint 2: Creation ✅

| Item | Status | Notes |
|------|--------|-------|
| Imagen 3 integration | ✅ Complete | [imagen.ts](file:///c:/Users/james/projects/agent_0/lib/api/imagen.ts), [route.ts](file:///c:/Users/james/projects/agent_0/app/api/generate/image/route.ts) |
| Gallery storage | ✅ Complete | [index.ts](file:///c:/Users/james/projects/agent_0/lib/gallery/index.ts) with localStorage |
| Code generation | ✅ Complete | [code-gen.ts](file:///c:/Users/james/projects/agent_0/lib/api/code-gen.ts), [route.ts](file:///c:/Users/james/projects/agent_0/app/api/generate/code/route.ts) |
| Browser tool foundation | ⚠️ Partial | Interfaces exist, popup-based implementation |

**Gaps to address:**

- [ ] Verify image generation actually saves to gallery
- [ ] Test code generation with various languages
- [ ] Add error handling for failed generations

---

### Sprint 3: Autonomy ⚠️

| Item | Status | Notes |
|------|--------|-------|
| Scheduler | ✅ Complete | [lib/scheduler/](file:///c:/Users/james/projects/agent_0/lib/scheduler/) with cron utilities |
| Task executor | ✅ Complete | [executor.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/executor.ts) |
| Orchestrator | ⚠️ Basic | [orchestrator.ts](file:///c:/Users/james/projects/agent_0/lib/autonomy/orchestrator.ts) - very conservative |
| Activity streaming | ⚠️ Partial | Bus exists, SSE endpoint scaffold only |

**Gaps to address:**

- [ ] Test scheduler with real task execution
- [ ] Implement real SSE streaming from activity bus
- [ ] Add orchestrator configuration UI
- [ ] Add task execution history/logs

---

### Sprint 4: Polish ⚠️

| Item | Status | Notes |
|------|--------|-------|
| Memory layers | ⚠️ Basic | Only localStorage, no semantic/vector |
| Browser tools | ⚠️ Popup | Opens in new window, no automation |
| Settings panel | ✅ Complete | API key, model, temperature |
| Export/download | ✅ Complete | Gallery export, memory export |

**Gaps to address:**

- [ ] Verify settings actually persist and apply
- [ ] Test export functionality
- [ ] Consider adding episodic memory

---

## Logging & Testing Infrastructure

### Logging

#### [NEW] [logger.ts](file:///c:/Users/james/projects/agent_0/lib/logging/logger.ts)

Centralized logging utility:

```typescript
// Console + Activity bus integration
// Filterable by level and source
// Persists to localStorage for debugging
```

#### Add logging to

- [ ] [gemini.ts](file:///c:/Users/james/projects/agent_0/lib/api/gemini.ts) - Log all API calls, responses, errors
- [ ] [imagen.ts](file:///c:/Users/james/projects/agent_0/lib/api/imagen.ts) - Log generation requests and results
- [ ] [executor.ts](file:///c:/Users/james/projects/agent_0/lib/scheduler/executor.ts) - Log task execution details
- [ ] [use-agent-chat.ts](file:///c:/Users/james/projects/agent_0/hooks/use-agent-chat.ts) - Log message flow

---

### Testing

> [!IMPORTANT]
> Currently no test files exist in the project. Sprint 5 will establish testing infrastructure.

#### [NEW] Testing Setup

**Install dependencies:**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

**Add to `package.json`:**

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

#### [NEW] [vitest.config.ts](file:///c:/Users/james/projects/agent_0/vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})
```

#### Priority Test Files to Create

| File | Tests |
|------|-------|
| [cron.test.ts](file:///c:/Users/james/projects/agent_0/tests/lib/scheduler/cron.test.ts) | Cron parsing, next run calculation |
| [local-store.test.ts](file:///c:/Users/james/projects/agent_0/tests/lib/memory/local-store.test.ts) | Save, retrieve, search, clear |
| [agent-store.test.ts](file:///c:/Users/james/projects/agent_0/tests/lib/store/agent-store.test.ts) | State mutations, persistence |
| [use-agent-chat.test.ts](file:///c:/Users/james/projects/agent_0/tests/hooks/use-agent-chat.test.ts) | Message flow, error handling |

---

## Verification Plan

### Automated Tests

After implementing test infrastructure:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### Manual Verification

#### STT Testing

1. Open the app in browser at `http://localhost:3000`
2. Click the microphone button in the input area
3. Speak a phrase clearly (e.g., "Hello, what can you do?")
4. Verify text appears in input field as you speak
5. Press Enter or click Send
6. Verify the message is processed correctly by the agent

#### TTS Testing

1. Send a message to the agent (e.g., "Tell me a short story")
2. Wait for the agent's response
3. Look for the speaker icon on the response bubble
4. Click the speaker icon
5. Verify audio plays through system speakers
6. Click stop button to interrupt playback

#### Multi-Agent Testing

1. Navigate to the Schedule panel
2. Create a complex research task
3. Run the task manually
4. Observe the thoughts/activity panel for sub-agent creation
5. Watch progress indicators for each sub-agent
6. Verify results are aggregated properly

#### Activity Streaming

1. Open the Activity panel
2. Perform various actions:
   - Send a chat message
   - Generate an image
   - Run a scheduled task
3. Verify each action appears in real-time
4. Click an activity to see expanded details

#### Browser Preview Testing

1. Use a browser tool (e.g., "Browse to producer.ai")
2. Check Monitor panel for preview section
3. Verify screenshot/action log appears
4. Observe action overlay showing agent interactions

---

## Implementation Order

### Phase 1: Testing & Logging Foundation (Days 1-2)

1. Set up Vitest and testing infrastructure
2. Create logger utility
3. Add logging to existing components
4. Write initial tests for scheduler and memory

### Phase 2: Voice I/O (Days 3-4)

1. Implement browser-based Whisper STT
2. Implement Web Speech API TTS
3. Integrate into multimodal input
4. Add speak buttons to panels

### Phase 3: Multi-Agent (Days 5-6)

1. Create sub-agent types and pool
2. Implement sub-agent execution
3. Enhance orchestrator
4. Add UI visibility

### Phase 4: Visibility & Polish (Days 7-8)

1. Enhance monitor panel with real data
2. Improve activity streaming
3. Add browser preview capability
4. Final integration testing

---

## Dependencies Summary

**New npm packages:**

```json
{
  "@xenova/transformers": "^3.3.3",
  "vitest": "^3.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "jsdom": "^26.0.0",
  "@vitejs/plugin-react": "^4.0.0"
}
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Whisper model size (40-74MB) | Lazy load, show progress indicator, cache in IndexedDB |
| Browser TTS quality varies | Allow voice selection in settings, document browser requirements |
| Sub-agent complexity | Start simple with 2-3 specialized agent roles |
| No existing tests | Prioritize critical path tests, add incrementally |

---

## Success Criteria

- [ ] **STT:** User can speak and see text appear in input within 2 seconds
- [ ] **TTS:** Agent responses can be spoken on demand with start/stop control
- [ ] **Multi-agent:** Complex tasks spawn sub-agents with visible progress
- [ ] **Visibility:** Real activities and logs stream to UI in real-time
- [ ] **Testing:** Core utilities have 80%+ code coverage
- [ ] **Logging:** All API calls and major agent actions are logged

---

## Questions for User

1. **TTS Voice Preference:** Any preference for voice characteristics (male/female, accent)?
2. **Multi-Agent Scope:** How autonomous should sub-agents be? Should they require user approval before executing?
3. **Testing Priority:** Any specific features/components you want tested first?
4. **Browser Preview:** Is popup-based browser interaction acceptable, or do you need embedded preview within the app?
