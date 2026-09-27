# Soma

Personal health tracking app - a launcher portal for mini health-related apps built with React, TypeScript, and local-first storage.

## Quick Start

```bash
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and add the optional Google Drive client ID if you want backup/restore:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Features

### Dashboard

Home page with an overview of your health data:

- **Health Score**: Composite score (0-100) based on blood pressure and sleep data
- **Timeline**: Recent activities from all health apps
- **Insights**: Personalized health insights
- **Export**: Download your data in CSV/JSON formats

### Blood Pressure

Track and analyze blood pressure readings:

- Record sessions with multiple readings per session
- Track arm used (L/R), pulse, and notes
- Statistics with averages and variability calculations
- Visual trend charts
- Date range filtering (7d, 1m, 3m, 6m, all)
- Time of day filtering (AM/PM)

### Blood Tests

Track lab results over time:

- Import multiple test reports
- Line charts with reference range bands
- Automatic abnormal value flagging
- Category filtering (CBC, Metabolic, Lipid, Liver, Thyroid, etc.)
- Built-in reference ranges with clinical descriptions

### Sleep

Monitor sleep quality and patterns:

- Record sleep times and duration
- HRV data (high/low)
- Resting and lowest heart rate
- Sleep stages (deep, REM, light, awake)
- Sleep cycles tracking
- Movement and skin temperature

### Activity

Log physical activities:

- Activity types: Walking, Badminton, Pickleball, Other
- Duration and intensity (1-5 scale)
- Optional heart rate zone data
- Calendar view with streak tracking

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| Icons | Lucide React |
| Routing | React Router v6 |
| Charts | Recharts |
| Storage | SQLite via wa-sqlite + OPFS |
| Backup | Optional Google Drive appDataFolder |
| Testing | Vitest + Testing Library |
| Validation | Zod |

## Architecture

### Directory Structure

```
src/
├── components/           # Shared components
│   ├── shared/          # App-wide shared components (Layout, Navigation)
│   └── ui/              # shadcn/ui primitives (Button, Card, Input, etc.)
│
├── hooks/               # Shared custom hooks
│   └── useDataManager   # Generic CRUD hook used by all features
│
├── lib/                 # Core utilities and services
│   ├── db/              # Database layer (one file per domain)
│   │   ├── activity.ts
│   │   ├── bloodPressure.ts
│   │   ├── bloodTests.ts
│   │   └── sleep.ts
│   ├── sqlite.ts        # Local SQLite worker bridge
│   ├── sqlite-worker.ts # wa-sqlite + OPFS worker
│   ├── googleDrive.ts   # Optional backup/restore
│   ├── validation.ts    # Input validation
│   ├── dateUtils.ts     # Date formatting/parsing
│   └── toast.tsx        # Toast notifications with error handling
│
├── pages/               # Feature modules (each is self-contained)
│   ├── activity/
│   ├── blood-pressure/
│   ├── blood-tests/
│   ├── main/
│   └── sleep/
│
├── types/               # TypeScript type definitions
│
└── views/               # Top-level views (settings and dialogs)
```

### Feature Module Structure

Each feature under `src/pages/` follows the same pattern:

```
feature/
├── components/          # Feature-specific UI components
│   ├── charts/         # Data visualizations
│   ├── modals/         # Dialogs for add/edit
│   ├── tabs/           # Tab content components
│   └── ui/             # Feature-specific UI elements
├── context/            # Feature state (React Context)
├── hooks/              # Feature-specific hooks
├── utils/              # Feature-specific helpers
├── constants/          # Feature-specific constants
└── index.tsx           # Main page component
```

### Data Flow

```
User Action
    ↓
Component (calls context method)
    ↓
Context (manages state, calls db layer)
    ↓
Database Layer (src/lib/db/*.ts)
    ↓
Local SQLite (OPFS)
```

### Key Patterns

**Database Layer**: Feature data is stored locally in SQLite/OPFS, with validation before database calls and `{ data, error }` tuples returned to the UI.

**State Management**: `useDataManager` hook provides generic CRUD operations. Each feature has its own Context created via `createDataContext` factory.

**Validation**: All user input validated via `src/lib/validation.ts` with sanitization to prevent XSS.

**Error Handling**: `withErrorHandling` wrapper for async operations. ErrorBoundary catches unhandled React errors. User-friendly messages displayed with details logged to console.

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm test          # Run tests
npm run coverage  # Run with coverage report
npm run lint      # ESLint check
npm run format    # Prettier formatting
```

## Deployment

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static host.
