import type { FileEntry, SortDirection, SortField } from "@/modules/advanced-renamer/lib/types";

export function sortFiles(
  files: FileEntry[],
  field: SortField,
  direction: SortDirection,
): FileEntry[] {
  const sorted = [...files].sort((a, b) => {
    let result = 0;

    if (field === "name") {
      result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    } else if (field === "modifiedAt") {
      result = a.modifiedAt - b.modifiedAt;
    } else {
      result = a.size - b.size;
    }

    return direction === "asc" ? result : -result;
  });

  return sorted;
}
