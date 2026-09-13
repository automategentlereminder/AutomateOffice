import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { assertFolderPath } from "@/modules/folder-organizer/lib/server-paths";
import type { ProgressEvent } from "@/modules/folder-organizer/lib/types";

export async function POST(request: Request) {
  let payload: { rootPath?: string; folderPaths?: string[]; allowLongPaths?: boolean };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const rootPath = await assertFolderPath(payload.rootPath ?? "");
    const folderPaths = [...new Set(payload.folderPaths ?? [])].filter(Boolean);

    if (folderPaths.length === 0) {
      return NextResponse.json(
        { error: "No folders to create." },
        { status: 400 },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: ProgressEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        send({ type: "start", total: folderPaths.length });
        let succeeded = 0;
        let failed = 0;

        for (const [index, relative] of folderPaths.entries()) {
          const absolute = path.join(rootPath, relative);
          try {
            if (!payload.allowLongPaths && absolute.length >= 260) {
              throw new Error(
                `Path too long (${absolute.length} chars): ${absolute}`,
              );
            }
            await fs.mkdir(absolute, { recursive: true });
            succeeded += 1;
            send({
              type: "progress",
              index: index + 1,
              total: folderPaths.length,
              label: relative,
              status: "ok",
            });
          } catch (error) {
            failed += 1;
            send({
              type: "progress",
              index: index + 1,
              total: folderPaths.length,
              label: relative,
              status: "error",
              message:
                error instanceof Error ? error.message : "Could not create folder.",
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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create folders.",
      },
      { status: 400 },
    );
  }
}
