/** RFC-style CSV cell: quote if needed, escape internal quotes. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}
