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

React 18 + TypeScript SPA using local SQLite (WASM + OPFS), Vite, Tailwind CSS, and shadcn/ui components. Deployed to Vercel.

### Data Flow

```
Component → Feature Context → useDataManager hook → Database Layer (src/lib/db/) → SQLite (via Web Worker)
```

### Feature Modules (`src/pages/`)

Each feature (activity, blood-pressure, blood-tests, sleep, main) is self-contained with its own `components/`, `context/`, `hooks/`, `utils/`, and `constants/` directories. The main page is the dashboard.

### Shared Infrastructure (`src/lib/`)

- `db/` — One file per domain (activity.ts, bloodPressure.ts, bloodTests.ts, sleep.ts). All DB functions return `{ data, error }` tuples.
- `sqlite.ts` — SQLite interface (export/import data).
- `sqlite-worker.ts` — Web Worker handling SQLite WASM + OPFS persistence.
- `sqlite-schema.ts` — Database schema definitions.
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

Local SQLite via WASM, persisted with OPFS (Origin Private File System). Schema defined in `src/lib/sqlite-schema.ts`. All database operations run in a Web Worker (`src/lib/sqlite-worker.ts`). Tables: `blood_pressure_readings`, `sleep_entries`, `activities`, `blood_test_reports`, `blood_test_metrics`.

Google Drive backup/restore is available via `src/lib/googleDrive.ts` (optional, requires `VITE_GOOGLE_CLIENT_ID`).

## Environment

Optional: `VITE_GOOGLE_CLIENT_ID` for Google Drive backup (see `.env.example`).
