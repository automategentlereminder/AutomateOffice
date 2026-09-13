export const MAX_FOLDER_DEPTH = 10;
export const WINDOWS_MAX_PATH = 260;
export const MISSING_SOFT_THRESHOLD = 100;

export type OrganizerRow = {
  rowNumber: number;
  fileName: string;
  folders: string[];
};

export type CheckStatus = "pending" | "pass" | "fail" | "warn";

export type ValidationCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
  count?: number;
};

export type RowIssue = {
  rowNumber: number;
  type: "invalid-char" | "hierarchy-gap" | "path-long" | "empty-folders";
  message: string;
  blocking: boolean;
};

export type ValidationResult = {
  rows: OrganizerRow[];
  checks: ValidationCheck[];
  issues: RowIssue[];
  blockingCount: number;
  warningCount: number;
  canCreateFolders: boolean;
};

export type TreeNode = {
  id: string;
  name: string;
  kind: "folder" | "file";
  children: TreeNode[];
  pathHint: string;
  longPath?: boolean;
};

export type DuplicatePolicy = "first" | "skip";

export type FileMatch = {
  rowNumber: number;
  requestedName: string;
  targetRelativeDir: string;
  targetFileName: string;
  status: "found" | "missing" | "duplicate" | "skipped";
  candidates: string[];
  chosenSource?: string;
  detail?: string;
};

export type ProgressEvent =
  | { type: "start"; total: number }
  | {
      type: "progress";
      index: number;
      total: number;
      label: string;
      status: "ok" | "error";
      message?: string;
    }
  | { type: "done"; succeeded: number; failed: number };
