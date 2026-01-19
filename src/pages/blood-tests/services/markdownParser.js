/**
 * Markdown Parser for Blood Test Reports
 *
 * Parses the reports.md file and converts it into structured data
 */

// Import the markdown file as raw text
import reportsMarkdown from '../data/reports.md?raw';

/**
 * Parse the markdown file and extract all reports
 * @param {string} markdownContent - The raw markdown content
 * @returns {Array} Array of report objects
 */
export function parseReports(markdownContent) {
  const reports = [];

  // Split by report sections (## Report: ...)
  const reportSections = markdownContent.split(/## Report:/);

  // Skip the first section (header/intro)
  for (let i = 1; i < reportSections.length; i++) {
    const section = reportSections[i];
    const report = parseReportSection(section);
    if (report) {
      reports.push(report);
    }
  }

  return reports;
}

/**
 * Parse a single report section
 * @param {string} section - The report section text
 * @returns {Object|null} Report object or null if invalid
 */
function parseReportSection(section) {
  const lines = section.split('\n').map((line) => line.trim());

  // Extract date from first line (should be the date after "## Report: ")
  const dateMatch = lines[0].match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;

  const date = dateMatch[1];
  let orderNumber = '';
  let orderedBy = '';
  const metrics = {};

  let inMetricsTable = false;
  let skippedHeaderRow = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract metadata
    if (line.startsWith('**Order Number:**')) {
      orderNumber = line.replace('**Order Number:**', '').trim();
    } else if (line.startsWith('**Ordered By:**')) {
      orderedBy = line.replace('**Ordered By:**', '').trim();
    }
    // Start of any metrics section (e.g., "### Complete Blood Count (CBC)", "### Lipid Panel", etc.)
    else if (line.startsWith('###')) {
      inMetricsTable = true;
      skippedHeaderRow = false; // Reset for each new section
    }
    // Parse table rows
    else if (inMetricsTable && line.startsWith('|')) {
      // Skip header row and separator row
      if (!skippedHeaderRow || line.includes('---')) {
        if (line.includes('Metric') || line.includes('---')) {
          skippedHeaderRow = true;
          continue;
        }
      }

      // Parse data row: | metric_key | value | reference | unit |
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length >= 3) {
        const metricKey = cells[0];
        const valueStr = cells[1];
        const referenceStr = cells[2];
        const unit = cells.length >= 4 ? cells[3] : '';

        // Parse value
        const numValue = parseFloat(valueStr);
        if (!isNaN(numValue) && metricKey) {
          metrics[metricKey] = {
            value: numValue,
            reference: parseReference(referenceStr),
            unit: unit || '',
          };
        }
      }
    }
    // End of report section (horizontal rule)
    else if (line === '---') {
      break;
    }
  }

  // Only return if we have at least a date and some metrics
  if (date && Object.keys(metrics).length > 0) {
    return {
      id: `report-${date}`,
      date,
      orderNumber,
      orderedBy,
      metrics,
    };
  }

  return null;
}

/**
 * Parse reference range string into min/max values
 * @param {string} refString - Reference range string (e.g., "129-165", "<46", ">60")
 * @returns {Object} Object with min and/or max properties
 */
function parseReference(refString) {
  const ref = {};

  // Handle range format: "129-165"
  const rangeMatch = refString.match(/^([\d.]+)-([\d.]+)$/);
  if (rangeMatch) {
    ref.min = parseFloat(rangeMatch[1]);
    ref.max = parseFloat(rangeMatch[2]);
    return ref;
  }

  // Handle less than: "<46"
  const ltMatch = refString.match(/^<([\d.]+)$/);
  if (ltMatch) {
    ref.max = parseFloat(ltMatch[1]);
    return ref;
  }

  // Handle greater than: ">60"
  const gtMatch = refString.match(/^>([\d.]+)$/);
  if (gtMatch) {
    ref.min = parseFloat(gtMatch[1]);
    return ref;
  }

  // If we can't parse it, store the original string
  ref.raw = refString;
  return ref;
}

/**
 * Load reports from the markdown file
 * @returns {Promise<Array>} Promise that resolves to array of reports
 */
export async function loadReportsFromMarkdown() {
  try {
    // Use the imported markdown content
    return parseReports(reportsMarkdown);
  } catch (error) {
    console.error('Error loading reports from markdown:', error);
    return [];
  }
}
