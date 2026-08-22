export type FileEntry = {
  name: string;
  size: number;
  modifiedAt: number;
};

export type SortField = "name" | "modifiedAt" | "size";
export type SortDirection = "asc" | "desc";
export type MatchMode = "sequential" | "inclusion";
export type ExecuteMode = "rename" | "copy";

export type SpreadsheetData = {
  headers: string[];
  rows: Record<string, string>[];
};

export type PreviewRow = {
  fileName: string;
  newName: string | null;
  state: "renamed" | "unchanged" | "unmatched-row" | "invalid";
  detail?: string;
  spreadsheetRow?: number;
};

export type ComputeResult = {
  rows: PreviewRow[];
  notes: string[];
  warnings: string[];
  stats: {
    fileCount: number;
    spreadsheetRowCount: number;
    renameCount: number;
    unchangedCount: number;
  };
};

export type RenameOperation = {
  from: string;
  to: string;
};

export type ProgressEvent =
  | { type: "start"; total: number }
  | { type: "progress"; index: number; total: number; from: string; to: string; status: "ok" | "error"; message?: string }
  | { type: "done"; succeeded: number; failed: number };
