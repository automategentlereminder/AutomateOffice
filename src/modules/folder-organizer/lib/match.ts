import path from "node:path";

import { splitNameAndExtension } from "@/modules/folder-organizer/lib/validate";
import type {
  DuplicatePolicy,
  FileMatch,
  OrganizerRow,
} from "@/modules/folder-organizer/lib/types";

export type IndexedFile = {
  absolutePath: string;
  fileName: string;
  stem: string;
  extension: string;
};

export function indexFiles(absolutePaths: string[]): IndexedFile[] {
  return absolutePaths.map((absolutePath) => {
    const fileName = path.basename(absolutePath);
    const { stem, extension } = splitNameAndExtension(fileName);
    return {
      absolutePath,
      fileName,
      stem: stem.toLowerCase(),
      extension: extension.toLowerCase(),
    };
  });
}

function scoreCandidate(requested: string, candidate: IndexedFile) {
  const { stem, extension } = splitNameAndExtension(requested);
  const requestedStem = stem.toLowerCase();
  const requestedExt = extension.toLowerCase();

  if (candidate.fileName.toLowerCase() === requested.toLowerCase()) {
    return 3;
  }
  if (
    requestedExt &&
    candidate.stem === requestedStem &&
    candidate.extension === requestedExt
  ) {
    return 3;
  }
  if (candidate.stem === requestedStem) {
    return 2;
  }
  return 0;
}

export function matchRowsToFiles(options: {
  rows: OrganizerRow[];
  indexedFiles: IndexedFile[];
  duplicatePolicy: DuplicatePolicy;
}): FileMatch[] {
  const { rows, indexedFiles, duplicatePolicy } = options;
  const used = new Set<string>();

  return rows
    .filter((row) => row.fileName.trim())
    .map((row) => {
      const folderPath = row.folders.filter(Boolean).join(path.sep);
      const scored = indexedFiles
        .map((file) => ({ file, score: scoreCandidate(row.fileName, file) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.file.fileName.localeCompare(b.file.fileName));

      if (scored.length === 0) {
        return {
          rowNumber: row.rowNumber,
          requestedName: row.fileName,
          targetRelativeDir: folderPath,
          targetFileName: row.fileName,
          status: "missing" as const,
          candidates: [],
          detail: "No matching file found (extension-forgiving search).",
        };
      }

      const topScore = scored[0].score;
      const top = scored.filter((entry) => entry.score === topScore);
      const available = top.filter((entry) => !used.has(entry.file.absolutePath));

      if (top.length > 1 && duplicatePolicy === "skip" && available.length !== 1) {
        return {
          rowNumber: row.rowNumber,
          requestedName: row.fileName,
          targetRelativeDir: folderPath,
          targetFileName: row.fileName,
          status: "duplicate" as const,
          candidates: top.map((entry) => entry.file.absolutePath),
          detail: `${top.length} matches found. Choose “Use first match” or resolve duplicates.`,
        };
      }

      const chosen = available[0] ?? top[0];
      if (!chosen || used.has(chosen.file.absolutePath)) {
        return {
          rowNumber: row.rowNumber,
          requestedName: row.fileName,
          targetRelativeDir: folderPath,
          targetFileName: row.fileName,
          status: "skipped" as const,
          candidates: top.map((entry) => entry.file.absolutePath),
          detail: "Matching file already assigned to another row.",
        };
      }

      used.add(chosen.file.absolutePath);

      const requestedHasExt = splitNameAndExtension(row.fileName).extension;
      const targetFileName = requestedHasExt
        ? row.fileName
        : `${splitNameAndExtension(row.fileName).stem}${chosen.file.extension}`;

      return {
        rowNumber: row.rowNumber,
        requestedName: row.fileName,
        targetRelativeDir: folderPath,
        targetFileName,
        status: "found" as const,
        candidates: top.map((entry) => entry.file.absolutePath),
        chosenSource: chosen.file.absolutePath,
        detail:
          top.length > 1
            ? `Using first of ${top.length} matches`
            : undefined,
      };
    });
}

export function resolveSingleSourceCopyName(
  requestedName: string,
  sourceFileName: string,
): { targetFileName: string; skipReason?: string } {
  const requested = splitNameAndExtension(requestedName);
  const source = splitNameAndExtension(sourceFileName);

  if (!requestedName.trim()) {
    return {
      targetFileName: "",
      skipReason: "File name is empty in the spreadsheet.",
    };
  }

  if (!requested.extension) {
    return {
      targetFileName: `${requested.stem}${source.extension}`,
    };
  }

  if (requested.extension.toLowerCase() !== source.extension.toLowerCase()) {
    return {
      targetFileName: requestedName,
      skipReason: `Extension ${requested.extension} differs from source ${source.extension || "(none)"} — not copied.`,
    };
  }

  return { targetFileName: requestedName };
}
