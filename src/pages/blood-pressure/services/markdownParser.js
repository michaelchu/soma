/**
 * Parse blood pressure readings from markdown format
 */

/**
 * Parse a single reading section from markdown
 */
function parseReadingSection(section) {
  // Extract datetime from header: "## Reading: 2025-01-21 08:30"
  const headerMatch = section.match(/##\s*Reading:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (!headerMatch) return null;

  const date = headerMatch[1];
  const time = headerMatch[2];
  const datetime = `${date}T${time}:00`;

  // Parse table rows
  const reading = {
    id: `reading-${date}T${time.replace(':', '')}`,
    datetime,
    systolic: null,
    diastolic: null,
    pulse: null,
    notes: null,
  };

  // Match table rows: | field | value |
  const rowRegex = /\|\s*(\w+)\s*\|\s*(.+?)\s*\|/g;
  let match;

  while ((match = rowRegex.exec(section)) !== null) {
    const field = match[1].toLowerCase();
    const value = match[2].trim();

    switch (field) {
      case 'systolic':
        reading.systolic = parseInt(value, 10);
        break;
      case 'diastolic':
        reading.diastolic = parseInt(value, 10);
        break;
      case 'pulse':
        reading.pulse = parseInt(value, 10);
        break;
      case 'notes':
        reading.notes = value;
        break;
    }
  }

  // Validate required fields
  if (!reading.systolic || !reading.diastolic) return null;

  return reading;
}

/**
 * Parse all readings from markdown content
 */
export function parseReadings(markdownContent) {
  if (!markdownContent) return [];

  // Split by reading sections
  const sections = markdownContent.split(/(?=##\s*Reading:)/);
  const readings = [];

  for (const section of sections) {
    const reading = parseReadingSection(section);
    if (reading) {
      readings.push(reading);
    }
  }

  // Sort by datetime descending (most recent first)
  return readings.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

/**
 * Generate markdown for a new reading
 */
export function generateReadingMarkdown(reading) {
  const { datetime, systolic, diastolic, pulse, notes } = reading;

  const date = new Date(datetime);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  let md = `## Reading: ${dateStr} ${timeStr}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| systolic | ${systolic} |\n`;
  md += `| diastolic | ${diastolic} |\n`;

  if (pulse) {
    md += `| pulse | ${pulse} |\n`;
  }

  if (notes) {
    md += `| notes | ${notes} |\n`;
  }

  md += `\n---\n`;

  return md;
}
