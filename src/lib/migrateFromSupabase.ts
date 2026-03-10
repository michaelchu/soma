/**
 * One-time migration helper: import data exported from Supabase into local SQLite.
 *
 * Expected input: JSON file with shape { tableName: [ { ...row }, ... ], ... }
 * This matches the output of Supabase's table export or our own exportData() format.
 *
 * Strips `user_id` columns (local app is single-user) and maps any column name
 * differences between the Supabase schema and the local SQLite schema.
 */

import { importData } from './sqlite';

/** Columns to strip when importing from Supabase (not in local schema) */
const COLUMNS_TO_STRIP = ['user_id'];

/** Valid table names in local SQLite schema */
const VALID_TABLES = new Set([
  'blood_pressure_readings',
  'sleep_entries',
  'activities',
  'blood_test_reports',
  'blood_test_metrics',
]);

function stripColumns(row: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!COLUMNS_TO_STRIP.includes(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Parse and validate a Supabase JSON export, then import into local SQLite.
 * Returns the number of rows imported per table.
 */
export async function migrateFromSupabase(
  jsonData: Record<string, Record<string, unknown>[]>
): Promise<Record<string, number>> {
  const cleaned: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};

  for (const [tableName, rows] of Object.entries(jsonData)) {
    if (!VALID_TABLES.has(tableName)) {
      continue; // Skip unknown tables (e.g. schema_version, auth tables)
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      counts[tableName] = 0;
      continue;
    }
    cleaned[tableName] = rows.map(stripColumns);
    counts[tableName] = rows.length;
  }

  if (Object.keys(cleaned).length === 0) {
    throw new Error(
      'No valid tables found in the import file. ' +
        `Expected tables: ${[...VALID_TABLES].join(', ')}`
    );
  }

  await importData(cleaned);
  return counts;
}

/**
 * Read a JSON file from a File input and run the migration.
 */
export async function migrateFromFile(file: File): Promise<Record<string, number>> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object with table names as keys');
  }

  return migrateFromSupabase(parsed as Record<string, Record<string, unknown>[]>);
}
