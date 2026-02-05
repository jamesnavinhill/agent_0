# STORAGE

Last reviewed: 2026-02-05 (local)

Komorebi stores media locally on disk. Storage logic is implemented in `lib/storage/local.ts`.

## Media Root

- Default root: `public/`.
- Override: set `MEDIA_ROOT_DIR` in `.env.local`.
- Requirement: the resolved `MEDIA_ROOT_DIR` must be inside `public/` so files can be served by Next.js.

## Common Paths

These paths are written by the app at runtime. Actual filenames are generated with UUIDs.

- `public/generated/` for generated images and videos.
- `public/gallery/` for gallery uploads via `/api/gallery` fallback mode.
- `public/research/` for saved text outputs.
- `public/snapshots/` for browser screenshots.

## Gallery Storage

- `lib/db/gallery.ts` stores gallery rows in Postgres and points each row at a local URL.
- `app/api/gallery/route.ts` can fall back to a filesystem index when the database is not configured.

## URL Shape

- Local files are served as relative URLs such as `/generated/<id>.png` or `/generated/<id>.mp4`.
- `uploadFile` rejects paths that try to escape the media root.
