# Handoff: Video Generation Debugging

**Date:** January 20, 2026  
**Status:** INCOMPLETE - Video generation task not executing properly

---

## What Was Attempted

### 1. Created Veo API Wrapper ✅

- File: `lib/api/veo.ts`
- Implemented `generateVideoFromText()` and `generateVideoFromImage()`
- Uses `veo-3.1-fast-generate-preview` model
- Includes async polling with `getVideosOperation()`

### 2. Direct API Test ✅

- Created `scripts/test-veo.ts`
- **CONFIRMED WORKING**: Direct script successfully generates videos
- Video generated at URI: `https://generativelanguage.googleapis.com/v1beta/files/...`
- Takes ~40-50 seconds for generation

### 3. Media Tools Updated ✅

- Added `generateVideo()` to `lib/agent/tools/media.ts`
- Added `editGalleryImage()` for image editing
- Both functions have proper activity logging and memory creation

### 4. Runner Routing Updated ✅

- `lib/agent/runner.ts` routes `category === "video"` or `name.includes("Motion")` to `generateVideo()`
- Debug logging added to trace routing

### 5. Task Seeded ✅

- `scripts/seed-motion-art.ts` created task with:
  - name: "Motion Art"
  - category: "video"
  - parameters: `{"mode": "text-to-video", "aspectRatio": "16:9"}`

---

## The Problem

**Task completes in ~5 seconds** instead of the ~50 seconds required for video generation.

When triggered via UI:

1. Activity shows "Executing task: Motion Art"
2. Activity shows "Completed task: Motion Art" seconds later
3. No video in gallery
4. No video memory created
5. No Veo logging appears in terminal

**But** the direct test script (`npx tsx scripts/test-veo.ts`) works perfectly.

---

## Likely Root Causes

### 1. Async/Await Not Propagating Properly

The `generateVideo()` function may not be properly awaited in the execution chain. The task might be completing before the async video generation finishes.

Check:

- `executeTask()` in `runner.ts` - is `await generateVideo(task)` being properly awaited?
- Is there a Promise that's not being awaited somewhere in the chain?

### 2. Error Being Swallowed Silently

An error might be thrown early and caught without logging. Check:

- `lib/agent/tools/media.ts` - `generateVideo()` try/catch
- `lib/api/veo.ts` - initialization check for `genAI`

### 3. Routing Not Hitting Video Path

Despite adding debug logs, they may not be appearing. Verify:

- Is the task actually reaching `runner.ts`?
- Is the condition `task.name.includes("Motion") || task.category === "video"` actually matching?

---

## Files Modified This Session

| File | Change |
|------|--------|
| `lib/api/veo.ts` | Created Veo wrapper with polling |
| `lib/agent/tools/media.ts` | Added `generateVideo()`, `editGalleryImage()` |
| `lib/agent/runner.ts` | Added video/edit routing + debug logs |
| `lib/db/gallery.ts` | Added `getGalleryItemById()` |
| `lib/api/imagen.ts` | Changed `personGeneration` to `allow_all` |
| `scripts/seed-motion-art.ts` | Task seeding script |
| `scripts/test-veo.ts` | Direct API test (works) |

---

## To Debug Next

1. **Check terminal logs** when triggering Motion Art - look for `[Runner]` prefix logs
2. **Add try/catch with console.error** around the `generateVideo(task)` call in runner.ts
3. **Check if the task even reaches the API** - add logging at the very start of `/api/agent/execute`
4. **Compare with working tasks** - Morning Read and Meaningful Media work fine, what's different about their execution path?

---

## Commands to Test

```bash
# Direct Veo test (this works)
npx tsx scripts/test-veo.ts

# Check task in DB
Invoke-RestMethod -Uri http://localhost:3000/api/tasks | ConvertTo-Json

# Run tests
pnpm test
```

---

## Git Commits Made

- `6445d0c` - feat(phase2): Image Editing, Video Generation
- `f036d3d` - fix(veo): Implement correct async polling
- `6b06ddb` - fix(api): Remove content filters, improve error handling

All pushed to origin/main.
