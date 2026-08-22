import { findColumnKey } from "@/modules/advanced-renamer/lib/spreadsheet";

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/;
const TOKEN_PATTERN = /\{([^}]+)\}/g;

export function splitFileName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) {
    return { base: fileName, extension: "" };
  }

  return {
    base: fileName.slice(0, lastDot),
    extension: fileName.slice(lastDot),
  };
}

export function extractPatternColumns(pattern: string) {
  const columns = new Set<string>();
  for (const match of pattern.matchAll(TOKEN_PATTERN)) {
    const token = match[1]?.trim();
    if (token && token !== "#") {
      columns.add(token);
    }
  }
  return [...columns];
}

export function applyPattern(
  pattern: string,
  counter: number,
  row: Record<string, string> | null,
  headers: string[],
): { value: string; error?: string } {
  if (!pattern.trim()) {
    return { value: "", error: "Name pattern is empty." };
  }

  let error: string | undefined;

  const value = pattern.replace(TOKEN_PATTERN, (_full, token: string) => {
    const trimmed = token.trim();
    if (trimmed === "#") {
      return String(counter);
    }

    if (!row) {
      error = `Column “{${trimmed}}” needs spreadsheet data.`;
      return "";
    }

    const key = findColumnKey(headers, trimmed) ?? trimmed;
    const cell = row[key];
    if (cell === undefined) {
      error = `Column “{${trimmed}}” was not found in the spreadsheet.`;
      return "";
    }

    return cell;
  });

  if (INVALID_NAME_CHARS.test(value)) {
    return {
      value,
      error: "Generated name contains invalid characters (\\ / : * ? \" < > |).",
    };
  }

  if (!value.trim()) {
    return { value, error: "Generated name is empty." };
  }

  return { value, error };
}

export function buildNewFileName(
  pattern: string,
  counter: number,
  row: Record<string, string> | null,
  headers: string[],
  originalFileName: string,
) {
  const { extension } = splitFileName(originalFileName);
  const { value, error } = applyPattern(pattern, counter, row, headers);

  if (error) {
    return { newName: null, error };
  }

  return { newName: `${value}${extension}`, error: undefined };
}
