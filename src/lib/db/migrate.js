/**
 * One-time migration script to import existing markdown data into Supabase
 *
 * Run this once after logging in to migrate your data.
 * It's safe to run multiple times - it checks for existing data first.
 */

import { supabase } from '../supabase';
import { bulkInsertReadings } from './bloodPressure';
import { bulkInsertReports } from './bloodTests';

// Import markdown parsers
import { parseReadings } from '../../pages/blood-pressure/services/markdownParser';
import { parseReports } from '../../pages/blood-tests/services/markdownParser';

// Import raw markdown files
import readingsMarkdown from '../../pages/blood-pressure/data/readings.md?raw';
import reportsMarkdown from '../../pages/blood-tests/data/reports.md?raw';

/**
 * Check if migration has already been done
 */
async function checkExistingData() {
  const { count: bpCount } = await supabase
    .from('blood_pressure_readings')
    .select('*', { count: 'exact', head: true });

  const { count: reportsCount } = await supabase
    .from('blood_test_reports')
    .select('*', { count: 'exact', head: true });

  return {
    hasBloodPressureData: (bpCount || 0) > 0,
    hasBloodTestData: (reportsCount || 0) > 0,
  };
}

/**
 * Migrate blood pressure readings from markdown
 */
async function migrateBloodPressureReadings() {
  console.log('Parsing blood pressure readings from markdown...');
  const readings = parseReadings(readingsMarkdown);
  console.log(`Found ${readings.length} blood pressure readings`);

  if (readings.length === 0) {
    console.log('No blood pressure readings to migrate');
    return { success: true, count: 0 };
  }

  console.log('Inserting blood pressure readings into Supabase...');
  const { data, error } = await bulkInsertReadings(readings);

  if (error) {
    console.error('Failed to migrate blood pressure readings:', error);
    return { success: false, error };
  }

  console.log(`Successfully migrated ${data.length} blood pressure readings`);
  return { success: true, count: data.length };
}

/**
 * Migrate blood test reports from markdown
 */
async function migrateBloodTestReports() {
  console.log('Parsing blood test reports from markdown...');
  const reports = parseReports(reportsMarkdown);
  console.log(`Found ${reports.length} blood test reports`);

  if (reports.length === 0) {
    console.log('No blood test reports to migrate');
    return { success: true, count: 0 };
  }

  // Log metric counts
  for (const report of reports) {
    const metricCount = Object.keys(report.metrics).length;
    console.log(`  Report ${report.date}: ${metricCount} metrics`);
  }

  console.log('Inserting blood test reports into Supabase...');
  const { data, error } = await bulkInsertReports(reports);

  if (error) {
    console.error('Failed to migrate blood test reports:', error);
    return { success: false, error };
  }

  console.log(`Successfully migrated ${data.length} blood test reports`);
  return { success: true, count: data.length };
}

/**
 * Run the full migration
 */
export async function runMigration() {
  console.log('=== Starting Data Migration ===\n');

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('Not authenticated. Please log in first.');
    return {
      success: false,
      error: 'Not authenticated',
    };
  }

  console.log(`Authenticated as: ${user.email}\n`);

  // Check for existing data
  const existing = await checkExistingData();

  const results = {
    bloodPressure: null,
    bloodTests: null,
  };

  // Migrate blood pressure
  if (existing.hasBloodPressureData) {
    console.log('Blood pressure data already exists, skipping migration');
    results.bloodPressure = { success: true, skipped: true };
  } else {
    results.bloodPressure = await migrateBloodPressureReadings();
  }

  console.log('');

  // Migrate blood tests
  if (existing.hasBloodTestData) {
    console.log('Blood test data already exists, skipping migration');
    results.bloodTests = { success: true, skipped: true };
  } else {
    results.bloodTests = await migrateBloodTestReports();
  }

  console.log('\n=== Migration Complete ===');
  console.log('Results:', JSON.stringify(results, null, 2));

  return {
    success: results.bloodPressure.success && results.bloodTests.success,
    results,
  };
}

export default runMigration;
