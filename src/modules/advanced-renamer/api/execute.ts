import fs from "node:fs/promises";
import path from "node:path";

import type {
  ExecuteMode,
  ProgressEvent,
  RenameOperation,
} from "@/modules/advanced-renamer/lib/types";
import {
  assertBaseName,
  assertFolderPath,
} from "@/modules/advanced-renamer/lib/server-paths";

async function ensureUniqueTarget(
  folderPath: string,
  targetName: string,
  sourceName: string,
) {
  const targetPath = path.join(folderPath, targetName);
  const sourcePath = path.join(folderPath, sourceName);

  try {
    await fs.access(targetPath);
    if (targetPath.toLowerCase() !== sourcePath.toLowerCase()) {
      throw new Error(`Target already exists: ${targetName}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Target already")) {
      throw error;
    }
  }
}

export async function POST(request: Request) {
  let payload: {
    folderPath?: string;
    mode?: ExecuteMode;
    operations?: RenameOperation[];
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
    const folderPath = await assertFolderPath(payload.folderPath ?? "");
    const mode = payload.mode ?? "rename";
    const operations = payload.operations ?? [];

    if (operations.length === 0) {
      return new Response(JSON.stringify({ error: "No rename operations to run." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const outputDir =
      mode === "copy" ? path.join(folderPath, "Renamed") : folderPath;

    if (mode === "copy") {
      await fs.mkdir(outputDir, { recursive: true });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: ProgressEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        send({ type: "start", total: operations.length });

        let succeeded = 0;
        let failed = 0;

        for (const [index, operation] of operations.entries()) {
          try {
            const from = assertBaseName(operation.from, "Source name");
            const to = assertBaseName(operation.to, "Target name");
            const sourcePath = path.join(folderPath, from);
            const targetPath = path.join(outputDir, to);

            await fs.access(sourcePath);
            await ensureUniqueTarget(outputDir, to, from);

            if (mode === "copy") {
              await fs.copyFile(sourcePath, targetPath);
            } else {
              await fs.rename(sourcePath, targetPath);
            }

            succeeded += 1;
            send({
              type: "progress",
              index: index + 1,
              total: operations.length,
              from,
              to,
              status: "ok",
            });
          } catch (error) {
            failed += 1;
            send({
              type: "progress",
              index: index + 1,
              total: operations.length,
              from: operation.from,
              to: operation.to,
              status: "error",
              message:
                error instanceof Error ? error.message : "Operation failed.",
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
        error: error instanceof Error ? error.message : "Could not start rename.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
