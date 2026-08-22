import type { LucideIcon } from "lucide-react";
import { LayoutGrid } from "lucide-react";

import { advancedRenamerTool } from "@/modules/advanced-renamer/meta";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: "available" | "coming-soon";
};

export const tools: ToolDefinition[] = [
  {
    id: "home",
    name: "Overview",
    description: "Browse available automation tools.",
    href: "/",
    icon: LayoutGrid,
    status: "available",
  },
  advancedRenamerTool,
];
