# Media Generation System

**Last Updated:** January 19, 2026

This document describes the agent's media generation capabilities and architecture.

---

## Architecture Overview

```
UI (Schedule Panel)
    │
    ├── Click "Start Now" (⚡ icon)
    │
    └── useScheduler.runNow(taskId)
            │
            └── Scheduler.executeTask()
                    │
                    └── executor.executeArtTask()
                            │
                            └── POST /api/agent/execute
                                    │
                                    └── runner.executeTask()
                                            │
                                            └── performDailyArt() [lib/agent/tools/media.ts]
                                                    │
                                                    ├── Fetch recent memories for context
                                                    ├── Generate image via Gemini/Imagen
                                                    ├── Upload to Vercel Blob storage
                                                    ├── Save to gallery_items DB
                                                    └── Add episodic memory of creation
```

## Supported Models

| Model | Type | Notes |
|-------|------|-------|
| `gemini-2.5-flash-image` | Gemini | **Default** - Fast, good quality |
| `gemini-3-pro-image-preview` | Gemini | Higher quality, more tokens |
| `imagen-4.0-generate-001` | Imagen | Standard Imagen |
| `imagen-4.0-ultra-generate-001` | Imagen | Ultra quality |
| `imagen-4.0-fast-generate-001` | Imagen | Speed optimized |

## Task Configuration

Tasks in the database can specify model and aspect ratio via `parameters` JSONB:

```json
{
  "model": "gemini-2.5-flash-image",
  "aspectRatio": "9:16",
  "prompt": "Optional manual prompt override"
}
```

## Triggering Media Generation

### Via UI (Recommended Testing Flow)

1. Go to Schedule page
2. Click "Start" to enable scheduler
3. Click the ⚡ lightning icon on the "Meaningful Media" task

### Via Terminal (Direct API)

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"taskId": "YOUR_TASK_ID"}'
```

## Future Capabilities (Roadmap)

- [ ] **Image Editing (Nano Banana):** Retrieve existing gallery image and apply edits
- [ ] **Video Generation (Veo):** Generate short videos from prompts
- [ ] **Multi-modal Memory:** Store video/audio in gallery with proper typing
- [ ] **Image-to-Image:** Use reference images to guide generation

---

## Audit Notes (January 19, 2026)

### Fixed Issues

- Art tasks now use unified server-side execution path (previously bypassed runner.ts)
- Images properly uploaded to Vercel Blob storage
- Gallery items correctly persisted to database

### Removed Dead Code

- `generateArtPrompt()` in executor.ts (no longer used)

### Known Issues / Future Work

- Schedule Panel still has `mockGoals` - needs DB integration
- No retry logic on failed generations
- Video generation not yet implemented
