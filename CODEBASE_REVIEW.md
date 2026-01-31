# Soma Codebase Review
**Date:** January 31, 2026
**Reviewer:** Senior Software Engineer
**Codebase:** Soma Health Tracking Application

---

## Executive Summary

Soma is a well-structured React/TypeScript health tracking application (~18,400 LOC) with a modular architecture. The codebase demonstrates solid engineering practices including context factories, service layers, and shared component patterns. However, several areas require attention:

| Category | Status | Priority |
|----------|--------|----------|
| Architecture | Strong | - |
| Code Quality | Needs Improvement | High |
| Security | Good with gaps | Medium |
| Testing | Critical Gap | High |
| TypeScript | Needs Improvement | Medium |

**Key Metrics:**
- 131 TypeScript/TSX files
- 2 test files (~2% coverage)
- 7 files with explicit `any` usage
- 32+ non-null assertions without validation
- 4 untracked setTimeout instances (memory leak risk)

---

## Architecture Overview

### Strengths

The codebase demonstrates several excellent architectural patterns:

1. **Context Factory Pattern** (`src/lib/contextUtils.tsx`)
   - Eliminates boilerplate for data contexts
   - Type-safe provider creation
   - Consistent API across all feature modules

2. **Feature-Based Organization**
   ```
   pages/[feature]/
   ├── context/     # Data management
   ├── hooks/       # Custom hooks
   ├── components/  # UI components
   ├── utils/       # Business logic
   └── constants/   # Feature constants
   ```

3. **Generic Data Manager Hook** (`src/hooks/useDataManager.ts`)
   - Reusable CRUD operations
   - Proper mount status tracking
   - Ref-based stale closure prevention

4. **Clean Separation of Concerns**
   - Database layer (`lib/db/*.ts`)
   - Validation layer (`lib/validation.ts`)
   - Presentation layer (components)

---

## Critical Issues

### 1. Memory Leaks - Untracked Timers

**Severity:** High
**Impact:** Components may update after unmount, causing memory leaks

| File | Line | Issue |
|------|------|-------|
| `src/components/shared/SwipeableRow.tsx` | 137, 177 | `setTimeout` not cleaned up |
| `src/components/shared/ExportModal.tsx` | 41 | `setTimeout` not cleaned up |
| `src/pages/dashboard/components/ExportModal.tsx` | 334 | `setTimeout` not cleaned up |

**Current Code:**
```typescript
// SwipeableRow.tsx:137
setTimeout(() => onDelete(), 200);

// ExportModal.tsx:41
setTimeout(() => setCopied(false), 2000);
```

**Recommended Fix:**
```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);

// Usage
timeoutRef.current = setTimeout(() => setCopied(false), 2000);
```

---

### 2. Race Conditions in Data Fetching

**Severity:** High
**File:** `src/hooks/useDataManager.ts:88-106`

Multiple rapid calls to `fetchData()` can result in stale data:
1. Call 1 starts, fetches data
2. Call 2 starts, fetches data
3. Call 1 returns, sets state
4. Call 2 returns, overwrites with potentially stale data

**Recommended Fix:** Add request cancellation or sequence tracking:
```typescript
const fetchIdRef = useRef(0);

const fetchData = useCallback(async () => {
  const currentFetchId = ++fetchIdRef.current;
  setLoading(true);

  const { data, error } = await fetchFnRef.current();

  // Ignore stale responses
  if (currentFetchId !== fetchIdRef.current) return;

  // ... rest of logic
}, []);
```

---

### 3. Silent Error Swallowing

**Severity:** High
**File:** `src/pages/dashboard/context/DashboardContext.tsx:69-80`

Individual fetch errors are logged but not propagated to error state:

```typescript
if (bpResult.error) {
  console.error('BP fetch error:', bpResult.error);
  // Error NOT set to state - component doesn't know fetch failed!
}
```

**Impact:** Users see partial data without knowing some features failed to load.

**Recommended Fix:** Aggregate errors and surface to UI:
```typescript
const errors: string[] = [];
if (bpResult.error) errors.push('Blood pressure data failed to load');
if (sleepResult.error) errors.push('Sleep data failed to load');

if (errors.length > 0) {
  setError(errors.join('. '));
}
```

---

## Code Quality Issues

### Stale Closure in ScoreBarChart

**File:** `src/components/shared/ScoreBarChart.tsx:177`

```typescript
useLayoutEffect(() => {
  // ...
  onSelectIndex(lastIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [items.length]); // onSelectIndex missing from deps
```

The ESLint disable comment indicates awareness of the issue, but the stale callback can cause bugs when parent re-renders.

---

### Code Duplication

**Average Calculation Pattern** - Appears 3+ times:

| Location | Lines |
|----------|-------|
| `lib/db/bloodPressure.ts` | 94-108, 194-208, 328-342 |
| `pages/blood-pressure/components/modals/ReadingForm.tsx` | 99-125 |

**Recommendation:** Extract to utility function:
```typescript
// lib/bpUtils.ts
export function calculateBPAverages(readings: BPReading[]): BPAverages {
  const avgSystolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
  );
  // ... rest of logic
}
```

---

### Complex Components Needing Refactoring

**ReadingFormContent** (`src/pages/blood-pressure/components/modals/ReadingForm.tsx`)
- 300+ lines
- 8+ state variables
- Multiple responsibilities (form, validation, deletion, auto-scroll)

**Recommendation:** Split into smaller components:
- `BPRowsContainer` - manages row array
- `BPFormValidation` - validation logic
- `AverageDisplay` - calculated averages

---

## Security Concerns

### 1. Raw Error Messages Exposed

**File:** `src/views/Auth.tsx:23`

```typescript
setError(err.message || 'Invalid email or password');
```

**Risk:** Supabase errors like "User not found" vs "Invalid password" can reveal account existence.

**Recommendation:** Use generic error messages:
```typescript
setError('Invalid email or password');
console.error('Auth error:', err.message); // Log for debugging
```

---

### 2. Unvalidated JSON.parse

**File:** `src/lib/SettingsContext.tsx:28`

```typescript
return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
```

**Risk:** Malformed localStorage data could corrupt settings.

**Recommendation:** Validate parsed data:
```typescript
const parsed = JSON.parse(stored);
if (isValidSettings(parsed)) {
  return { ...DEFAULT_SETTINGS, ...parsed };
}
return DEFAULT_SETTINGS;
```

---

### 3. Missing Input Validation

**File:** `src/views/Auth.tsx:15-28`

No client-side validation before authentication attempt.

**Recommendation:** Add email format and password length validation:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    setError('Please enter a valid email address');
    return;
  }

  if (password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  // ... proceed with signIn
};
```

---

## Testing Gaps

### Current State

| Metric | Value |
|--------|-------|
| Test Files | 2 |
| Source Files | 129 |
| Test Coverage | ~2% |
| Test-to-Code Ratio | 1:45 |

### Existing Tests

- `src/pages/blood-tests/utils/statusHelpers.test.ts` (141 lines)
- `src/pages/blood-pressure/utils/bpHelpers.test.ts` (253 lines)

### Critical Paths Without Tests

| Priority | Module | Impact |
|----------|--------|--------|
| **Critical** | `lib/db/*.ts` | Data integrity |
| **Critical** | `lib/validation.ts` | Input validation |
| **High** | `pages/activity/utils/activityHelpers.ts` | Scoring logic |
| **High** | `pages/activity/utils/streakCalculator.ts` | Streak calculations |
| **Medium** | `lib/dateUtils.ts` | Date operations |
| **Medium** | `lib/statsUtils.ts` | Statistics |

### Missing Test Types

- **Component Tests:** 0 (92 components untested)
- **Integration Tests:** 0
- **Hook Tests:** 0
- **E2E Tests:** 0

### Recommendations

**Phase 1 (Immediate):** Add tests for validation and statistics
```
Target: lib/validation.ts, lib/statsUtils.ts
Expected: 80+ new test cases
```

**Phase 2 (Week 1-2):** Test business logic
```
Target: activityHelpers.ts, streakCalculator.ts
Expected: 60+ new test cases
```

**Phase 3 (Week 2-3):** Database operation tests with mocks
```
Target: lib/db/*.ts
Expected: 80+ new test cases
```

---

## TypeScript Issues

### 1. Strict Mode Disabled

**File:** `tsconfig.json:18`

```json
"strict": false,
"noImplicitAny": false,
```

**Impact:** Implicit `any` types allowed, reducing type safety.

**Recommendation:** Enable strict mode incrementally:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

---

### 2. Explicit `any` Usage

| File | Location | Issue |
|------|----------|-------|
| `hooks/useDataManager.ts` | Line 28 | Generic constraint `[key: string]: any` |
| `pages/blood-pressure/components/charts/BPTimeChart.tsx` | Lines 235, 237 | `props: any` |
| `pages/blood-tests/components/modals/ReportImporter.tsx` | Line 109 | Implicit `{}` type |
| `pages/BloodTests.tsx` | Lines 45, 52, 57 | State without explicit types |

---

### 3. Unsafe Type Assertions

**File:** `src/lib/dateUtils.ts:299-300`

```typescript
const dateA = new Date(a[dateKey] as string);
const dateB = new Date(b[dateKey] as string);
```

**Risk:** Assumes value is string, but could be number or Date.

**Recommended Fix:**
```typescript
const dateA = new Date(String(a[dateKey]));
const dateB = new Date(String(b[dateKey]));
```

---

### 4. Non-Null Assertions

32+ instances of `!` operator without defensive checks, primarily in:
- `src/pages/dashboard/utils/healthScore.ts`
- `src/pages/sleep/utils/sleepHelpers.ts`

**Example:**
```typescript
const avgSystolic = avg(systolics)!; // Risk: avg() returns null for empty array
```

**Recommendation:** Add null checks:
```typescript
const avgSystolic = avg(systolics);
if (avgSystolic === null) return null;
```

---

### 5. Missing AuthContext Types

**File:** `src/lib/AuthContext.tsx`

```typescript
export function AuthProvider({ children }) { // Missing: children: ReactNode
  const signIn = async (email, password) => { // Missing parameter types
```

**Recommended Fix:**
```typescript
interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function AuthProvider({ children }: AuthProviderProps) {
```

---

## Recommended Action Plan

### Immediate (This Week)

1. **Fix memory leaks** - Add cleanup for setTimeout calls
2. **Fix race conditions** - Add request cancellation to useDataManager
3. **Surface fetch errors** - Update DashboardContext error handling

### Short-term (2 Weeks)

4. **Add critical tests** - Validation, statistics, and business logic
5. **Enable strict mode** - Fix type errors incrementally
6. **Add input validation** - Auth form and other user inputs

### Medium-term (1 Month)

7. **Increase test coverage** - Target 60%+ coverage
8. **Refactor large components** - Break down ReadingFormContent
9. **Extract duplicated code** - Create shared utilities
10. **Replace `any` types** - Use proper interfaces

### Long-term (Ongoing)

11. **Add component tests** - React Testing Library
12. **Add E2E tests** - User workflow testing
13. **Enable all strict options** - Full type safety
14. **Documentation** - Add JSDoc comments to public APIs

---

## Summary

The Soma codebase has a solid architectural foundation with good patterns and organization. The main areas requiring attention are:

1. **Memory leaks** from untracked timers (4 locations)
2. **Race conditions** in data fetching
3. **Test coverage** at ~2% (critical gap)
4. **TypeScript strict mode** disabled
5. **Error handling** that swallows failures

Addressing these issues will significantly improve reliability, maintainability, and developer experience. The recommended action plan prioritizes fixes by impact and effort.

---

*Review generated by automated codebase analysis.*
