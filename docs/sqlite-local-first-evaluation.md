# Evaluation: Local-First SQLite + Google Drive Backup

## Goal

Replace Supabase (remote PostgreSQL + auth) with local SQLite (wa-sqlite + OPFS) and Google Drive backup — mimicking the architecture of mobile health apps that run a local DB and offer cloud backup.

## Current Architecture

```
React App → Feature Contexts → useDataManager → src/lib/db/*.ts → Supabase (remote PostgreSQL)
                                                  └── supabase.auth.getUser() for every call
```

**What exists today:**
- 4 DB modules: `bloodPressure.ts`, `activity.ts`, `sleep.ts`, `bloodTests.ts`
- All use `supabase` client directly (query builder: `.from().select().eq()`)
- All check `supabase.auth.getUser()` and filter by `user_id`
- `useDataManager` hook handles CRUD state (generic, DB-agnostic interface)
- `AuthContext` manages Supabase session + 30-min inactivity timeout
- No existing PWA manifest or service worker
- 14+ Supabase migrations define the schema

## Target Architecture

```
React App → Feature Contexts → useDataManager → src/lib/db/*.ts → Local SQLite (wa-sqlite + OPFS)
                                                                        │
                                                              Settings → [Backup to Google Drive]
                                                                         [Restore from Backup]
```

## Implementation Plan

### Phase 1: Local SQLite Layer

#### 1.1 Install & configure wa-sqlite
- `npm install wa-sqlite`
- Use **AccessHandlePoolVFS** (best perf, single-tab which is fine for a phone PWA)
- wa-sqlite uses **Asyncify** approach — no COOP/COEP headers needed (important: these headers would break Google OAuth popups)
- SQLite runs in a **Web Worker** (OPFS sync access handles require worker context)

#### 1.2 Create `src/lib/sqlite.ts` — Database singleton
- Initialize wa-sqlite with OPFS VFS in a Web Worker
- Create a `db` singleton that exposes `exec(sql, params)` and `query(sql, params)`
- Use Comlink or a simple postMessage API to communicate with the worker
- Call `navigator.storage.persist()` on init to prevent eviction (PWA on Android almost always gets granted)

#### 1.3 Create `src/lib/sqlite-schema.ts` — Schema initialization
Translate the Supabase migrations into a single SQLite schema. Key differences from PostgreSQL:
- No `auth.users` or `user_id` columns (single user, no RLS)
- `UUID` → `TEXT` with `hex(randomblob(16))` default
- `TIMESTAMPTZ` → `TEXT` (ISO 8601 strings)
- `DECIMAL` → `REAL`
- No RLS policies or triggers (SQLite doesn't support RLS)
- Keep CHECK constraints, indexes, and UNIQUE constraints
- Add a `schema_version` table for future migrations

Tables to create:
| PostgreSQL Table | SQLite Table | Changes |
|---|---|---|
| `blood_pressure_readings` | `blood_pressure_readings` | Drop `user_id`, UUID as TEXT |
| `sleep_entries` | `sleep_entries` | Drop `user_id` |
| `activities` | `activities` | Drop `user_id` |
| `blood_test_reports` | `blood_test_reports` | Drop `user_id` |
| `blood_test_metrics` | `blood_test_metrics` | No change (linked via report_id) |

#### 1.4 Rewrite `src/lib/db/*.ts` — Replace Supabase calls with SQLite
For each of the 4 DB modules, replace:
- `supabase.from('table').select()...` → `db.query('SELECT ... FROM table ...')`
- `supabase.from('table').insert()...` → `db.exec('INSERT INTO table ...')`
- `supabase.from('table').update()...` → `db.exec('UPDATE table ...')`
- `supabase.from('table').delete()...` → `db.exec('DELETE FROM table ...')`
- Remove all `supabase.auth.getUser()` checks (no auth needed for single-user local DB)
- Keep validation/sanitization (defense in depth)
- Keep the same `{ data, error }` return signature so `useDataManager` doesn't change

**Key: `useDataManager` and all feature contexts remain untouched.** Only the DB layer functions change their internals.

### Phase 2: Remove Supabase

#### 2.1 Remove auth
- Delete `AuthContext.tsx` (no login needed — it's your phone, your app)
- Remove auth checks from App routing (no login page redirect)
- Remove `@supabase/supabase-js` dependency
- Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- Delete `src/lib/supabase.ts`

#### 2.2 Simplify routing
- Remove login/signup pages if they exist
- App loads directly to dashboard

### Phase 3: Google Drive Backup

#### 3.1 Google Cloud setup (manual, one-time)
- Create a Google Cloud project
- Enable Google Drive API
- Create OAuth 2.0 Client ID (Web Application type)
- Add your Vercel domain as authorized origin
- Use `drive.appdata` scope (hidden app-specific folder, non-sensitive scope, no Google verification needed)

#### 3.2 Create `src/lib/googleDrive.ts`
- Load Google Identity Services (GIS) library
- `initAuth()` — call `google.accounts.oauth2.initTokenClient()` with client ID and `drive.appdata` scope
- `requestToken()` — trigger OAuth consent popup, store token in memory
- `backup(dbBytes: Uint8Array)` — upload the SQLite file to Drive's appDataFolder
  - Use multipart upload: `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
  - File metadata: `{ name: 'soma-backup.db', parents: ['appDataFolder'] }`
  - On subsequent backups, update existing file (use file ID from previous backup)
- `restore(): Uint8Array` — download the backup file from Drive
  - List files: `GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder`
  - Download: `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media`
- `getBackupInfo()` — return last backup date/size

#### 3.3 Add backup UI in Settings page
- "Google Drive Backup" section
- "Connect Google Account" button (one-time OAuth)
- "Last backup: Mar 8, 2026" status
- "Backup Now" button — exports SQLite DB bytes, uploads to Drive
- "Restore from Backup" button — downloads from Drive, replaces local DB, reloads app
- Restore shows a confirmation dialog ("This will replace all local data")

### Phase 4: PWA Setup

#### 4.1 Add `public/manifest.json`
- `name`, `short_name`, `display: standalone`, `start_url`, icons
- This enables "Add to Home Screen" on Android Chrome

#### 4.2 Add service worker (via vite-plugin-pwa)
- `npm install -D vite-plugin-pwa`
- Configure in `vite.config.ts`
- Cache app shell for offline use
- The SQLite DB is already in OPFS (not in the service worker cache)

#### 4.3 Request persistent storage
- On app startup: `await navigator.storage.persist()`
- Installed PWAs on Android Chrome almost always get granted
- This protects OPFS data from browser eviction

### Phase 5: Data Migration (one-time)

#### 5.1 Export from Supabase
- Before switching, export current data from Supabase as JSON (via dashboard or API)
- Create a one-time import script/page that reads the JSON and inserts into local SQLite

## Files Changed

| Action | File | Notes |
|--------|------|-------|
| **New** | `src/lib/sqlite.ts` | DB singleton, worker setup |
| **New** | `src/lib/sqlite-worker.ts` | Web Worker running wa-sqlite |
| **New** | `src/lib/sqlite-schema.ts` | Schema DDL + migration |
| **New** | `src/lib/googleDrive.ts` | Drive API backup/restore |
| **Modify** | `src/lib/db/bloodPressure.ts` | Supabase → SQLite queries |
| **Modify** | `src/lib/db/activity.ts` | Supabase → SQLite queries |
| **Modify** | `src/lib/db/sleep.ts` | Supabase → SQLite queries |
| **Modify** | `src/lib/db/bloodTests.ts` | Supabase → SQLite queries |
| **Delete** | `src/lib/supabase.ts` | No longer needed |
| **Delete** | `src/lib/AuthContext.tsx` | No auth for local app |
| **Modify** | `src/App.tsx` | Remove auth provider/guards |
| **Modify** | Settings page | Add backup/restore UI |
| **New** | `public/manifest.json` | PWA manifest |
| **Modify** | `vite.config.ts` | PWA plugin |
| **Modify** | `package.json` | Add wa-sqlite, remove @supabase/supabase-js |

## Files NOT Changed

- `src/hooks/useDataManager.ts` — generic CRUD hook, DB-agnostic
- `src/hooks/createDataContext.ts` — context factory
- All feature contexts (`BPContext`, `SleepContext`, etc.) — they call DB functions by name, not by implementation
- All UI components — they consume contexts, don't touch DB
- `src/lib/validation.ts` — still validates input
- `src/lib/dateUtils.ts` — still handles dates
- `src/types/*` — type definitions stay the same

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| User clears browser data → loses everything | Google Drive backup, persistent storage request, backup reminder prompts |
| OPFS not supported on old browsers | wa-sqlite falls back to IndexedDB via IDBBatchAtomicVFS |
| Google OAuth token expires (1 hour) | Re-request token on backup action; GIS handles this |
| SQLite DB corruption | WAL mode for crash safety; backup before restore |
| Large DB slows backup upload | Health data is tiny (~1-5 MB for years of daily tracking) |

## Estimated Complexity

The refactor is **mechanical, not architectural** — the app's component tree, state management, and UI are untouched. Only the bottom layer (DB calls) changes, and the interface (`{ data, error }` tuples) stays identical. The biggest new work is the Google Drive integration and PWA setup, both well-documented patterns.
