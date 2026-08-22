import * as XLSX from "xlsx";

import type { SpreadsheetData } from "@/modules/advanced-renamer/lib/types";

export function parseSpreadsheet(
  buffer: ArrayBuffer,
  fileName: string,
): SpreadsheetData {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    ...(isCsv ? { FS: "," } : {}),
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number | null)[][];

  if (matrix.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = matrix[0].map((cell) => String(cell ?? "").trim());
  const rows = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      row[header] = String(cells[index] ?? "").trim();
    });
    return row;
  });

  return { headers: headers.filter(Boolean), rows };
}

export function findColumnKey(
  headers: string[],
  columnName: string,
): string | undefined {
  const target = columnName.trim().toLowerCase();
  return headers.find((header) => header.toLowerCase() === target);
}
