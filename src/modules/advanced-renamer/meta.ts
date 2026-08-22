import type { LucideIcon } from "lucide-react";
import { FilePenLine } from "lucide-react";

export const advancedRenamerTool = {
  id: "advanced-renamer",
  name: "Advanced Renamer",
  description:
    "Rename files with dynamic patterns, spreadsheets, and preview.",
  href: "/tools/advanced-renamer",
  icon: FilePenLine as LucideIcon,
  status: "available" as const,
};
