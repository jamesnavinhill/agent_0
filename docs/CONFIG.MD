# CONFIGURATION

Last reviewed: 2026-02-05 (local)

This document describes runtime configuration and UI settings based on the current codebase.

## Environment Variables

Defined in `.env.local` and referenced via `process.env`.

- `GOOGLE_API_KEY` is required for Gemini, Imagen, and Veo API calls in `lib/api/*`.
- `DATABASE_URL` is required for Neon Postgres access in `lib/db/neon.ts`.
- `CRON_SECRET` protects `/api/cron` and `/api/test/morning-read` when set.
- `MEDIA_ROOT_DIR` optionally overrides the local media root. It must resolve inside `public/` or storage will throw.

Example file: `.env.local.example`.

## UI Settings (Client-Side)

Settings are stored in localStorage under the key `agent_zero_settings`. The Gemini API key is stored separately using a local obfuscation utility in `lib/utils/secure-storage.ts`.

Defaults (from `hooks/use-settings.ts`):

- Chat model: `gemini-3-flash-preview`.
- Image model: `gemini-2.5-flash-image`.
- Image aspect ratio: `9:16`.
- Video model: `veo-3.0-fast-generate-001`.
- Video aspect ratio: `16:9`.
- Video resolution: `1080p`.
- Video duration: `6` seconds.
- Video include audio: `false` (experimental; we send `includeAudio=false` in the Veo config).
- Temperature: `0.7`.
- Schedules enabled: `true`.

## Settings and Tasks

- Manual runs can override task parameters via `/api/agent/execute`.
- The Settings panel can sync image and video defaults into task parameters using `PUT /api/tasks`.

## Security Note

`lib/utils/secure-storage.ts` only obfuscates API keys in localStorage. It is not cryptographic encryption and should not be treated as secure storage.
