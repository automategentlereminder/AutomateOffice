import fs from "node:fs/promises";
import path from "node:path";

import {
  resolveSingleSourceCopyName,
} from "@/modules/folder-organizer/lib/match";
import {
  assertFilePath,
  assertFolderPath,
} from "@/modules/folder-organizer/lib/server-paths";
import type {
  OrganizerRow,
  ProgressEvent,
} from "@/modules/folder-organizer/lib/types";

export async function POST(request: Request) {
  let payload: {
    rootPath?: string;
    sourceFile?: string;
    rows?: OrganizerRow[];
    allowLongPaths?: boolean;
  };

  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rootPath = await assertFolderPath(payload.rootPath ?? "");
    const sourceFile = await assertFilePath(payload.sourceFile ?? "");
    const sourceName = path.basename(sourceFile);
    const rows = (payload.rows ?? []).filter((row) => row.fileName.trim());

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file names found in the spreadsheet." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: ProgressEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        send({ type: "start", total: rows.length });
        let succeeded = 0;
        let failed = 0;

        for (const [index, row] of rows.entries()) {
          const folderPath = row.folders.filter(Boolean).join(path.sep);
          const resolved = resolveSingleSourceCopyName(row.fileName, sourceName);
          const label = folderPath
            ? `${folderPath}\\${resolved.targetFileName || row.fileName}`
            : resolved.targetFileName || row.fileName;

          try {
            if (resolved.skipReason) {
              throw new Error(resolved.skipReason);
            }
            const targetDir = path.join(rootPath, folderPath);
            const targetPath = path.join(targetDir, resolved.targetFileName);
            if (!payload.allowLongPaths && targetPath.length >= 260) {
              throw new Error(`Target path too long (${targetPath.length} chars).`);
            }
            await fs.mkdir(targetDir, { recursive: true });
            await fs.copyFile(sourceFile, targetPath);
            succeeded += 1;
            send({
              type: "progress",
              index: index + 1,
              total: rows.length,
              label,
              status: "ok",
            });
          } catch (error) {
            failed += 1;
            send({
              type: "progress",
              index: index + 1,
              total: rows.length,
              label,
              status: "error",
              message:
                error instanceof Error ? error.message : "Copy failed.",
            });
          }
        }

        send({ type: "done", succeeded, failed });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Could not start single-file copy.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
