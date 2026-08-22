import { buildNewFileName, extractPatternColumns } from "@/modules/advanced-renamer/lib/pattern";
import { findColumnKey } from "@/modules/advanced-renamer/lib/spreadsheet";
import { sortFiles } from "@/modules/advanced-renamer/lib/sort";
import type {
  ComputeResult,
  FileEntry,
  MatchMode,
  PreviewRow,
  SortDirection,
  SortField,
  SpreadsheetData,
} from "@/modules/advanced-renamer/lib/types";

type Assignment = {
  fileName: string;
  row: Record<string, string> | null;
  spreadsheetRow?: number;
  counter: number;
};

function buildNotes(fileCount: number, rowCount: number) {
  const notes: string[] = [];

  if (rowCount === 0) {
    notes.push("No spreadsheet loaded — only {#} and fixed text will be used.");
    return notes;
  }

  if (rowCount > fileCount) {
    notes.push(
      `${rowCount} spreadsheet entries for ${fileCount} files — only the first ${fileCount} matches will rename files.`,
    );
  } else if (fileCount > rowCount) {
    notes.push(
      `${rowCount} spreadsheet entries for ${fileCount} files — ${fileCount - rowCount} file(s) will stay unchanged after rows run out.`,
    );
  } else {
    notes.push(`${rowCount} spreadsheet entries for ${fileCount} files.`);
  }

  return notes;
}

function assignSequential(
  files: FileEntry[],
  spreadsheet: SpreadsheetData | null,
  numberStart: number,
): Assignment[] {
  return files.map((file, index) => ({
    fileName: file.name,
    row: spreadsheet?.rows[index] ?? null,
    spreadsheetRow: spreadsheet ? index + 2 : undefined,
    counter: numberStart + index,
  }));
}

function assignInclusion(
  files: FileEntry[],
  spreadsheet: SpreadsheetData,
  inclusionColumn: string,
  numberStart: number,
): Assignment[] {
  const columnKey = findColumnKey(spreadsheet.headers, inclusionColumn);
  if (!columnKey) {
    return files.map((file, index) => ({
      fileName: file.name,
      row: null,
      counter: numberStart + index,
    }));
  }

  const available = new Map(files.map((file) => [file.name, file]));
  const assignments = new Map<string, Assignment>();
  let counter = numberStart;

  spreadsheet.rows.forEach((row, rowIndex) => {
    const needle = row[columnKey]?.trim();
    if (!needle) {
      return;
    }

    const match = [...available.values()].find((file) =>
      file.name.toLowerCase().includes(needle.toLowerCase()),
    );

    if (!match) {
      return;
    }

    available.delete(match.name);
    assignments.set(match.name, {
      fileName: match.name,
      row,
      spreadsheetRow: rowIndex + 2,
      counter: counter++,
    });
  });

  return files.map((file, index) => {
    const assigned = assignments.get(file.name);
    if (assigned) {
      return assigned;
    }

    return {
      fileName: file.name,
      row: null,
      counter: numberStart + index,
    };
  });
}

export function computeRenames(options: {
  files: FileEntry[];
  sortField: SortField;
  sortDirection: SortDirection;
  pattern: string;
  numberStart: number;
  spreadsheet: SpreadsheetData | null;
  matchMode: MatchMode;
  inclusionColumn: string | null;
}): ComputeResult {
  const {
    files,
    sortField,
    sortDirection,
    pattern,
    numberStart,
    spreadsheet,
    matchMode,
    inclusionColumn,
  } = options;

  const warnings: string[] = [];
  const sortedFiles = sortFiles(files, sortField, sortDirection);
  const rowCount = spreadsheet?.rows.length ?? 0;

  const notes = buildNotes(sortedFiles.length, rowCount);

  if (spreadsheet && matchMode === "inclusion") {
    if (!inclusionColumn) {
      warnings.push("Pick a spreadsheet column for advanced matching.");
    } else if (!findColumnKey(spreadsheet.headers, inclusionColumn)) {
      warnings.push(`Matching column “${inclusionColumn}” was not found in the spreadsheet.`);
    }
  }

  for (const column of extractPatternColumns(pattern)) {
    if (!spreadsheet) {
      warnings.push(`Pattern uses {${column}} but no spreadsheet is loaded.`);
      continue;
    }

    if (!findColumnKey(spreadsheet.headers, column)) {
      warnings.push(`Pattern column {${column}} was not found in the spreadsheet header row.`);
    }
  }

  let assignments: Assignment[];

  if (matchMode === "inclusion" && spreadsheet && inclusionColumn) {
    assignments = assignInclusion(
      sortedFiles,
      spreadsheet,
      inclusionColumn,
      numberStart,
    );
  } else if (spreadsheet) {
    assignments = assignSequential(sortedFiles, spreadsheet, numberStart);
  } else {
    assignments = assignSequential(sortedFiles, null, numberStart);
  }

  const previewByFile = new Map<string, PreviewRow>();
  const targetNames = new Map<string, string[]>();

  for (const assignment of assignments) {
    const fileIndex = sortedFiles.findIndex(
      (file) => file.name === assignment.fileName,
    );

    const shouldRename = !spreadsheet
      ? true
      : matchMode === "inclusion"
        ? assignment.row !== null
        : fileIndex < rowCount;

    if (!shouldRename) {
      previewByFile.set(assignment.fileName, {
        fileName: assignment.fileName,
        newName: null,
        state: "unchanged",
        detail: "No spreadsheet row mapped to this file.",
      });
      continue;
    }

    const { newName, error } = buildNewFileName(
      pattern,
      assignment.counter,
      assignment.row,
      spreadsheet?.headers ?? [],
      assignment.fileName,
    );

    if (error || !newName) {
      previewByFile.set(assignment.fileName, {
        fileName: assignment.fileName,
        newName: null,
        state: "invalid",
        detail: error,
        spreadsheetRow: assignment.spreadsheetRow,
      });
      continue;
    }

    if (newName === assignment.fileName) {
      previewByFile.set(assignment.fileName, {
        fileName: assignment.fileName,
        newName,
        state: "unchanged",
        detail: "New name matches the current name.",
        spreadsheetRow: assignment.spreadsheetRow,
      });
      continue;
    }

    const bucket = targetNames.get(newName) ?? [];
    bucket.push(assignment.fileName);
    targetNames.set(newName, bucket);

    previewByFile.set(assignment.fileName, {
      fileName: assignment.fileName,
      newName,
      state: "renamed",
      spreadsheetRow: assignment.spreadsheetRow,
    });
  }

  for (const [target, sources] of targetNames.entries()) {
    if (sources.length > 1) {
      warnings.push(
        `${sources.length} files would become “${target}”. Each target name must be unique.`,
      );
    }
  }

  const rows = sortedFiles.map(
    (file) =>
      previewByFile.get(file.name) ?? {
        fileName: file.name,
        newName: null,
        state: "unchanged" as const,
      },
  );

  const renameCount = rows.filter((row) => row.state === "renamed").length;

  return {
    rows,
    notes,
    warnings,
    stats: {
      fileCount: rows.length,
      spreadsheetRowCount: rowCount,
      renameCount,
      unchangedCount: rows.length - renameCount,
    },
  };
}

export function getOperations(rows: PreviewRow[]) {
  return rows
    .filter((row) => row.state === "renamed" && row.newName)
    .map((row) => ({
      from: row.fileName,
      to: row.newName as string,
    }));
}
