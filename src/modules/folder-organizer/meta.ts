import type { LucideIcon } from "lucide-react";
import { FolderTree } from "lucide-react";

export const folderOrganizerTool = {
  id: "folder-organizer",
  name: "Folder Organizer",
  description:
    "Create folder trees from Excel and place files by search or one-source copy.",
  href: "/tools/folder-organizer",
  icon: FolderTree as LucideIcon,
  status: "available" as const,
};
