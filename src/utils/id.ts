export function generateId(prefix: string = 'id'): string {
  if (typeof crypto === 'undefined' || !('randomUUID' in crypto)) throw new Error('Secure random ID generation is unavailable in this browser.');
  return `${prefix}_${crypto.randomUUID()}`;
}

export function generateToken(length: number = 24): string {
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) throw new Error('Secure token generation is unavailable.');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

export function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}