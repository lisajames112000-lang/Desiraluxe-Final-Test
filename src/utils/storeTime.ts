const STORE_OFFSET_MINUTES = 5 * 60;
const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function storeDateTimeInput(value?: string): string {
  if (!value) return '';
  if (WALL_TIME_PATTERN.test(value)) return value;
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return '';
  const store = new Date(instant + STORE_OFFSET_MINUTES * 60_000);
  return `${store.getUTCFullYear()}-${String(store.getUTCMonth() + 1).padStart(2, '0')}-${String(store.getUTCDate()).padStart(2, '0')}T${String(store.getUTCHours()).padStart(2, '0')}:${String(store.getUTCMinutes()).padStart(2, '0')}`;
}

export function storeWallTimeToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(WALL_TIME_PATTERN);
  if (!match) {
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? new Date(instant).toISOString() : undefined;
  }
  const [, year, month, day, hour, minute] = match;
  const instant = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) - STORE_OFFSET_MINUTES * 60_000;
  const result = new Date(instant);
  return storeDateTimeInput(result.toISOString()) === value ? result.toISOString() : undefined;
}