import { NextResponse } from "next/server";

import {
  indexFiles,
  matchRowsToFiles,
} from "@/modules/folder-organizer/lib/match";
import { listFilesRecursive } from "@/modules/folder-organizer/lib/server-paths";
import type {
  DuplicatePolicy,
  OrganizerRow,
} from "@/modules/folder-organizer/lib/types";
import { MISSING_SOFT_THRESHOLD } from "@/modules/folder-organizer/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceFolder?: string;
      rows?: OrganizerRow[];
      duplicatePolicy?: DuplicatePolicy;
    };

    const listed = await listFilesRecursive(body.sourceFolder ?? "");
    const matches = matchRowsToFiles({
      rows: body.rows ?? [],
      indexedFiles: indexFiles(listed.files),
      duplicatePolicy: body.duplicatePolicy ?? "first",
    });

    const missing = matches.filter((match) => match.status === "missing").length;
    const found = matches.filter((match) => match.status === "found").length;
    const duplicates = matches.filter((match) => match.status === "duplicate").length;

    return NextResponse.json({
      sourceFolder: listed.folderPath,
      scannedFileCount: listed.files.length,
      matches,
      stats: { found, missing, duplicates },
      softWarning:
        missing > MISSING_SOFT_THRESHOLD
          ? "Most of the files are not in this location."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not search files.",
      },
      { status: 400 },
    );
  }
}
