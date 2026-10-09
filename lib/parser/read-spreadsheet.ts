// Reads the first sheet of an uploaded .xlsx/.xls file into rows of cell
// text, in the browser. The rows are then parsed server-side by
// parseRoutineTable, exactly like a paste.

const MAX_ROWS = 100;
const MAX_COLUMNS = 40;

export async function readSpreadsheet(file: File): Promise<string[][]> {
  // Loaded on demand so SheetJS only ships to faculty who actually upload.
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true });
  return rows.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLUMNS).map((value) => String(value ?? '')));
}
