import { describe, it, expect } from 'vitest';
import {
  getStatus,
  getVisualMax,
  getPositionInRange,
  getOptimalZoneStyle,
  RANGE_CONSTANTS,
} from './statusHelpers';

describe('statusHelpers', () => {
  describe('getStatus', () => {
    it('returns "normal" when value is within range', () => {
      expect(getStatus(5, 3, 7)).toBe('normal');
      expect(getStatus(3, 3, 7)).toBe('normal'); // at min boundary
      expect(getStatus(7, 3, 7)).toBe('normal'); // at max boundary
    });

    it('returns "low" when value is below min', () => {
      expect(getStatus(2, 3, 7)).toBe('low');
      expect(getStatus(0, 3, 7)).toBe('low');
      expect(getStatus(-1, 0, 10)).toBe('low');
    });

    it('returns "high" when value is above max', () => {
      expect(getStatus(8, 3, 7)).toBe('high');
      expect(getStatus(100, 3, 7)).toBe('high');
    });

    it('handles null min (upper bound only)', () => {
      expect(getStatus(3, null, 5)).toBe('normal');
      expect(getStatus(6, null, 5)).toBe('high');
      expect(getStatus(0, null, 5)).toBe('normal');
    });

    it('handles null max (lower bound only)', () => {
      expect(getStatus(5, 3, null)).toBe('normal');
      expect(getStatus(2, 3, null)).toBe('low');
      expect(getStatus(100, 3, null)).toBe('normal');
    });

    it('returns "normal" when both bounds are null', () => {
      expect(getStatus(5, null, null)).toBe('normal');
      expect(getStatus(0, null, null)).toBe('normal');
    });
  });

  describe('getVisualMax', () => {
    it('returns double the min value', () => {
      expect(getVisualMax(50)).toBe(100);
      expect(getVisualMax(1)).toBe(2);
      expect(getVisualMax(0.5)).toBe(1);
    });
  });

  describe('getPositionInRange', () => {
    const { LOW_ZONE_END, NORMAL_ZONE_END } = RANGE_CONSTANTS;

    it('returns 50 when both bounds are null', () => {
      expect(getPositionInRange(5, null, null)).toBe(50);
    });

    describe('with both bounds defined', () => {
      it('positions value at start of normal zone when at min', () => {
        expect(getPositionInRange(3, 3, 7)).toBe(LOW_ZONE_END);
      });

      it('positions value at end of normal zone when at max', () => {
        expect(getPositionInRange(7, 3, 7)).toBe(NORMAL_ZONE_END);
      });

      it('positions value in middle of normal zone when at midpoint', () => {
        const result = getPositionInRange(5, 3, 7);
        expect(result).toBe(50); // midpoint of 15-85 is 50
      });

      it('clamps to 0 when below min', () => {
        expect(getPositionInRange(0, 3, 7)).toBe(0);
      });

      it('clamps to 100 when above max', () => {
        expect(getPositionInRange(10, 3, 7)).toBe(100);
      });
    });

    describe('with upper bound only (min is null)', () => {
      it('positions value at start of normal zone when at 0', () => {
        expect(getPositionInRange(0, null, 100)).toBe(LOW_ZONE_END);
      });

      it('positions value at end of normal zone when at max', () => {
        expect(getPositionInRange(100, null, 100)).toBeCloseTo(NORMAL_ZONE_END);
      });
    });

    describe('with lower bound only (max is null)', () => {
      it('positions value at start of normal zone when at min', () => {
        expect(getPositionInRange(50, 50, null)).toBe(LOW_ZONE_END);
      });

      it('handles values below min', () => {
        const result = getPositionInRange(25, 50, null);
        expect(result).toBeLessThan(LOW_ZONE_END);
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getOptimalZoneStyle', () => {
    it('returns null when optimalMin is null', () => {
      expect(getOptimalZoneStyle(null, 5, 0, 10)).toBeNull();
    });

    it('returns null when optimalMax is null', () => {
      expect(getOptimalZoneStyle(3, null, 0, 10)).toBeNull();
    });

    it('returns null when both optimal values are null', () => {
      expect(getOptimalZoneStyle(null, null, 0, 10)).toBeNull();
    });

    it('returns style object with both bounds defined', () => {
      const result = getOptimalZoneStyle(4, 6, 0, 10);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
    });

    it('returns style object with upper bound only', () => {
      const result = getOptimalZoneStyle(2, 4, null, 10);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
    });

    it('returns style object with lower bound only', () => {
      const result = getOptimalZoneStyle(60, 80, 50, null);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
    });

    it('returns null when both reference bounds are null', () => {
      expect(getOptimalZoneStyle(3, 5, null, null)).toBeNull();
    });
  });
});
