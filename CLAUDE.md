# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Production build (outputs to dist/)
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier format all files
npm run format:check     # Check formatting compliance
npm test                 # Run Vitest in watch mode
npm run test:run         # Run tests once (non-watch)
npm run test:coverage    # Run tests with coverage report
```

CI runs: format:check, lint, typecheck, build (in that order). All must pass.

## Architecture

React 18 + TypeScript SPA, Vite, Tailwind CSS, and shadcn/ui components. Deployed to Vercel.
Data lives in Postgres (Neon), accessed through Vercel serverless functions under `api/`.

### Data Flow

```
Component → Feature Context → useDataManager hook → Database Layer (src/lib/db/) → HTTP (src/lib/api.ts) → Vercel serverless functions (api/) → Neon Postgres
```

### Server API (`api/`)

- `api/_db.ts` — Neon HTTP client, idempotent schema bootstrap, shared handler helpers.
- One domain per file: `api/blood-pressure.ts`, `api/activities.ts`, `api/sleep.ts`,
  `api/blood-tests.ts` (+ `api/blood-tests-metrics.ts` upsert, `api/blood-tests-bulk.ts` bulk insert).
- `api/backup.ts` — full export / atomic replace (powers Google Drive backup/restore).
- `api/health.ts` — startup connectivity check.
- The browser never sees `DATABASE_URL` (server-side env var injected by the Neon integration).

### Feature Modules (`src/pages/`)

Each feature (activity, blood-pressure, blood-tests, sleep, main) is self-contained with its own `components/`, `context/`, `hooks/`, `utils/`, and `constants/` directories. The main page is the dashboard.

### Shared Infrastructure (`src/lib/`)

- `db/` — One file per domain (activity.ts, bloodPressure.ts, bloodTests.ts, sleep.ts). All DB functions return `{ data, error }` tuples. Each is a thin client over the matching `api/` endpoint.
- `api.ts` — HTTP client for the server API, plus `exportData`/`importData` (backup/restore) and `checkApiHealth` (startup check).
- `googleDrive.ts` — Google Drive backup/restore using Google Identity Services token flow.
- `validation.ts` — Zod schemas for all input validation with XSS sanitization.
- `dateUtils.ts` — Timezone-aware date/time helpers. Dates stored as `YYYY-MM-DD` strings; be careful with UTC vs local conversions.
- `SettingsContext.tsx` — User preferences (theme, font, font size).
- `toast.tsx` — Toast notifications via `withErrorHandling` wrapper for async operations.

### State Management

`createDataContext` factory (in `src/hooks/`) eliminates boilerplate — each feature context uses `useDataManager` for generic CRUD with optimistic updates.

### Types

Centralized in `src/types/` — one file per domain. Always use these shared types rather than defining inline.

### UI Components

`src/components/ui/` contains shadcn/ui primitives. `src/components/shared/` has app-wide components (Layout, Navbar, DateRangeTabs). Feature-specific components live within their feature directory.

## Key Conventions

- DB layer validates and sanitizes all input before database calls
- Path alias: `@/*` maps to `src/*`
- Strict TypeScript: `noUnusedLocals` and `noUnusedParameters` enabled
- Prettier: 100-char width, 2-space indent, semicolons, trailing commas
- Pre-commit hooks (Husky + lint-staged) auto-run eslint and prettier on staged files
- Lazy loading for feature page routes (code splitting)
- Vendor chunks split: React, Recharts, Radix UI

## Database

Postgres (Neon), accessed only through the Vercel serverless functions in `api/`
(the browser never holds database credentials). `api/_db.ts` runs an idempotent
schema bootstrap on cold start. Tables: `blood_pressure_readings`, `sleep_entries`,
`activities`, `blood_test_reports`, `blood_test_metrics`.

Google Drive backup/restore is available via `src/lib/googleDrive.ts` (optional, requires `VITE_GOOGLE_CLIENT_ID`).

## Environment

Optional: `VITE_GOOGLE_CLIENT_ID` for Google Drive backup (see `.env.example`).
