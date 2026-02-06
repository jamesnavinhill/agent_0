# DATABASE

Last reviewed: 2026-02-05 (local)

Komorebi uses Neon Postgres via `@neondatabase/serverless`. Schema definitions live in `lib/db/schema.sql` and `scripts/create-sandbox-tables.sql`.

## Required Extensions

- `vector` is created in `lib/db/schema.sql` for embeddings.
- The schema uses `gen_random_uuid()` defaults. This requires the `pgcrypto` extension to be enabled in the database.

## Core Tables (lib/db/schema.sql)

### memories

Columns include `layer`, `content`, `source`, `relevance`, `tags`, `created_at`.

### activities

Columns include `action`, `details`, `status`, `level`, `source`, `image_url`, `metadata`, `created_at`.

### gallery_items

Columns include `type`, `blob_url`, `title`, `prompt`, `category`, `metadata`, `created_at`.

### tasks

Columns include `name`, `description`, `schedule`, `enabled`, `category`, `prompt`, `parameters`, `last_run`, `next_run`, `last_status`, `run_count`.

### goals

Columns include `title`, `description`, `progress`, `priority`, `subtasks`, `deadline`, `completed`.

### knowledge

Columns include `title`, `url`, `summary`, `content`, `embedding`, `tags`, `source`, `created_at`.

## Sandbox Tables (scripts/create-sandbox-tables.sql)

- `sandbox_projects`
- `sandbox_files`
- `sandbox_executions`
- `sandbox_dependencies`

## Migrations

- `pnpm run db:migrate` runs both `lib/db/schema.sql` and `scripts/create-sandbox-tables.sql` via `scripts/migrate.ts`.
- `node scripts/run-migration.mjs schema` runs the schema migration.
- `node scripts/run-migration.mjs sandbox` creates sandbox tables.
- `POST /api/db/migrate` can run migrations in dev environments.
