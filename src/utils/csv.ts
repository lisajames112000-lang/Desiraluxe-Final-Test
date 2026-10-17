function sanitizeCell(value: string): string {
  const text = String(value ?? '');
  const needsGuard = /^[=+\-@\t\r]/.test(text);
  const safe = needsGuard ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(sanitizeCell).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, rows: string[][]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}