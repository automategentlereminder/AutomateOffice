import { NextResponse } from "next/server";

import { pickFolderWithDialog } from "@/modules/folder-organizer/lib/pick-folder";

export async function POST() {
  const result = await pickFolderWithDialog();
  if (result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
