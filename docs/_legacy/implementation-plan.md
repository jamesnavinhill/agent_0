# Komorebi - Implementation Plan

> Bringing the UI shell online with a living, autonomous AI agent.

---

## Vision

A **living agent** that:

- Responds to user input and runs scheduled autonomous tasks
- Creates art, music, code, and content using **Google Gemini APIs**
- Uses browser tools to interact with external services (producer.ai, v0.app)
- Maintains persistent memory across sessions
- Showcases its creations in a gallery
- Feels **alive**—breathing, thinking, responding visually to states

---

## Phase 1: Core Agent Loop

### 1.1 Gemini API Integration

**Replace current AI SDK setup with Google Gemini**

```
lib/
  api/
    gemini.ts          # Gemini client wrapper (adaptable interface)
    types.ts           # Shared types for all API calls
```

**Key endpoints to implement:**

- `gemini-2.0-flash` for fast conversational responses
- `gemini-2.0-pro` for complex reasoning/planning
- `imagen-3` for image generation
- `veo-2` for video generation (when available)

**Implementation notes:**

- Use `@google/generative-ai` SDK
- Create an abstraction layer so models can be swapped easily
- Environment: `GOOGLE_API_KEY`

**Reference:** <https://ai.google.dev/gemini-api/docs>

---

### 1.2 Agent State Machine

Enhance the existing `agent-store.ts` to support:

```typescript
type AgentMode = 
  | "interactive"    // Responding to user
  | "autonomous"     // Running scheduled task
  | "creating"       // Generating content
  | "browsing"       // Using browser tools
  | "idle"           // Waiting

interface AgentContext {
  currentTask?: ScheduledTask
  currentGoal?: Goal
  creationInProgress?: {
    type: "image" | "music" | "code" | "video"
    status: "pending" | "generating" | "saving"
  }
}
```

---

### 1.3 Living Orb Animation (Enhanced)

**Goal:** Match the AMP-style alive feeling

Enhance `agent-orb.tsx`:

- Smooth **breathing animation** at idle (scale + opacity pulse)
- **Particle effects** during thinking/creating
- **Waveform visualization** when processing audio
- **Color shifts** based on activity type:
  - Cyan: idle/ready
  - Purple: thinking/processing
  - Pink: creating art
  - Green: code generation
  - Orange: browsing

**CSS animations to add in `globals.css`:**

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px var(--accent-glow); }
  50% { box-shadow: 0 0 40px var(--accent-glow), 0 0 60px var(--accent-glow); }
}
```

---

## Phase 2: Memory System

### 2.1 Memory Architecture

```
lib/
  memory/
    index.ts           # Memory manager
    short-term.ts      # Session-based (in-memory)
    long-term.ts       # Persistent (localStorage → later: cloud)
    episodic.ts        # Event/experience logs
    semantic.ts        # Knowledge graph / embeddings
```

**Storage Strategy (adaptable):**

| Layer | Phase 1 (Local) | Phase 2 (Cloud) |
|-------|-----------------|-----------------|
| Short-term | Zustand store | Zustand store |
| Long-term | localStorage | Cloud DB (Firebase/Supabase) |
| Episodic | IndexedDB | Cloud DB |
| Semantic | localStorage + embeddings | Vector DB (Pinecone/Weaviate) |
| Files/Media | Local filesystem | Google Cloud Storage |

**Interface for swappability:**

```typescript
interface MemoryStore {
  save(key: string, value: any, layer: MemoryLayer): Promise<void>
  retrieve(key: string, layer: MemoryLayer): Promise<any>
  search(query: string, layer: MemoryLayer): Promise<MemoryItem[]>
  clear(layer: MemoryLayer): Promise<void>
}
```

---

### 2.2 Context Window Management

The agent needs to manage what goes into the Gemini context:

```typescript
interface ContextBuilder {
  systemPrompt: string           // Agent personality/instructions
  recentConversation: Message[]  // Last N messages
  relevantMemories: MemoryItem[] // Retrieved by semantic search
  currentTask?: TaskContext      // If running scheduled task
}
```

---

## Phase 3: Creation Pipeline

### 3.1 Image Generation

**Gemini Imagen 3 integration:**

```typescript
// lib/api/imagen.ts
export async function generateImage(prompt: string): Promise<{
  url: string
  localPath?: string
}>
```

**Flow:**

1. Agent decides to create art (via conversation or schedule)
2. Call Imagen 3 API
3. Save to local `public/gallery/` (Phase 1) or Cloud Storage (Phase 2)
4. Add to `outputs` in store
5. Display in Gallery panel

---

### 3.2 Music Generation (Browser Tool)

**Using producer.ai via browser automation:**

```
lib/
  browser/
    index.ts           # Browser controller interface
    producer-ai.ts     # producer.ai specific automation
```

**Options for browser control:**

- Puppeteer (Node.js server-side)
- Playwright (more features)
- Client-side: open in iframe/new tab with message passing

**Flow:**

1. Agent navigates to producer.ai
2. Inputs prompt/parameters
3. Waits for generation
4. Downloads result
5. Saves to gallery

---

### 3.3 Code Generation

**Gemini for code, optionally v0.app for UI:**

```typescript
// Direct code generation
const code = await gemini.generateCode(prompt, language)

// v0.app integration (browser tool)
const component = await browser.v0.generate(uiDescription)
```

---

### 3.4 Video Generation

**Gemini Veo 2 (when available):**

- Same pattern as image generation
- Save to gallery with video player support

---

## Phase 4: Scheduled Tasks & Autonomy

### 4.1 Task Scheduler

```
lib/
  scheduler/
    index.ts           # Main scheduler
    cron.ts            # Cron parsing
    executor.ts        # Task execution engine
```

**Browser-based scheduling:**

```typescript
// Using setInterval with visibility API
function startScheduler() {
  setInterval(() => {
    const due = getdueTasks()
    for (const task of due) {
      executeTask(task)
    }
  }, 60000) // Check every minute
}
```

**Note:** For true background execution (when browser closed), will need:

- Service Worker (limited)
- External scheduler (Phase 2: Cloud Functions, cron job)

---

### 4.2 Task Types

```typescript
type TaskType = 
  | "create_art"
  | "create_music"
  | "write_blog"
  | "research"
  | "social_post"
  | "code_project"
  | "custom"

interface TaskDefinition {
  type: TaskType
  prompt?: string
  parameters?: Record<string, any>
}
```

---

## Phase 5: UI Enhancements

### 5.1 Real-time Activity Feed

Enhance `activity-panel.tsx`:

- Live streaming of agent actions
- Expandable details for each action
- Links to generated content

### 5.2 Gallery Improvements

- Full-screen media viewer
- Download/export options
- Metadata display (generation params, timestamp)
- Categories: Art, Music, Code, Video, Blog

### 5.3 Settings Panel

```
- Gemini API key input (stored securely)
- Model selection (flash vs pro)
- Creativity/temperature slider
- Memory management (clear, export)
- Schedule enable/disable all
```

---

## File Structure (Current)

```
komorebi/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # ✅ Gemini chat endpoint (streaming SSE)
│   │   ├── gallery/route.ts     # ✅ Gallery CRUD operations
│   │   └── generate/
│   │       ├── image/route.ts   # ✅ Imagen 3 endpoint
│   │       ├── code/route.ts    # ✅ Code generation endpoint
│   │       └── video/route.ts   # (future) Veo endpoint
│   ├── page.tsx                  # ✅ Main UI with all panels
│   └── layout.tsx
├── components/
│   ├── agent/
│   │   ├── agent-orb.tsx        # ✅ Living orb with animations
│   │   └── status-bar.tsx
│   ├── panels/
│   │   ├── chat-panel.tsx
│   │   ├── create-panel.tsx     # ✅ NEW: Image/Code creation UI
│   │   ├── gallery-panel.tsx
│   │   ├── thoughts-panel.tsx
│   │   ├── activity-panel.tsx
│   │   └── ...
│   └── ui/                       # shadcn components
├── hooks/
│   ├── use-agent-chat.ts        # ✅ SSE streaming chat hook
│   ├── use-image-generation.ts  # ✅ NEW: Imagen 3 hook
│   └── use-code-generation.ts   # ✅ NEW: Code generation hook
├── lib/
│   ├── api/
│   │   ├── gemini.ts            # ✅ Gemini wrapper (@google/generative-ai)
│   │   ├── imagen.ts            # ✅ NEW: Imagen 3 (@google/genai SDK)
│   │   ├── code-gen.ts          # ✅ NEW: Code generation via Gemini
│   │   └── types.ts
│   ├── browser/
│   │   ├── index.ts             # ✅ Browser controller interface
│   │   ├── producer-ai.ts       # ✅ Placeholder for music automation
│   │   └── v0-app.ts            # ✅ Placeholder for v0.app automation
│   ├── gallery/
│   │   └── index.ts             # ✅ NEW: Gallery store (localStorage)
│   ├── memory/
│   │   ├── index.ts             # ✅ Memory types & interface
│   │   └── local-store.ts       # ✅ localStorage implementation
│   ├── scheduler/                # (Sprint 3)
│   └── store/
│       └── agent-store.ts       # ✅ Zustand store with all state
├── public/
│   └── gallery/                 # ✅ Local file storage for creations
└── docs/
    └── implementation-plan.md
```

---

## Implementation Order

### Sprint 1: Foundation (Week 1-2)

1. ✅ UI shell exists
2. ✅ Gemini API integration (`lib/api/gemini.ts`)
3. ✅ Update chat route to use Gemini
4. ✅ Enhanced orb animations
5. ✅ Basic memory persistence (localStorage)

### Sprint 2: Creation (Week 3-4)

1. [x] Imagen 3 integration (`lib/api/imagen.ts` - using @google/genai SDK)
2. [x] Gallery storage pipeline (`lib/gallery/index.ts`, `app/api/gallery/route.ts`)
3. [x] Code generation endpoint (`lib/api/code-gen.ts`, `app/api/generate/code/route.ts`)
4. [x] Browser tool foundation (`lib/browser/` - interfaces ready, implementations placeholder for Sprint 4)

### Sprint 3: Autonomy (Week 5-6)

1. [x] Scheduler implementation — core scheduler and cron utilities implemented (`lib/scheduler`)
2. [x] Task executor — task execution engine implemented (`lib/scheduler/executor.ts`)
3. [~] Autonomous creation loop — initial orchestrator and client hook added (`lib/autonomy/orchestrator.ts`, `hooks/use-autonomy.ts`). Default safe proposer implemented; configurable and overrideable.
4. [~] Activity streaming — activity APIs in store and UI are live; SSE endpoint scaffolded at `app/api/activity/stream/route.ts` for future server-side streaming.

Notes:

- New files added: `lib/autonomy/orchestrator.ts`, `hooks/use-autonomy.ts`, `app/api/activity/stream/route.ts`.
- The orchestrator is intentionally conservative: it proposes safe, repeatable tasks and is fully configurable. Use the `useAutonomy` hook to wire custom proposal logic by passing a `propose` callback.
- To override behavior at runtime, call `getOrchestrator()` from code and use `setConfig`, `setProposeCallback`, `start`, and `stop`.
- Activity SSE endpoint is a lightweight scaffold — it emits a heartbeat and will be extended to stream `addActivity` events from the server side once a server-side activity bus or persistence is added.
- The orchestrator is intentionally conservative: it proposes safe, repeatable tasks and is fully configurable. Use the `useAutonomy` hook to wire custom proposal logic by passing a `propose` callback.
- To override behavior at runtime, call `getOrchestrator()` from code and use `setConfig`, `setProposeCallback`, `start`, and `stop`.
- Activity streaming: a simple server-side activity bus (`lib/activity/bus.ts`) and push endpoint (`app/api/activity/push/route.ts`) were added. The SSE endpoint at `app/api/activity/stream/route.ts` now streams recent and live events from the bus.
- Notes on persistence & scaling: the activity bus implemented is in-memory and suitable for single-process development. For production or multi-instance deployments you'll want a durable, central event bus (Redis Pub/Sub, Cloud Pub/Sub, or a small database-backed queue) so SSE streams can be served from any instance and events persist across restarts.

### Sprint 4: Polish (Week 7-8)

1. [x] Memory layers fully implemented
2. [x] Browser tools (producer.ai, v0.app)
3. [x] Settings panel completion
4. [x] Export/download features

Notes:

- New files added: `hooks/use-memory.ts`, `hooks/use-settings.ts`, `lib/utils/export-utils.ts`.
- Memory panel now uses real `LocalMemoryStore` instead of mock data, with export/clear functionality.
- Settings panel includes API key input (obfuscated storage), model selection (Flash/Pro), temperature slider, and export buttons.
- Gallery panel has download/copy buttons per item, plus bulk export.
- Browser tools use popup window approach since this is a client-side app. They open the target service and provide instructions for the user.

---

## Sprint 5-6

- Cloud storage migration (Google Cloud Storage)
- Vector embeddings for semantic memory
- Public-facing live site
- User interaction with the agent
- Social media API integrations
- Multi-agent spawning
- Voice input/output

---

## Key Principles

1. **Adaptable**: Every integration uses an interface/adapter pattern
2. **Swappable**: Storage, models, and tools can be changed easily
3. **Clean**: First-principles design, minimal dependencies
4. **Organized**: Clear file structure, single responsibility
5. **Documented**: Each module has clear purpose

---

## API Keys Needed

| Service | Purpose | Required |
|---------|---------|----------|
| Google AI (Gemini) | Chat, code, images, video | Yes |
| *(no others for Phase 1)* | | |

---

## Next Steps

1. Set up `GOOGLE_API_KEY` in `.env.local`
2. Create `lib/api/gemini.ts` with chat functionality
3. Update `app/api/chat/route.ts` to use Gemini
4. Test basic conversation flow
5. Add enhanced breathing animation to orb


