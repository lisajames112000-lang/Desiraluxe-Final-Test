import { describe, expect, it } from 'vitest';
import { storeDateTimeInput, storeWallTimeToIso } from './storeTime';

describe('Asia/Karachi admin wall time', () => {
  it('converts the same wall time independently of the browser timezone', () => {
    expect(storeWallTimeToIso('2026-10-13T09:30')).toBe('2026-10-13T04:30:00.000Z');
  });

  it('reopens a stored instant without shifting the displayed wall time', () => {
    const stored = storeWallTimeToIso('2026-10-13T23:45');
    expect(storeDateTimeInput(stored)).toBe('2026-10-13T23:45');
  });

  it('rejects impossible wall dates', () => {
    expect(storeWallTimeToIso('2026-02-30T10:00')).toBeUndefined();
  });
});