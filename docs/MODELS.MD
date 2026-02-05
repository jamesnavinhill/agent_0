# MODELS

Last reviewed: 2026-02-05 (local)

This document reflects the model lists currently defined in:

- `lib/api/models.ts` (Gemini text models and presets)
- `lib/api/imagen.ts` (image models)
- `lib/api/veo.ts` (video models)

If a model is not listed here, it is not wired into the app code yet.

## Chat / Reasoning Models (Gemini)

Defined in `lib/api/models.ts` and used by the UI settings and agent tooling.

- `gemini-3-pro-preview`
- `gemini-3-pro-image-preview` (image)
- `gemini-3-flash-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-image` (image)
- `gemini-2.5-flash-lite`
- `gemini-2.5-flash-native-audio-preview-12-2025` (audio)
- `gemini-2.5-flash-preview-tts` (audio)
- `gemini-2.0-flash` (deprecated)

## Image Models (Imagen + Gemini Image)

Defined in `lib/api/imagen.ts`.

- `gemini-2.5-flash-image` (default)
- `gemini-3-pro-image-preview`
- `imagen-4.0-generate-001`
- `imagen-4.0-ultra-generate-001`
- `imagen-4.0-fast-generate-001`

## Video Models (Veo)

Defined in `lib/api/veo.ts`.

- `veo-3.0-fast-generate-001` (default)
- `veo-3.0-generate-001`
- `veo-3.1-fast-generate-preview`
- `veo-3.1-generate-preview`

## Defaults (From Code)

- Chat default: `gemini-3-flash-preview` (`lib/api/gemini.ts`).
- Image default: `gemini-2.5-flash-image` (`lib/api/imagen.ts`).
- Video default: `veo-3.0-fast-generate-001` (`lib/api/veo.ts`).
