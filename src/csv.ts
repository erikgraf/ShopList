/**
 * Tiny RFC-4180-ish CSV parser shared by the build-time `/data` loaders
 * (`src/data/index.ts`) and the runtime snapshot loader (`snapshot.ts`).
 * Handles quoted fields, embedded commas, and `""` escapes — enough for our
 * data (names like "Gewürze, Öle & Saucen") and the 19k OFF snapshot.
 *
 * Returns one object per row keyed by the header. List-valued columns use `|`
 * as the separator by app convention (parse with `.split('|')`).
 */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let sawField = false;
  const endField = () => {
    record.push(field);
    field = '';
    sawField = true;
  };
  const endRecord = () => {
    rows.push(record);
    record = [];
    sawField = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') endField();
    else if (c === '\n') {
      endField();
      endRecord();
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || sawField || record.length > 0) {
    endField();
    endRecord();
  }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
