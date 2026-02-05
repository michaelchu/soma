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

React 18 + TypeScript SPA using Supabase (PostgreSQL + auth), Vite, Tailwind CSS, and shadcn/ui components. Deployed to Vercel.

### Data Flow

```
Component → Feature Context → useDataManager hook → Database Layer (src/lib/db/) → Supabase
```

### Feature Modules (`src/pages/`)

Each feature (activity, blood-pressure, blood-tests, sleep, main) is self-contained with its own `components/`, `context/`, `hooks/`, `utils/`, and `constants/` directories. The main page is the dashboard.

### Shared Infrastructure (`src/lib/`)

- `db/` — One file per domain (activity.ts, bloodPressure.ts, bloodTests.ts, sleep.ts). All DB functions require authenticated user, filter by `user_id`, and return `{ data, error }` tuples.
- `validation.ts` — Zod schemas for all input validation with XSS sanitization.
- `dateUtils.ts` — Timezone-aware date/time helpers. Dates stored as `YYYY-MM-DD` strings; be careful with UTC vs local conversions.
- `AuthContext.tsx` — Session management with 30-min inactivity timeout.
- `SettingsContext.tsx` — User preferences (theme, font, font size).
- `toast.tsx` — Toast notifications via `withErrorHandling` wrapper for async operations.

### State Management

`createDataContext` factory (in `src/hooks/`) eliminates boilerplate — each feature context uses `useDataManager` for generic CRUD with optimistic updates.

### Types

Centralized in `src/types/` — one file per domain. Always use these shared types rather than defining inline.

### UI Components

`src/components/ui/` contains shadcn/ui primitives. `src/components/shared/` has app-wide components (Layout, Navbar, DateRangeTabs). Feature-specific components live within their feature directory.

## Key Conventions

- DB layer validates and sanitizes all input before database calls (defense in depth with Supabase RLS)
- Path alias: `@/*` maps to `src/*`
- Strict TypeScript: `noUnusedLocals` and `noUnusedParameters` enabled
- Prettier: 100-char width, 2-space indent, semicolons, trailing commas
- Pre-commit hooks (Husky + lint-staged) auto-run eslint and prettier on staged files
- Lazy loading for feature page routes (code splitting)
- Vendor chunks split: React, Recharts, Radix UI, Supabase

## Database

PostgreSQL via Supabase. Migrations in `supabase/migrations/`. Tables: `blood_pressure_readings`, `sleep_entries`, `activities`, `blood_test_reports`, `blood_test_metrics`. All tables have RLS policies restricting access to the owning user.

## Environment

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).
