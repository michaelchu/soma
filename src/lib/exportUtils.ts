/**
 * Export utilities for generating markdown and CSV content
 * Consolidates common export patterns used across different data types
 */

/**
 * Create a markdown table from headers and rows
 * @param headers Array of column headers
 * @param rows Array of row arrays
 * @returns Formatted markdown table string
 */
export function createMarkdownTable(headers: string[], rows: (string | number)[][]): string {
  if (headers.length === 0) return '';

  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;
  const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

  return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Create CSV content from headers and rows
 * @param headers Array of column headers
 * @param rows Array of row arrays
 * @returns CSV formatted string with proper quoting
 */
export function createCSVContent(headers: string[], rows: (string | number)[][]): string {
  const allRows = [headers, ...rows];
  return allRows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * Get date range string from an array of items with dates
 * @param items Array of items with date property
 * @param dateField Name of the date field
 * @returns Formatted date range string (e.g., "Jan 1 to Jan 31")
 */
export function getDateRangeString<T>(
  items: T[],
  dateField: keyof T,
  formatFn: (date: string) => string
): string {
  if (items.length === 0) return 'No data';

  const dates = items
    .map((item) => new Date(item[dateField] as string).getTime())
    .filter((t) => !isNaN(t));

  if (dates.length === 0) return 'No valid dates';

  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return `${formatFn(minDate.toISOString())} to ${formatFn(maxDate.toISOString())}`;
}

/**
 * Generate a standard export header section
 * @param title Main title
 * @param dateRange Date range string
 * @param itemCount Number of items
 * @param itemLabel Label for items (e.g., "readings", "entries")
 * @returns Markdown header section
 */
export function generateExportHeader(
  title: string,
  dateRange: string,
  itemCount: number,
  itemLabel: string
): string {
  return `# ${title}\n\n**Analysis Period:** ${dateRange}\n**Total ${itemLabel}:** ${itemCount}\n\n`;
}

/**
 * Generate export footer with timestamp
 * @returns Markdown footer with generation timestamp
 */
export function generateExportFooter(): string {
  return `---\n*Generated on ${new Date().toLocaleString()}*\n`;
}

/**
 * Escape content for markdown table cells
 * Replaces pipe characters that would break table formatting
 */
export function escapeMarkdownCell(content: string | null | undefined, maxLength?: number): string {
  if (!content) return '-';
  let escaped = content.replace(/\|/g, '/').replace(/\n/g, ' ');
  if (maxLength && escaped.length > maxLength) {
    escaped = escaped.substring(0, maxLength) + '...';
  }
  return escaped;
}

/**
 * Sort items by date for export (oldest to newest)
 */
export function sortForExport<T>(items: T[], dateField: keyof T, ascending = true): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[dateField] as string).getTime();
    const dateB = new Date(b[dateField] as string).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Calculate percentage with formatting
 */
export function formatPercentage(count: number, total: number, decimals = 1): string {
  if (total === 0) return '0%';
  return `${((count / total) * 100).toFixed(decimals)}%`;
}

/**
 * Group items by a key and count occurrences
 */
export function countByKey<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

/**
 * Group items by a key and sum a numeric field
 */
export function sumByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number
): Record<string, number> {
  const sums: Record<string, number> = {};
  items.forEach((item) => {
    const key = keyFn(item);
    sums[key] = (sums[key] || 0) + valueFn(item);
  });
  return sums;
}
