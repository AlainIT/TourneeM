// CSV avec séparateur ";" et BOM UTF-8 : ouverture directe dans Excel FR sans
// import manuel ni caractères mal interprétés.
function escapeCsvField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(';')),
  ];
  return '﻿' + lines.join('\n');
}
