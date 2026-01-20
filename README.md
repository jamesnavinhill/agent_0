
  ___   _____ _____ _   _ _____     ___
 / _ \ / ____| ____| \ | |_   _|   / _ \
| |_| | |  __| |__ |  \| | | |    | | | |
|  _  | | |_ |  __|| . ` | | |    | | | |
| | | | |__| | |___| |\  | | |    | |_| |
|_| |_|\_____|_____|_| \_| |_|     \___/

# Agent Zero

> **An autonomous AI agent system built for incremental capability expansion.**

Agent Zero is a next-generation AI agent framework designed to feel alive. It features a reactive UI, autonomous task execution, and deep integration with Google's Gemini 3.0/2.5 ecosystem. Built on principles of **Data Truth**, **Persistence First**, and **Modular Tasks**.

---

## ✨ Current Capabilities

| Task | Status | Description |
|------|--------|-------------|
| **Morning Read** | ✅ Live | Research with Google Search Grounding |
| **Media Generation** | ✅ Live | AI art from memory context |
| **Image Editing** | 🔜 Next | Retrieve & modify gallery images |
| **Video Generation** | 🔜 Next | Veo integration |
| **Code Sandbox** | 📋 Planned | Isolated code execution |
| **Browser Automation** | 📋 Planned | Web navigation & interaction |
| **Long-form Writing** | 📋 Planned | Essays, journals, reflections |

## 🏗 Architecture

```
Triggers (Cron/UI/API)
        │
        ▼
  /api/agent/execute  ──▶  runner.ts  ──▶  Task Tools
        │                                      │
        ▼                                      ▼
   Unified Path                         research | media | code
        │                                      │
        └──────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   Neon Postgres     │
              │   Vercel Blob       │
              │   Memory System     │
              └─────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for detailed diagrams and design.

## 🧠 Design Principles

- **Agentic Native** — Built for autonomous operation
- **Data Truth** — No mocks; UI reflects actual database state
- **Persistence First** — Every output is saved and retrievable
- **Modular Tasks** — Each capability is isolated and testable
- **Unified Execution** — Same code path for Cron, UI, and API triggers

See [docs/project_rules.md](docs/project_rules.md) for full guidelines.

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript (strict) |
| **Styling** | TailwindCSS + Shadcn UI |
| **AI Models** | Google Gemini 3.0/2.5, Imagen 4.0 |
| **Database** | Neon Postgres (+ pgvector) |
| **Storage** | Vercel Blob |
| **State** | Zustand |
| **Package Manager** | pnpm |

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/jamesnavinhill/agent_0.git
cd agent_0
pnpm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
GOOGLE_API_KEY=your_gemini_api_key
DATABASE_URL=your_neon_postgres_url
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
CRON_SECRET=your_cron_secret
```

### 3. Run Development Server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Test Task Execution

1. Navigate to Schedule page
2. Click **Start** to enable scheduler
3. Click ⚡ on any task to trigger manually
4. Watch Activity panel for real-time progress

## 📁 Project Structure

```
agent_0/
├── app/                    # Next.js pages & API routes
│   └── api/
│       ├── agent/execute/  # Unified task execution
│       ├── gallery/        # Gallery CRUD
│       ├── tasks/          # Task CRUD
│       └── cron/           # Scheduled triggers
│
├── lib/
│   ├── agent/
│   │   ├── runner.ts       # Central task executor
│   │   └── tools/          # Task implementations
│   ├── api/                # AI service wrappers
│   ├── db/                 # Database queries
│   ├── scheduler/          # Scheduling logic
│   └── storage/            # Blob storage
│
├── components/             # UI components
│
└── docs/                   # Documentation
    ├── architecture.md     # System architecture
    ├── project_rules.md    # Core principles
    ├── v1-roadmap.md       # Development roadmap
    └── media-generation.md # Media system docs
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](docs/architecture.md) | System design & diagrams |
| [project_rules.md](docs/project_rules.md) | Core principles & guidelines |
| [v1-roadmap.md](docs/v1-roadmap.md) | Feature roadmap |
| [media-generation.md](docs/media-generation.md) | Media pipeline details |
| [schedule.md](docs/schedule.md) | Scheduling strategy |
| [gemini-models.md](docs/gemini-models.md) | Model reference |

## 🔮 Roadmap

### Phase 2 (Current): Media Expansion
- Image editing & refinement
- Video generation (Veo)
- Multi-step task workflows

### Phase 3: Extended Capabilities
- Code sandbox with isolated execution
- Browser automation (Playwright)
- Long-form writing & journaling

### Phase 4: Advanced Composition
- Sub-agent orchestration
- External service integrations (v0, Producer.ai)
- Full semantic memory search

## 📄 License

MIT
