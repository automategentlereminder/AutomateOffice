import fs from "node:fs/promises";
import path from "node:path";

const INVALID_NAME_CHARS = /[<>:"|?*\u0000-\u001f]/;

export function normalizeFolderPath(folderPath: string) {
  return path.resolve(folderPath.trim());
}

function assertPathSegments(folderPath: string) {
  const withoutDrive = folderPath.replace(/^[A-Za-z]:/, "");
  const segments = withoutDrive.split(/[/\\]/).filter(Boolean);

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      continue;
    }
    if (INVALID_NAME_CHARS.test(segment)) {
      throw new Error(
        `Folder path contains invalid characters in “${segment}”. Spaces are fine; avoid < > : " | ? *.`,
      );
    }
  }
}

export async function assertFolderPath(folderPath: string) {
  if (!folderPath.trim()) {
    throw new Error("Folder path is required.");
  }

  assertPathSegments(folderPath);
  const resolved = normalizeFolderPath(folderPath);
  const stat = await fs.stat(resolved);

  if (!stat.isDirectory()) {
    throw new Error("The selected path is not a folder.");
  }

  return resolved;
}

export async function assertFilePath(filePath: string) {
  if (!filePath.trim()) {
    throw new Error("File path is required.");
  }

  const resolved = path.resolve(filePath.trim());
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    throw new Error("The selected path is not a file.");
  }
  return resolved;
}

export async function listFilesRecursive(folderPath: string) {
  const root = await assertFolderPath(folderPath);
  const results: string[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await walk(root);
  return { folderPath: root, files: results };
}
