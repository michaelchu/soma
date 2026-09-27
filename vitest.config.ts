import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Measure application logic and persistence code. UI leaf components are
      // better covered by a small browser smoke suite than by unit-test line
      // targets, so they are intentionally outside this unit-coverage budget.
      include: [
        'src/hooks/useDataManager.ts',
        'src/lib/dateUtils.ts',
        'src/lib/db/**/*.ts',
        'src/lib/exportUtils.ts',
        'src/lib/googleDrive.ts',
        'src/lib/secureStorage.ts',
        'src/lib/sqlite-schema.ts',
        'src/lib/sqlite-worker.ts',
        'src/lib/sqlite.ts',
        'src/lib/statsUtils.ts',
        'src/lib/validation.ts',
        'src/pages/activity/utils/activityHelpers.ts',
        'src/pages/activity/utils/streakCalculator.ts',
        'src/pages/blood-pressure/components/ui/FilterBar.tsx',
        'src/pages/blood-pressure/utils/bpHelpers.ts',
        'src/pages/blood-tests/utils/metricCalculations.ts',
        'src/pages/blood-tests/utils/statusHelpers.ts',
        'src/pages/main/utils/healthScore.ts',
        'src/pages/sleep/utils/sleepHelpers.ts',
      ],
      // Keep a modest regression floor for the unit-test scope. Browser-only
      // rendering behavior remains the responsibility of smoke/e2e tests.
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
      exclude: ['node_modules/', 'src/test/', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
