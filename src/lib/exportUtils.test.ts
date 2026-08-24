import { describe, expect, it } from 'vitest';
import {
  countByKey,
  createCSVContent,
  createMarkdownTable,
  escapeMarkdownCell,
  formatPercentage,
  formatReferenceRange,
  getDateRangeString,
  groupByKey,
  sortForExport,
  sumByKey,
} from './exportUtils';

describe('export utilities', () => {
  it('creates markdown and CSV tables with escaping', () => {
    expect(createMarkdownTable(['Name', 'Value'], [['A', 1]])).toContain('| A | 1 |');
    expect(createMarkdownTable([], [])).toBe('');
    expect(createCSVContent(['Name'], [['A"B']])).toBe('"Name"\n"A""B"');
  });

  it('formats and escapes export values', () => {
    expect(escapeMarkdownCell('a|b\nc', 3)).toBe('a/b...');
    expect(escapeMarkdownCell(null)).toBe('-');
    expect(formatPercentage(1, 4)).toBe('25.0%');
    expect(formatPercentage(1, 0)).toBe('0%');
  });

  it('sorts and formats date-only ranges without UTC shifting', () => {
    const entries = [{ date: '2024-03-15' }, { date: '2024-03-01' }];
    expect(sortForExport(entries, 'date').map((entry) => entry.date)).toEqual([
      '2024-03-01',
      '2024-03-15',
    ]);
    expect(getDateRangeString(entries, 'date', (date) => date.slice(0, 10))).toBe(
      '2024-03-01 to 2024-03-15'
    );
    expect(getDateRangeString([], 'date', String)).toBe('No data');
  });

  it('groups, sums, and formats values by key', () => {
    const entries = [
      { type: 'a', value: 2 },
      { type: 'b', value: 3 },
      { type: 'a', value: 4 },
    ];
    expect(countByKey(entries, (entry) => entry.type)).toEqual({ a: 2, b: 1 });
    expect(groupByKey(entries, (entry) => entry.type)).toEqual({
      a: [entries[0], entries[2]],
      b: [entries[1]],
    });
    expect(formatReferenceRange(1, 2)).toBe('1-2');
    expect(formatReferenceRange(1, null)).toBe('>1');
    expect(formatReferenceRange(null, 2)).toBe('<2');
    expect(formatReferenceRange(null, null)).toBe('');
    expect(
      sumByKey(
        entries,
        (entry) => entry.type,
        (entry) => entry.value
      )
    ).toEqual({
      a: 6,
      b: 3,
    });
  });
});
