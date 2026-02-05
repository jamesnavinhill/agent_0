# Komorebi

Komorebi is a local-first autonomous agent interface built with Next.js. It combines a reactive UI, scheduled task execution, and media generation through Google Gemini, Imagen, and Veo APIs. It persists state in Neon Postgres and stores media on the local filesystem.

Note: The codebase still references the name "Agent Zero" in UI strings and comments. The project name moving forward is Komorebi.

## Core Capabilities (From Current Code)

- Agent chat with AI SDK orchestration and streaming.
- Morning Read research task with Google Search grounding.
- Image generation and editing with Gemini/Imagen models.
- Video generation with Veo (text-to-video and image-to-video).
- Memory and knowledge capture in Postgres.
- Gallery persistence with local media storage under `public/`.
- Scheduling via cron expressions and a local cron trigger.
- Sandbox project storage and LLM-backed execution APIs.
- Browser snapshot task using Playwright.

## Quickstart

Install dependencies.

```bash
pnpm install
```

Configure environment.

```bash
cp .env.local.example .env.local
```

Required variables:

- `GOOGLE_API_KEY`
- `DATABASE_URL`
- `CRON_SECRET`

Apply database schema.

```bash
pnpm run db:migrate
```

Seed default tasks.

```bash
pnpm run db:seed:morning-read
pnpm run db:seed:media-task
pnpm run db:seed:motion-art
pnpm run db:seed:morning-ritual
```

Run the dev server.

```bash
pnpm run dev
```

## Documentation

- `docs/ARCHITECTURE.MD`
- `docs/API.MD`
- `docs/CONFIG.MD`
- `docs/DATABASE.MD`
- `docs/DEVELOPMENT.MD`
- `docs/MEDIA_GENERATION.MD`
- `docs/COMPONENTS.MD`
- `docs/SCHEDULING.MD`
- `docs/STORAGE.MD`

## License

MIT
