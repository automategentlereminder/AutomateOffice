import { NextResponse } from "next/server";

import { listFolderFiles } from "@/modules/advanced-renamer/lib/server-paths";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { folderPath?: string };
    const result = await listFolderFiles(body.folderPath ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read folder.",
      },
      { status: 400 },
    );
  }
}
