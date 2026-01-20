# Handoff: Media Generation Phase 2

**Date:** January 19, 2026  
**Previous Session:** Fixed media task UI execution, created architecture docs  
**Next Focus:** Image editing, video generation, multi-step workflows

---

## ✅ Completed This Session

1. **Fixed Media Task Execution**
   - Art tasks now route through unified `/api/agent/execute` → `runner.ts` → `performDailyArt()`
   - Images properly upload to Vercel Blob and persist to gallery_items
   - Removed dead `generateArtPrompt()` code

2. **Created Documentation**
   - [architecture.md](architecture.md) - Full system architecture with diagrams
   - [media-generation.md](media-generation.md) - Media pipeline documentation
   - Updated [README.md](../README.md) - Comprehensive project overview
   - Updated [project_rules.md](project_rules.md) - Added task development patterns

3. **Verified**
   - Manual media task trigger works via UI ⚡ button
   - Build passes clean

---

## 🎯 Next Steps (Phase 2 Priorities)

### 1. Image Editing Capability
**Goal:** Retrieve an existing gallery image and apply modifications

**Implementation Plan:**
- Add `editImage()` function to `lib/agent/tools/media.ts`
- Use Gemini's image editing capabilities or Imagen edit API
- Accept gallery item ID as input, fetch image, apply edit prompt
- Save edited version as new gallery item (link to original)

**Test Case:**
```
1. Generate an image
2. Retrieve it from gallery by ID
3. Apply edit: "Add a golden sunset glow"
4. Save edited version
```

### 2. Video Generation (Veo)
**Goal:** Generate short videos from prompts or images

**Implementation Plan:**
- Create `lib/api/veo.ts` for Veo API wrapper
- Add `generateVideo()` to media.ts
- Support image-to-video (animate a gallery image)
- Store video in Blob, save to gallery with type: "video"

**Test Case:**
```
1. Take an existing gallery image
2. Send to Veo: "Slowly pan across scene, add gentle motion"
3. Save video to gallery
```

### 3. Schedule Panel DB Integration
**Goal:** Remove mock data, fully wire to database

**Implementation Plan:**
- Remove `mockGoals` from `lib/store/agent-store.ts`
- Ensure Schedule Panel fetches tasks only from `/api/tasks`
- Add task creation form that writes to DB
- Verify enable/disable persists

---

## 🧪 Multi-Step Test Case (Validation Target)

Once image editing and video generation are working:

```
Multi-Step "Daily Creation" Workflow:
┌────────────────────────────────────────────────┐
│ Step 1: Query recent memories                  │
│ Step 2: Generate image from memory context     │
│ Step 3: Retrieve image from gallery            │
│ Step 4: Apply artistic edit                    │
│ Step 5: Animate with Veo                       │
│ Step 6: Write memory about the experience      │
└────────────────────────────────────────────────┘
```

This validates:
- Memory retrieval working
- Image generation working
- Gallery retrieval working
- Image editing working
- Video generation working
- Memory writing working

---

## 📋 Future Phases (Reference)

### Phase 3: Extended Capabilities
- **Code Sandbox** - Isolated TypeScript/JavaScript execution
- **Browser Automation** - Playwright for web interaction
- **Long-form Writing** - Essays, journals, reflections

### Phase 4: Advanced Composition
- **Sub-agent Orchestration** - Specialized agents for different tasks
- **External Services** - v0.app, Producer.ai integration
- **Semantic Search** - Full pgvector search over memories

### Phase 5: Autonomy
- **Self-scheduling** - Agent adjusts its own schedule
- **Soul Document** - Ongoing reflection/heartbeat
- **Prompt Optimization** - Refined context management

---

## 🔧 Technical Notes

### Working Model for Media
Current default: `gemini-2.5-flash-image`
This is confirmed working via terminal and UI triggers.

### Key Files to Modify
- `lib/agent/tools/media.ts` - Add editImage(), generateVideo()
- `lib/api/veo.ts` - New file for Veo API
- `lib/api/imagen.ts` - May need edit endpoint support
- `lib/db/gallery.ts` - May need getGalleryItem() by ID

### Database Considerations
- Gallery items need a `parent_id` field for edit chains
- Video items need proper MIME type handling
- Consider adding `workflow_id` for multi-step grouping

---

## 📚 Reference Docs

- [architecture.md](architecture.md) - System design
- [project_rules.md](project_rules.md) - Development patterns
- [media-generation.md](media-generation.md) - Media pipeline
- [gemini-models.md](gemini-models.md) - Model reference
- [schedule.md](schedule.md) - Scheduling strategy

---

*Ready for next session: Media Gen Phase 2*
