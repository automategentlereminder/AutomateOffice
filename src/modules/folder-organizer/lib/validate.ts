import path from "node:path";

import {
  WINDOWS_MAX_PATH,
  type OrganizerRow,
  type RowIssue,
  type ValidationCheck,
  type ValidationResult,
} from "@/modules/folder-organizer/lib/types";

const INVALID_SEGMENT_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;

export function splitNameAndExtension(fileName: string) {
  const base = path.basename(fileName);
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0) {
    return { stem: base, extension: "" };
  }
  return {
    stem: base.slice(0, lastDot),
    extension: base.slice(lastDot),
  };
}

export function joinFolderPath(folders: string[]) {
  return folders.filter(Boolean).join(path.sep);
}

export function buildTargetRelativePath(row: OrganizerRow) {
  const folderPath = joinFolderPath(row.folders);
  if (!row.fileName) {
    return folderPath;
  }
  return folderPath ? path.join(folderPath, row.fileName) : row.fileName;
}

export function buildAbsoluteTarget(
  rootPath: string,
  row: OrganizerRow,
) {
  const relative = buildTargetRelativePath(row);
  return relative ? path.join(rootPath, relative) : rootPath;
}

function validateSegment(value: string, label: string, rowNumber: number) {
  const issues: RowIssue[] = [];
  if (!value) {
    return issues;
  }
  if (INVALID_SEGMENT_CHARS.test(value)) {
    issues.push({
      rowNumber,
      type: "invalid-char",
      message: `Row ${rowNumber}: ${label} “${value}” has characters Windows does not allow (< > : " / \\ | ? *).`,
      blocking: true,
    });
  }
  if (value === "." || value === "..") {
    issues.push({
      rowNumber,
      type: "invalid-char",
      message: `Row ${rowNumber}: ${label} cannot be “.” or “..”.`,
      blocking: true,
    });
  }
  return issues;
}

function validateHierarchy(row: OrganizerRow) {
  const issues: RowIssue[] = [];
  let sawEmpty = false;

  row.folders.forEach((folder, index) => {
    if (!folder) {
      sawEmpty = true;
      return;
    }
    if (sawEmpty) {
      issues.push({
        rowNumber: row.rowNumber,
        type: "hierarchy-gap",
        message: `Row ${row.rowNumber}: Folder ${index + 1} has “${folder}” but an earlier folder is empty. Fill Folder 1…${index} with no gaps (blank folders are not created).`,
        blocking: true,
      });
    }
  });

  if (row.folders.every((folder) => !folder) && row.fileName) {
    issues.push({
      rowNumber: row.rowNumber,
      type: "empty-folders",
      message: `Row ${row.rowNumber}: “${row.fileName}” has no Folder 1…N values. Add at least Folder 1, or clear the file name for a blank row.`,
      blocking: true,
    });
  }

  return issues;
}

export function validateOrganizerRows(
  rows: OrganizerRow[],
  rootPath: string,
): ValidationResult {
  const issues: RowIssue[] = [];

  for (const row of rows) {
    issues.push(...validateSegment(row.fileName, "File name", row.rowNumber));
    row.folders.forEach((folder, index) => {
      issues.push(
        ...validateSegment(folder, `Folder ${index + 1}`, row.rowNumber),
      );
    });
    issues.push(...validateHierarchy(row));

    if (rootPath.trim()) {
      const absolute = buildAbsoluteTarget(rootPath.trim(), row);
      if (absolute.length >= WINDOWS_MAX_PATH) {
        issues.push({
          rowNumber: row.rowNumber,
          type: "path-long",
          message: `Row ${row.rowNumber}: path is ${absolute.length} characters (Windows classic limit is ${WINDOWS_MAX_PATH}). You can still try; Windows may reject it.`,
          blocking: false,
        });
      }
    }
  }

  const invalidChars = issues.filter((issue) => issue.type === "invalid-char");
  const gaps = issues.filter((issue) => issue.type === "hierarchy-gap");
  const emptyFolders = issues.filter((issue) => issue.type === "empty-folders");
  const longPaths = issues.filter((issue) => issue.type === "path-long");
  const blockingCount = issues.filter((issue) => issue.blocking).length;
  const warningCount = issues.filter((issue) => !issue.blocking).length;

  const checks: ValidationCheck[] = [
    {
      id: "headers-rows",
      label: "Spreadsheet rows loaded",
      status: rows.length > 0 ? "pass" : "fail",
      detail:
        rows.length > 0
          ? `${rows.length} data row(s) ready`
          : "Upload a sheet with at least one data row",
      count: rows.length,
    },
    {
      id: "invalid-chars",
      label: "Windows-safe names",
      status: invalidChars.length === 0 ? "pass" : "fail",
      detail:
        invalidChars.length === 0
          ? "No forbidden characters found"
          : `${invalidChars.length} name(s) need fixing`,
      count: invalidChars.length,
    },
    {
      id: "hierarchy",
      label: "No folder hierarchy gaps",
      status: gaps.length + emptyFolders.length === 0 ? "pass" : "fail",
      detail:
        gaps.length + emptyFolders.length === 0
          ? "Folder 1…N are contiguous where used"
          : `${gaps.length + emptyFolders.length} row(s) have gaps or missing folders`,
      count: gaps.length + emptyFolders.length,
    },
    {
      id: "path-length",
      label: "Path length under Windows limit",
      status: !rootPath.trim()
        ? "pending"
        : longPaths.length === 0
          ? "pass"
          : "warn",
      detail: !rootPath.trim()
        ? "Choose a root folder to calculate full paths"
        : longPaths.length === 0
          ? `All paths under ${WINDOWS_MAX_PATH} characters`
          : `${longPaths.length} path(s) may be too long (override allowed)`,
      count: longPaths.length,
    },
  ];

  return {
    rows,
    checks,
    issues,
    blockingCount,
    warningCount,
    canCreateFolders:
      rows.length > 0 && blockingCount === 0 && Boolean(rootPath.trim()),
  };
}

export function uniqueFolderPaths(rows: OrganizerRow[]) {
  const paths = new Set<string>();

  for (const row of rows) {
    const parts: string[] = [];
    for (const folder of row.folders) {
      if (!folder) {
        break;
      }
      parts.push(folder);
      paths.add(parts.join(path.sep));
    }
  }

  return [...paths].sort((a, b) => a.localeCompare(b));
}
