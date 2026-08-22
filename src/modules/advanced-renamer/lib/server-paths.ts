import fs from "node:fs/promises";
import path from "node:path";

/** Invalid in a Windows file/folder name. Spaces are allowed. */
const INVALID_NAME_CHARS = /[<>:"|?*\u0000-\u001f]/;

export function normalizeFolderPath(folderPath: string) {
  return path.resolve(folderPath.trim());
}

function assertPathSegments(folderPath: string) {
  // Allow drive letters like C:\... — colon is valid there only.
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

export function assertBaseName(fileName: string, label: string) {
  if (!fileName.trim()) {
    throw new Error(`${label} is required.`);
  }

  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error(`${label} must be a file name, not a path.`);
  }

  if (INVALID_NAME_CHARS.test(fileName)) {
    throw new Error(`${label} contains invalid characters.`);
  }

  return fileName;
}

export async function listFolderFiles(folderPath: string) {
  const resolved = await assertFolderPath(folderPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fullPath = path.join(resolved, entry.name);
        const stat = await fs.stat(fullPath);
        return {
          name: entry.name,
          size: stat.size,
          modifiedAt: stat.mtimeMs,
        };
      }),
  );

  return { folderPath: resolved, files };
}
