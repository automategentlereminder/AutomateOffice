import * as XLSX from "xlsx";

import { MAX_FOLDER_DEPTH } from "@/modules/folder-organizer/lib/types";
import type { OrganizerRow } from "@/modules/folder-organizer/lib/types";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, " ");
}

function detectFileNameIndex(headers: string[]) {
  const aliases = ["file name", "filename", "file", "name"];
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function detectFolderIndexes(headers: string[]) {
  const indexed: { level: number; index: number }[] = [];

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const match = normalized.match(/^folder\s*(\d+)$/);
    if (match) {
      const level = Number(match[1]);
      if (level >= 1 && level <= MAX_FOLDER_DEPTH) {
        indexed.push({ level, index });
      }
    }
  });

  indexed.sort((a, b) => a.level - b.level);
  return indexed;
}

export function parseOrganizerSpreadsheet(
  buffer: ArrayBuffer,
  fileName: string,
): { headers: string[]; rows: OrganizerRow[]; error?: string } {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    ...(isCsv ? { FS: "," } : {}),
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], error: "Spreadsheet has no sheets." };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number | null)[][];

  if (matrix.length === 0) {
    return { headers: [], rows: [], error: "Spreadsheet is empty." };
  }

  const headers = matrix[0].map((cell) => String(cell ?? "").trim());
  const fileNameIndex = detectFileNameIndex(headers);
  const folderIndexes = detectFolderIndexes(headers);

  if (fileNameIndex < 0) {
    return {
      headers,
      rows: [],
      error: 'Missing “File name” column. Download the template for the correct headers.',
    };
  }

  if (folderIndexes.length === 0) {
    return {
      headers,
      rows: [],
      error: "Missing Folder 1…Folder N columns (up to Folder 10).",
    };
  }

  const rows: OrganizerRow[] = [];

  matrix.slice(1).forEach((cells, offset) => {
    const fileNameValue = String(cells[fileNameIndex] ?? "").trim();
    const folders = folderIndexes.map(({ index }) =>
      String(cells[index] ?? "").trim(),
    );

    const hasAnyFolder = folders.some(Boolean);
    if (!fileNameValue && !hasAnyFolder) {
      return;
    }

    rows.push({
      rowNumber: offset + 2,
      fileName: fileNameValue,
      folders,
    });
  });

  return { headers, rows };
}

export function buildTemplateWorkbook() {
  const headers = [
    "File name",
    ...Array.from({ length: MAX_FOLDER_DEPTH }, (_, i) => `Folder ${i + 1}`),
  ];

  const example = [
    "Invoice-001.pdf",
    "Vendors",
    "Acme",
    "2026",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Folder Organizer");
  return workbook;
}

export function downloadTemplate() {
  const workbook = buildTemplateWorkbook();
  XLSX.writeFile(workbook, "AutomateOffice-Folder-Organizer-Template.xlsx");
}
