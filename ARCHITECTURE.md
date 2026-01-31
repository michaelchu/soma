# Architecture

Soma is a personal health tracking app built with React, TypeScript, and Supabase.

## Directory Structure

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
│   ├── AuthContext.tsx  # Authentication state
│   ├── supabase.ts      # Supabase client
│   ├── validation.ts    # Input validation
│   ├── dateUtils.ts     # Date formatting/parsing
│   └── toast.tsx        # Toast notifications with error handling
│
├── pages/               # Feature modules (each is self-contained)
│   ├── activity/
│   ├── blood-pressure/
│   ├── blood-tests/
│   ├── dashboard/
│   └── sleep/
│
├── types/               # TypeScript type definitions
│   ├── activity.ts
│   ├── bloodPressure.ts
│   ├── bloodTests.ts
│   └── sleep.ts
│
└── views/               # Top-level views (Auth)
```

## Feature Module Structure

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

## Data Flow

```
User Action
    ↓
Component (calls context method)
    ↓
Context (manages state, calls db layer)
    ↓
Database Layer (src/lib/db/*.ts)
    ↓
Supabase
```

## Key Patterns

### Database Layer
All database operations:
- Require authenticated user (checked at start of each function)
- Filter by `user_id` for security
- Return `{ data, error }` tuples
- Validate input before database calls

### State Management
- `useDataManager` hook provides generic CRUD operations
- Each feature has its own Context for state
- Contexts created via `createDataContext` factory in `src/lib/contextUtils.tsx`

### Validation
- All user input validated via `src/lib/validation.ts`
- Validation returns `{ valid: boolean, errors: string[] }`
- String inputs sanitized to prevent XSS

### Error Handling
- `withErrorHandling` wrapper for async operations (see `src/lib/toast.tsx`)
- ErrorBoundary component catches unhandled React errors
- User-friendly messages displayed; details logged to console

## Environment Variables

See `.env.example` for required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Testing

```bash
npm test          # Run tests
npm run coverage  # Run with coverage report
```

Tests live alongside source files with `.test.ts` suffix.
