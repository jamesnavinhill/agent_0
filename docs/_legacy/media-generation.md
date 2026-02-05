# Media Generation System

**Last Updated:** January 20, 2026

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
                                            ├── performDailyArt() → Image generation
                                            ├── editGalleryImage() → Image editing
                                            └── generateVideo() → Video generation (Veo)
```

## Supported Models

### Image Generation

| Model | Type | Notes |
|-------|------|-------|
| `gemini-2.5-flash-image` | Gemini | **Default** - Fast, good quality |
| `gemini-3-pro-image-preview` | Gemini | Higher quality, more tokens |
| `imagen-4.0-generate-001` | Imagen | Standard Imagen |
| `imagen-4.0-ultra-generate-001` | Imagen | Ultra quality |
| `imagen-4.0-fast-generate-001` | Imagen | Speed optimized |

### Video Generation

| Model | Type | Notes |
|-------|------|-------|
| `veo-3.1-fast-generate-preview` | Veo | **Default** - Fast video generation |
| `veo-3.0-generate-preview` | Veo | Standard quality |

Video supports:

- **Resolutions:** 720p, 1080p, 4K
- **Aspect Ratios:** 16:9, 9:16
- **Duration:** 4, 6, or 8 seconds

## Task Configuration

Tasks in the database can specify model and aspect ratio via `parameters` JSONB:

```json
{
  "model": "gemini-2.5-flash-image",
  "aspectRatio": "9:16",
  "prompt": "Optional manual prompt override"
}
```

### Video Task Parameters

```json
{
  "mode": "text-to-video",
  "aspectRatio": "16:9",
  "prompt": "Cinematic scene description"
}
```

Or for image-to-video:

```json
{
  "mode": "image-to-video",
  "sourceGalleryId": "uuid-of-source-image",
  "prompt": "Motion description"
}
```

## Triggering Media Generation

### Via UI (Recommended Testing Flow)

1. Go to Schedule page
2. Click "Start" to enable scheduler
3. Click the ⚡ lightning icon on the target task

### Via Terminal (Direct API)

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"taskId": "YOUR_TASK_ID"}'
```

---

## Capabilities

### ✅ Image Generation (`performDailyArt`)

- Generates images from memory context or manual prompts
- Uploads to local filesystem, saves to gallery_items
- Creates episodic memory of creation

### ✅ Image Editing (`editGalleryImage`)

- Retrieves existing gallery image by ID
- Applies edit prompt to create new version
- Saves as new gallery item with parent reference

### ✅ Video Generation (`generateVideo`)

- **Text-to-Video:** Generate from text prompt
- **Image-to-Video:** Animate an existing gallery image
- Uploads to local filesystem, saves with type: "video"

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/agent/tools/media.ts` | Image/video generation functions |
| `lib/api/imagen.ts` | Gemini/Imagen API wrapper |
| `lib/api/veo.ts` | Veo video generation API wrapper |
| `lib/db/gallery.ts` | Gallery persistence (getGalleryItemById) |

---

*Updated: Phase 2 complete - Image Editing & Video Generation added*
