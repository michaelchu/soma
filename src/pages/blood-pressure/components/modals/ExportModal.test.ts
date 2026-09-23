import { describe, it, expect } from 'vitest';
import { generateMarkdown } from './exportMarkdown';
import { calculateStats } from '../../utils/bpHelpers';

const stubGetCategory = () => 'normal' as const;
const stubGetCategoryInfo = () =>
  ({
    key: 'normal',
    label: 'Normal',
    color: '',
    bgClass: '',
    textClass: '',
    borderClass: '',
    chartColor: '',
  }) as never;

const readings = [
  { date: '2026-09-18', timeOfDay: 'morning' as const, systolic: 111, diastolic: 85, pulse: 77 },
  { date: '2026-09-16', timeOfDay: 'morning' as const, systolic: 116, diastolic: 87, pulse: 83 },
  { date: '2026-09-09', timeOfDay: 'evening' as const, systolic: 105, diastolic: 84, pulse: null },
  { date: '2026-08-14', timeOfDay: 'morning' as const, systolic: 106, diastolic: 84, pulse: 76 },
  { date: '2026-08-02', timeOfDay: 'evening' as const, systolic: 112, diastolic: 82, pulse: 68 },
];

describe('generateMarkdown', () => {
  const md = generateMarkdown(
    readings,
    calculateStats(readings),
    stubGetCategory,
    stubGetCategoryInfo
  );

  it('includes a timezone line', () => {
    expect(md).toMatch(/\*\*Timezone:\*\* \S+/);
  });

  it('includes monthly averages oldest to newest', () => {
    expect(md).toContain('## Monthly Averages');
    const aug = md.indexOf('| 2026-08 |');
    const sep = md.indexOf('| 2026-09 |');
    expect(aug).toBeGreaterThan(-1);
    expect(sep).toBeGreaterThan(aug);
    // Aug: (106+112)/2=109 sys, (84+82)/2=83 dia, 3 readings? no -> 2 readings, avg pulse (76+68)/2=72
    expect(md).toContain('| 2026-08 | 2 | 109 | 83 | 72 |');
    // Sep: 3 readings, avg sys (111+116+105)/3=111, dia (85+87+84)/3=85, pulse (77+83)/2=80 (null excluded)
    expect(md).toContain('| 2026-09 | 3 | 111 | 85 | 80 |');
  });

  it('includes averages by time of day', () => {
    expect(md).toContain('## Averages by Time of Day');
    // Morning: 3 readings -> sys (111+116+106)/3=111, dia (85+87+84)/3=85, pulse (77+83+76)/3=79
    expect(md).toContain('| Morning | 3 | 111 | 85 | 79 |');
    // Evening: 2 readings -> sys (105+112)/2=109, dia (84+82)/2=83, pulse 68 (null excluded)
    expect(md).toContain('| Evening | 2 | 109 | 83 | 68 |');
  });

  it('lists recent readings (up to 30)', () => {
    expect(md).toContain('## Recent Readings (Last 30)');
    expect(md).not.toContain('Last 5');
  });
});
