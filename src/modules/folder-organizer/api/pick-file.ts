import { NextResponse } from "next/server";

import { pickFileWithDialog } from "@/modules/folder-organizer/lib/pick-file";

export async function POST() {
  const result = await pickFileWithDialog();
  if (result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
