import fs from "node:fs/promises";
import path from "node:path";

import { assertFolderPath } from "@/modules/folder-organizer/lib/server-paths";
import type { ProgressEvent } from "@/modules/folder-organizer/lib/types";

type CopyOp = {
  sourcePath: string;
  targetRelativeDir: string;
  targetFileName: string;
};

export async function POST(request: Request) {
  let payload: {
    rootPath?: string;
    mode?: "copy" | "move";
    operations?: CopyOp[];
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
    const mode = payload.mode ?? "copy";
    const operations = payload.operations ?? [];

    if (operations.length === 0) {
      return new Response(JSON.stringify({ error: "No file operations to run." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: ProgressEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        send({ type: "start", total: operations.length });
        let succeeded = 0;
        let failed = 0;

        for (const [index, operation] of operations.entries()) {
          const targetDir = path.join(rootPath, operation.targetRelativeDir);
          const targetPath = path.join(targetDir, operation.targetFileName);
          try {
            if (!payload.allowLongPaths && targetPath.length >= 260) {
              throw new Error(`Target path too long (${targetPath.length} chars).`);
            }
            await fs.mkdir(targetDir, { recursive: true });
            await fs.access(operation.sourcePath);
            if (mode === "move") {
              await fs.rename(operation.sourcePath, targetPath);
            } else {
              await fs.copyFile(operation.sourcePath, targetPath);
            }
            succeeded += 1;
            send({
              type: "progress",
              index: index + 1,
              total: operations.length,
              label: `${operation.targetRelativeDir}\\${operation.targetFileName}`,
              status: "ok",
            });
          } catch (error) {
            failed += 1;
            send({
              type: "progress",
              index: index + 1,
              total: operations.length,
              label: operation.targetFileName,
              status: "error",
              message:
                error instanceof Error ? error.message : "File operation failed.",
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
          error instanceof Error ? error.message : "Could not start file copy.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
