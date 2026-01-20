# Agent Zero: System Architecture

**Version:** 1.0  
**Last Updated:** January 19, 2026  
**Status:** Active Development

This is a living document describing the architecture of Agent Zero - an autonomous AI agent system designed for incremental capability expansion through modular task primitives.

---

## 1. Philosophy & Design Principles

### Core Tenets

| Principle | Description |
|-----------|-------------|
| **Agentic Native** | Built for autonomous operation, not just user interaction |
| **Data Truth** | No mocks in production - UI reflects actual database state |
| **Persistence First** | Every output (text, image, video, code) is persisted and retrievable |
| **Modular Tasks** | Each capability is an isolated, testable module |
| **Unified Execution** | Same code path whether triggered by Cron, UI, or API |
| **Incremental Build** | Add one task at a time, stabilize, then expand |

### Architecture Goals

1. **Lean & Clean** - Minimal abstraction, maximum clarity
2. **Sturdy Foundation** - Solid primitives that compound
3. **Observable** - Every action logged, every thought visible
4. **Composable** - Tasks can chain into multi-step workflows

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT ZERO                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Schedule   │  │   Gallery    │  │   Activity   │   UI Layer    │
│  │    Panel     │  │    Panel     │  │    Panel     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                       │
├─────────┼─────────────────┼─────────────────┼───────────────────────┤
│         │                 │                 │                       │
│  ┌──────▼─────────────────▼─────────────────▼──────┐                │
│  │              API Routes (/api/*)                 │   API Layer   │
│  │   execute | gallery | tasks | activity | chat   │                │
│  └──────────────────────┬──────────────────────────┘                │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐                │
│  │              Agent Runner                        │               │
│  │         (lib/agent/runner.ts)                   │   Agent Core   │
│  └──────────────────────┬──────────────────────────┘                │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐                │
│  │              Task Tools                          │               │
│  │   research | media | essay | code | browser     │   Task Layer   │
│  └──────────────────────┬──────────────────────────┘                │
│                         │                                           │
├─────────────────────────┼───────────────────────────────────────────┤
│                         │                                           │
│  ┌─────────┐  ┌─────────▼───────┐  ┌─────────────┐                  │
│  │ Gemini  │  │   Neon Postgres │  │ Vercel Blob │   Services       │
│  │   API   │  │   (DB + Vector) │  │  (Storage)  │                  │
│  └─────────┘  └─────────────────┘  └─────────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Execution Architecture

The heart of Agent Zero is the **Unified Execution Path** - ensuring consistent behavior regardless of trigger source.

### Trigger Sources

| Source | Entry Point | Use Case |
|--------|-------------|----------|
| **Cron** | `/api/cron` | Scheduled autonomous execution |
| **UI Manual** | Schedule Panel → ⚡ button | Testing & on-demand triggers |
| **API Direct** | `POST /api/agent/execute` | External integrations |

### Execution Flow

All paths converge at `runner.ts`:

```
Trigger (Cron/UI/API)
        │
        ▼
┌───────────────────┐
│ /api/agent/execute│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  runner.ts        │
│  executeTask()    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Route by         │
│  task.category    │
│  or task.name     │
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────┬──────────────┐
    ▼           ▼             ▼              ▼
┌────────┐ ┌────────┐   ┌──────────┐   ┌──────────┐
│research│ │  art   │   │philosophy│   │  code    │
│        │ │        │   │          │   │          │
│morning │ │ daily  │   │  essay   │   │ sandbox  │
│ read   │ │  art   │   │          │   │          │
└────────┘ └────────┘   └──────────┘   └──────────┘
```

---

## 4. Task System

### Task Anatomy

Every task is defined in the database and executed by a corresponding tool module:

```typescript
// Database: tasks table
{
  id: "uuid",
  name: "Meaningful Media",
  description: "Generate art from memory state",
  schedule: "0 11 * * *",        // Cron syntax
  enabled: true,
  category: "art",               // Routes to correct handler
  parameters: {                   // Task-specific config
    model: "gemini-2.5-flash-image",
    aspectRatio: "9:16"
  }
}
```

### Current Task Types

| Category | Tool Module | Status | Description |
|----------|-------------|--------|-------------|
| `research` | `tools/research.ts` | ✅ V1 | Morning Read with Search Grounding |
| `art` | `tools/media.ts` | ✅ V1 | Image generation from memory context |
| `philosophy` | `tools/essay.ts` | 🔜 Planned | Long-form reflective writing |
| `code` | `tools/sandbox.ts` | 🔜 Planned | Code generation & execution |
| `browser` | `tools/browser.ts` | 🔜 Planned | Web navigation & interaction |
| `social` | `tools/social.ts` | 🔜 Planned | Community engagement |

### Task Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  IDLE   │────▶│ RUNNING │────▶│COMPLETE │────▶│  IDLE   │
└─────────┘     └────┬────┘     └─────────┘     └─────────┘
                     │
                     ▼
                ┌─────────┐
                │  ERROR  │───▶ (retry or log)
                └─────────┘
```

---

## 5. Data Architecture

### Database Schema (Neon Postgres)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    tasks     │     │  activities  │     │gallery_items │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ name         │     │ action       │     │ type         │
│ schedule     │     │ details      │     │ content      │
│ category     │     │ source       │     │ title        │
│ parameters   │     │ level        │     │ category     │
│ enabled      │     │ image_url    │     │ prompt       │
│ last_run     │     │ created_at   │     │ metadata     │
│ next_run     │     └──────────────┘     │ created_at   │
│ last_status  │                          └──────────────┘
└──────────────┘
        │
        │              ┌──────────────┐
        │              │   memories   │
        │              ├──────────────┤
        └─────────────▶│ id           │
                       │ layer        │
                       │ content      │
                       │ embedding    │ ◀── pgvector
                       │ source       │
                       │ relevance    │
                       │ tags         │
                       └──────────────┘
```

### Memory Layers

| Layer | Purpose | Persistence |
|-------|---------|-------------|
| `episodic` | What the agent did (actions, creations) | Permanent |
| `semantic` | What the agent learned (facts, knowledge) | Permanent |
| `working` | Current context (active task state) | Session |

---

## 6. AI Model Strategy

### The Gemini Stack

Agent Zero leverages the full Gemini ecosystem for specialized tasks:

| Use Case | Model | Rationale |
|----------|-------|-----------|
| **Complex Reasoning** | `gemini-3-pro` | Best intelligence, multimodal |
| **Fast Tasks** | `gemini-3-flash` | Speed + scale balance |
| **Deep Research** | `gemini-2.5-pro` | Large context, thinking |
| **Image Generation** | `gemini-2.5-flash-image` | Fast image gen (default) |
| **High-Quality Images** | `imagen-4.0-ultra` | Premium image output |
| **Video Generation** | `veo-2.0` | 🔜 Coming |
| **Voice/Audio** | `gemini-2.5-flash-live` | 🔜 Coming |

### Model Selection Flow

```
Task Category
     │
     ├── research ──────▶ gemini-3-pro (+ Search Grounding)
     │
     ├── art ───────────▶ gemini-2.5-flash-image
     │                         │
     │                    (override via task.parameters.model)
     │                         │
     │                         ▼
     │                    imagen-4.0-*
     │
     ├── philosophy ────▶ gemini-3-pro
     │
     └── code ──────────▶ gemini-3-pro (+ Code Execution)
```

---

## 7. Multi-Step Task Architecture (Phase 2+)

As capabilities mature, tasks will compose into multi-step workflows:

### Example: Memory-Driven Media Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              Multi-Step Task: "Daily Creation"              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: REFLECT                                            │
│  ┌─────────────────────────────┐                           │
│  │ Query recent memories       │                           │
│  │ Generate artistic prompt    │                           │
│  └──────────────┬──────────────┘                           │
│                 │                                           │
│                 ▼                                           │
│  Step 2: CREATE                                             │
│  ┌─────────────────────────────┐                           │
│  │ Generate base image         │                           │
│  │ Save to gallery             │                           │
│  └──────────────┬──────────────┘                           │
│                 │                                           │
│                 ▼                                           │
│  Step 3: REFINE                                             │
│  ┌─────────────────────────────┐                           │
│  │ Retrieve created image      │                           │
│  │ Apply edits (style/enhance) │                           │
│  └──────────────┬──────────────┘                           │
│                 │                                           │
│                 ▼                                           │
│  Step 4: ANIMATE                                            │
│  ┌─────────────────────────────┐                           │
│  │ Send to Veo for animation   │                           │
│  │ Save video to gallery       │                           │
│  └──────────────┬──────────────┘                           │
│                 │                                           │
│                 ▼                                           │
│  Step 5: REMEMBER                                           │
│  ┌─────────────────────────────┐                           │
│  │ Write memory of experience  │                           │
│  │ Update semantic knowledge   │                           │
│  └─────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sub-Agent Architecture (Future)

```
┌────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                       │
│                   (gemini-3-pro)                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Research │  │  Media   │  │  Code    │  │ Browser  │  │
│  │ Sub-Agent│  │ Sub-Agent│  │ Sub-Agent│  │ Sub-Agent│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │         │
│       ▼             ▼             ▼             ▼         │
│  Search API    Imagen/Veo    Sandbox       Playwright     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 8. Capability Roadmap

### Phase 1: Foundation ✅
- [x] Unified execution architecture
- [x] Morning Read (research + grounding)
- [x] Media Generation V1 (image creation)
- [x] Gallery persistence
- [x] Activity logging

### Phase 2: Media Expansion (Current)
- [ ] Image editing (retrieve + modify)
- [ ] Video generation (Veo integration)
- [ ] Schedule Panel DB integration
- [ ] Multi-step task test case

### Phase 3: Extended Capabilities
- [ ] Code Sandbox (isolated execution)
- [ ] Browser automation (Playwright)
- [ ] Long-form writing (essays, journals)
- [ ] Social engagement tools

### Phase 4: Advanced Composition
- [ ] Sub-agent orchestration
- [ ] Multi-step workflow engine
- [ ] Cross-task memory threading
- [ ] External service integrations (v0, Producer.ai)

### Phase 5: Autonomy & Refinement
- [ ] Self-scheduling improvements
- [ ] Prompt/context optimization
- [ ] Full semantic search over knowledge
- [ ] "Soul Document" / heartbeat reflection

---

## 9. Directory Structure

```
agent_0/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   └── execute/        # Unified task execution
│   │   ├── gallery/            # Gallery CRUD
│   │   ├── tasks/              # Task CRUD
│   │   └── cron/               # Scheduled trigger
│   └── page.tsx                # Main dashboard
│
├── lib/
│   ├── agent/
│   │   ├── runner.ts           # Central task executor
│   │   └── tools/              # Task implementations
│   │       ├── research.ts     # Morning Read
│   │       ├── media.ts        # Image/Video generation
│   │       ├── essay.ts        # Long-form writing (planned)
│   │       └── sandbox.ts      # Code execution (planned)
│   │
│   ├── api/
│   │   ├── gemini.ts           # Gemini text/chat
│   │   └── imagen.ts           # Image generation
│   │
│   ├── db/
│   │   ├── neon.ts             # DB connection
│   │   ├── tasks.ts            # Task queries
│   │   ├── gallery.ts          # Gallery queries
│   │   └── memories.ts         # Memory/vector queries
│   │
│   ├── scheduler/
│   │   ├── index.ts            # Scheduler class
│   │   ├── executor.ts         # Client-side execution bridge
│   │   └── cron.ts             # Cron parsing utilities
│   │
│   └── storage/
│       └── blob.ts             # Vercel Blob uploads
│
├── components/
│   └── panels/
│       ├── schedule-panel.tsx
│       ├── gallery-panel.tsx
│       └── activity-panel.tsx
│
└── docs/
    ├── architecture.md         # This document
    ├── project_rules.md        # Core principles
    ├── v1-roadmap.md           # Detailed roadmap
    ├── media-generation.md     # Media system docs
    └── schedule.md             # Scheduling strategy
```

---

## 10. Testing Strategy

### Manual Testing Flow (Current)
1. Navigate to Schedule page
2. Click "Start" to enable scheduler
3. Click ⚡ on target task
4. Observe Activity panel for progress
5. Verify Gallery for outputs

### Automated Testing (Planned)
- Unit tests for task tools
- Integration tests for API routes
- E2E tests for critical workflows

### Multi-Step Test Case (Next Milestone)
```
1. Agent queries memories
2. Generates image based on context
3. Retrieves image from gallery
4. Applies edit/enhancement
5. Animates with Veo
6. Writes memory about experience
```

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `lib/agent/runner.ts` | Central task execution logic |
| `lib/agent/tools/media.ts` | Image/video generation |
| `lib/agent/tools/research.ts` | Morning Read implementation |
| `lib/api/imagen.ts` | Gemini/Imagen API wrapper |
| `lib/scheduler/index.ts` | Scheduler state management |
| `lib/scheduler/executor.ts` | Client→Server execution bridge |
| `app/api/agent/execute/route.ts` | Unified execution endpoint |

---

*This document evolves with the system. Update as architecture changes.*
