// All prices are stored as whole-number PKR (no fractional minor units needed for this currency),
// which keeps every calculation safe integer arithmetic with no floating-point rounding risk.

export function formatPKR(amount: number): string {
  const rounded = Math.round(amount);
  return `PKR ${rounded.toLocaleString('en-US')}`;
}

export function calcSubtotal(lines: {price: number;quantity: number;}[]): number {
  return lines.reduce((sum, l) => sum + Math.round(l.price) * Math.round(l.quantity), 0);
}

export function calcDiscountPercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((compareAt - price) / compareAt * 100);
}