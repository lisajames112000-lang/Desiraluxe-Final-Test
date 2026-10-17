export interface ScheduleWindow {startAt?: string;endAt?: string;}

export function isScheduleActive(window: ScheduleWindow, at: Date = new Date()): boolean {
  const now = at.getTime();
  const start = window.startAt ? Date.parse(window.startAt) : Number.NEGATIVE_INFINITY;
  const end = window.endAt ? Date.parse(window.endAt) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return false;
  return now >= start && now < end;
}

export function nextScheduleBoundary(items: ScheduleWindow[], at: Date = new Date()): number | null {
  const now = at.getTime();
  const candidates = items.flatMap((item) => [item.startAt, item.endAt]).filter((value): value is string => !!value).map(Date.parse).filter((value) => Number.isFinite(value) && value > now);
  return candidates.length ? Math.min(...candidates) : null;
}