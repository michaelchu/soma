# Principal Software Engineer Code Review

**Project:** Soma - Personal Health Tracking Application
**Review Date:** January 24, 2026
**Reviewer:** Principal Software Engineer

---

## Executive Summary

Soma is a well-structured React-based health tracking application that demonstrates solid foundational architecture. The codebase shows thoughtful design decisions, particularly in feature organization and component separation. However, there are opportunities for improvement in areas of state management patterns, performance optimization, error handling, and testing coverage.

**Overall Assessment:** 🟢 Good (with recommendations)

---

## 1. Architecture Review

### 1.1 Strengths

#### ✅ Feature-Based Module Organization
The codebase follows an excellent feature-based structure:
```
src/pages/blood-tests/
├── components/    # Feature-specific UI
├── constants/     # Configuration data
├── hooks/         # Custom React hooks
└── utils/         # Helper functions
```
This pattern promotes:
- High cohesion within features
- Easy navigation and discoverability
- Isolated feature development

#### ✅ Clean Separation of Concerns
- **Data Layer** (`src/lib/db/`): Database operations are cleanly abstracted
- **Context Providers** (`src/lib/`): Global state is properly isolated
- **UI Components** (`src/components/ui/`): shadcn/ui provides consistent, accessible base components
- **Page Components** (`src/pages/`): Feature entry points are clearly defined

#### ✅ Context API Usage
The application uses React Context appropriately for cross-cutting concerns:
- `AuthContext`: Authentication state
- `ThemeContext`: Theme preferences
- `SettingsContext`: User settings

Each context is well-implemented with proper error handling for missing providers (`src/lib/AuthContext.jsx:51-53`).

#### ✅ Database Schema Design
The Supabase schema demonstrates good practices:
- Row Level Security (RLS) properly enforced
- Appropriate indexes for common query patterns
- Cascading deletes for referential integrity
- CHECK constraints for data validation

### 1.2 Areas for Improvement

#### ⚠️ Missing Error Boundaries
**Location:** Application-wide
**Issue:** No React Error Boundaries exist to catch and gracefully handle runtime errors.

**Recommendation:**
```jsx
// Create src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### ⚠️ No Route-Level Code Splitting
**Location:** `src/App.jsx`
**Issue:** All page components are eagerly imported, increasing initial bundle size.

**Current:**
```jsx
import BloodTests from '@/pages/BloodTests';
import BloodPressure from '@/pages/BloodPressure';
```

**Recommendation:**
```jsx
const BloodTests = lazy(() => import('@/pages/BloodTests'));
const BloodPressure = lazy(() => import('@/pages/BloodPressure'));

// In render:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>...</Routes>
</Suspense>
```

#### ⚠️ Inconsistent State Management Pattern
**Location:** `src/pages/blood-tests/hooks/useReports.js:44-70`
**Issue:** The `useEffect` duplicates logic already in `fetchReports` callback.

**Current Code:**
```javascript
const fetchReports = useCallback(async () => {
  setLoading(true);
  const { data, error: fetchError } = await getReports();
  // ... handling logic
}, []);

useEffect(() => {
  const loadReports = async () => {
    setLoading(true);
    const { data, error: fetchError } = await getReports();
    // ... same handling logic duplicated
  };
  loadReports();
}, []);
```

**Recommendation:**
```javascript
useEffect(() => {
  fetchReports();
}, [fetchReports]);
```

#### ⚠️ Prop Drilling in Large Components
**Location:** `src/pages/BloodPressure.jsx`
**Issue:** Multiple callbacks (`addSession`, `updateSession`, `deleteSession`) are passed through multiple layers.

**Recommendation:** Consider a feature-specific context or co-locate related state:
```jsx
// Create BloodPressureContext for feature-specific state
const BloodPressureProvider = ({ children }) => {
  const { readings, ...methods } = useReadings();
  return (
    <BloodPressureContext.Provider value={{ readings, ...methods }}>
      {children}
    </BloodPressureContext.Provider>
  );
};
```

---

## 2. Code Maintenance Review

### 2.1 Strengths

#### ✅ Consistent Code Style
- ESLint and Prettier are properly configured
- Husky pre-commit hooks enforce standards
- Consistent naming conventions throughout

#### ✅ JSDoc Documentation
Database functions have proper JSDoc comments (`src/lib/db/bloodTests.js`):
```javascript
/**
 * Get all blood test reports with their metrics for the current user
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
```

#### ✅ Meaningful Component Names
Component and file names clearly describe their purpose:
- `MetricChart`, `StatusBadge`, `RangeBar`
- `useReports`, `useReadings`, `useIgnoredMetrics`

#### ✅ Clean UI Component Library
shadcn/ui components provide:
- Accessibility out of the box
- Consistent theming
- Well-documented patterns

### 2.2 Areas for Improvement

#### ⚠️ Large Component Files
**Location:** `src/pages/BloodTests.jsx` (513 lines)
**Issue:** Component handles too many responsibilities:
- State management (10+ useState hooks)
- Event handlers
- Data transformations
- Rendering logic

**Recommendation:** Extract into smaller, focused components:
```
BloodTests/
├── index.jsx              # Main orchestrator
├── BloodTestsHeader.jsx   # Filter bar, dropdowns
├── MetricsGrid.jsx        # Category grouping, metric rendering
├── hooks/
│   └── useBloodTestsState.js  # Consolidated state logic
└── utils/
    └── filterMetrics.js   # Data transformation logic
```

#### ⚠️ Magic Numbers and Strings
**Location:** `src/pages/blood-tests/components/charts/MetricChart.jsx:21-22`
```javascript
const LONG_PRESS_DURATION = 600; // ms
const MOVE_THRESHOLD = 10; // pixels
```
These are good, but similar patterns aren't followed elsewhere.

**Location:** `src/pages/BloodTests.jsx:265`
```jsx
top-[49px]  // Magic number for sticky positioning
```

**Recommendation:** Create a shared constants file:
```javascript
// src/constants/ui.js
export const NAVBAR_HEIGHT = 49;
export const LONG_PRESS_DURATION = 600;
export const SCROLL_THRESHOLD = 8;
```

#### ⚠️ Inconsistent Error Handling
**Location:** `src/lib/db/bloodPressure.js`
**Issue:** Errors are logged to console but not consistently returned to callers.

**Current:**
```javascript
if (error) {
  console.error('Error fetching blood pressure readings:', error);
  return { data: null, error };
}
```

**Recommendation:** Implement a centralized error handling utility:
```javascript
// src/lib/errors.js
export function handleDbError(error, context) {
  console.error(`[${context}]`, error);

  // Future: Send to error monitoring service
  // Sentry.captureException(error);

  return {
    message: getUserFriendlyMessage(error),
    code: error.code,
    originalError: error,
  };
}
```

#### ⚠️ No TypeScript
**Issue:** The codebase uses JavaScript with JSDoc, but lacks type safety.

**Impact:**
- Runtime errors from type mismatches
- IDE autocomplete is limited
- Refactoring is riskier

**Recommendation:** Consider gradual TypeScript adoption:
1. Add `jsconfig.json` with `"checkJs": true`
2. Add TypeScript for new files
3. Gradually convert existing files

#### ⚠️ Missing Test Suite
**Location:** Project-wide
**Issue:** No tests exist (`"Test Files: 0"` from exploration)

**Recommendation:** Add testing infrastructure:
```json
// package.json additions
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

Priority test areas:
1. **Utility functions** (`statusHelpers.js`, `bpHelpers.js`) - pure functions, easy to test
2. **Custom hooks** (`useReports`, `useReadings`) - critical data flow
3. **Components** - user interaction flows

---

## 3. Performance Review

### 3.1 Strengths

#### ✅ Proper Use of useMemo
**Location:** `src/pages/BloodPressure.jsx:45-48`
```javascript
const filteredReadings = useMemo(
  () => filterReadings(readings, dateRange, timeOfDay),
  [readings, dateRange, timeOfDay]
);
```

#### ✅ useCallback for Event Handlers
Hooks use `useCallback` appropriately to prevent unnecessary re-renders:
```javascript
const addSession = useCallback(async (session) => { ... }, []);
```

#### ✅ Proper Database Indexing
```sql
CREATE INDEX idx_bp_readings_user_recorded ON blood_pressure_readings(user_id, recorded_at DESC);
```

### 3.2 Areas for Improvement

#### 🔴 N+1 Query Pattern
**Location:** `src/lib/db/bloodTests.js:12-38`
**Issue:** Fetches all reports, then fetches all metrics separately.

**Current:**
```javascript
const { data: reports } = await supabase.from('blood_test_reports').select('*');
const { data: metrics } = await supabase.from('blood_test_metrics').select('*').in('report_id', reportIds);
```

**Recommendation:** Use Supabase's relational queries:
```javascript
const { data: reports } = await supabase
  .from('blood_test_reports')
  .select(`
    *,
    metrics:blood_test_metrics(*)
  `)
  .order('report_date', { ascending: false });
```

This reduces 2 round trips to 1.

#### 🔴 Re-renders in MetricChart
**Location:** `src/pages/blood-tests/components/charts/MetricChart.jsx:117-130`
**Issue:** Data is sorted and filtered on every render.

**Current:**
```javascript
const data = reports
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .map((r) => { ... })
  .filter(Boolean);
```

**Recommendation:** Memoize expensive computations:
```javascript
const data = useMemo(() =>
  reports
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => { ... })
    .filter(Boolean),
  [reports, metricKey]
);
```

#### ⚠️ Large Lists Without Virtualization
**Location:** `src/pages/BloodTests.jsx`
**Issue:** All metrics are rendered at once. With many reports/metrics, this can cause performance issues.

**Recommendation:** Consider react-window or react-virtualized for lists exceeding ~50 items:
```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={sortedMetrics.length}
  itemSize={200}
>
  {({ index, style }) => (
    <div style={style}>
      <MetricChart metricKey={sortedMetrics[index]} ... />
    </div>
  )}
</FixedSizeList>
```

#### ⚠️ Recharts Bundle Size
**Location:** `package.json`
**Issue:** Recharts is a large library (~500KB unparsed). Currently importing multiple components.

**Recommendation:**
1. Check bundle size with `npm run build -- --report`
2. Consider lighter alternatives if charts are simple (Chart.js, or native SVG)
3. Or ensure tree-shaking is working:
```javascript
// Good - tree-shakeable
import { LineChart, Line } from 'recharts';

// Bad - imports entire library
import * as Recharts from 'recharts';
```

#### ⚠️ Missing Pagination
**Location:** `src/lib/db/bloodPressure.js:26-30`
**Issue:** `getReadings()` fetches ALL readings for a user.

**Current:**
```javascript
const { data } = await supabase
  .from('blood_pressure_readings')
  .select('*')
  .order('recorded_at', { ascending: false });
```

**Recommendation:** Add pagination for scalability:
```javascript
export async function getReadings({ page = 1, pageSize = 50 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from('blood_pressure_readings')
    .select('*', { count: 'exact' })
    .order('recorded_at', { ascending: false })
    .range(from, to);

  return { data, count, page, pageSize };
}
```

#### ⚠️ Optimistic Updates Not Implemented
**Location:** `src/pages/blood-tests/hooks/useReports.js:72-87`
**Issue:** After adding a report, the entire dataset is refetched.

**Current:**
```javascript
const addReport = useCallback(async (report) => {
  const { data, error } = await addReportDb(report);
  if (!error) {
    await fetchReports(); // Full refetch
  }
  return { data };
}, [fetchReports]);
```

**Recommendation:** Use optimistic updates:
```javascript
const addReport = useCallback(async (report) => {
  // Optimistically add to state
  const optimisticReport = { ...report, id: `temp-${Date.now()}` };
  setReports(prev => [optimisticReport, ...prev]);

  try {
    const { data, error } = await addReportDb(report);
    if (error) throw error;

    // Replace optimistic with real data
    setReports(prev =>
      prev.map(r => r.id === optimisticReport.id ? data : r)
    );
    return { data };
  } catch (error) {
    // Rollback on failure
    setReports(prev => prev.filter(r => r.id !== optimisticReport.id));
    return { error };
  }
}, []);
```

---

## 4. Security Review

### 4.1 Strengths

#### ✅ Row Level Security (RLS)
All tables have RLS policies ensuring users only access their own data.

#### ✅ Environment Variables
Sensitive configuration is stored in environment variables:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 4.2 Areas for Improvement

#### ⚠️ No Input Validation on Client
**Location:** `src/pages/blood-pressure/components/modals/ReadingForm.jsx` (assumed)
**Issue:** Rely solely on database constraints for validation.

**Recommendation:** Add client-side validation:
```javascript
const validateReading = (reading) => {
  const errors = {};

  if (reading.systolic < 50 || reading.systolic > 300) {
    errors.systolic = 'Systolic must be between 50-300';
  }
  if (reading.diastolic < 30 || reading.diastolic > 200) {
    errors.diastolic = 'Diastolic must be between 30-200';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
```

#### ⚠️ localStorage Without Encryption
**Location:** `src/lib/SettingsContext.jsx`, `src/pages/blood-tests/hooks/useIgnoredMetrics.js`
**Issue:** Preferences stored in plain text localStorage.

For health data applications, consider:
1. Using session storage for sensitive data
2. Encrypting localStorage data
3. Using Supabase for user preferences (already authenticated)

---

## 5. Summary of Recommendations

### High Priority
| Issue | Location | Impact |
|-------|----------|--------|
| Add Error Boundaries | App-wide | User experience, crash prevention |
| Fix N+1 Query | `bloodTests.js` | Database performance |
| Memoize MetricChart calculations | `MetricChart.jsx` | Render performance |
| Add basic test coverage | Project-wide | Code reliability |

### Medium Priority
| Issue | Location | Impact |
|-------|----------|--------|
| Route-level code splitting | `App.jsx` | Initial load time |
| Fix duplicated fetchReports logic | `useReports.js` | Maintainability |
| Add pagination to queries | `bloodPressure.js` | Scalability |
| Extract large components | `BloodTests.jsx` | Maintainability |

### Low Priority
| Issue | Location | Impact |
|-------|----------|--------|
| Consider TypeScript migration | Project-wide | Type safety |
| Add list virtualization | Metric lists | Performance at scale |
| Implement optimistic updates | Hooks | UX responsiveness |
| Centralize error handling | `src/lib/errors.js` | Consistency |

---

## 6. Positive Highlights

The codebase demonstrates several excellent practices worth preserving:

1. **Modern React patterns**: Proper hooks usage, functional components
2. **Accessibility**: Radix UI primitives ensure good a11y defaults
3. **Responsive design**: Mobile-first approach with tailored interactions
4. **Clean data layer**: Clear separation between DB operations and UI
5. **Code quality tooling**: ESLint, Prettier, Husky pre-commit hooks
6. **CI/CD pipeline**: GitHub Actions for automated checks

---

## Conclusion

Soma is a well-architected application with solid foundations. The recommended improvements focus on:

1. **Scalability** - Pagination, virtualization
2. **Reliability** - Error boundaries, tests
3. **Performance** - Query optimization, memoization
4. **Maintainability** - Component decomposition, TypeScript

The codebase is in good shape for a personal project and shows professional-level organization. Implementing the high-priority recommendations would significantly improve production-readiness.

---

*Review completed by Principal Software Engineer*
