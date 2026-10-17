import { describe, expect, it } from 'vitest';
import { isScheduleActive, nextScheduleBoundary } from './schedule';

describe('schedule eligibility', () => {
  const now = new Date('2026-10-12T12:00:00.000Z');
  it('handles inclusive start and exclusive end boundaries', () => {
    expect(isScheduleActive({ startAt: '2026-10-12T12:00:00.000Z', endAt: '2026-10-12T13:00:00.000Z' }, now)).toBe(true);
    expect(isScheduleActive({ endAt: '2026-10-12T12:00:00.000Z' }, now)).toBe(false);
  });
  it('rejects invalid windows and finds the next boundary', () => {
    expect(isScheduleActive({ startAt: '2026-10-13T00:00:00.000Z', endAt: '2026-10-12T00:00:00.000Z' }, now)).toBe(false);
    expect(nextScheduleBoundary([{ startAt: '2026-10-12T13:00:00.000Z' }], now)).toBe(Date.parse('2026-10-12T13:00:00.000Z'));
  });
});