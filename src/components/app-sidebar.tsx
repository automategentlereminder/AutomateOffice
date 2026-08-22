"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { tools } from "@/lib/tools/registry";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:px-0">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">
              AutomateOffice
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Corporate automation tools
            </p>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive =
                  tool.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(tool.href);

                return (
                  <SidebarMenuItem key={tool.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={tool.href}>
                          <Icon />
                          <span>{tool.name}</span>
                        </Link>
                      }
                      isActive={isActive}
                      tooltip={tool.name}
                      disabled={tool.status === "coming-soon"}
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          More tools will appear here as they ship.
        </p>
      </SidebarFooter>

      <SidebarSeparator className="hidden" />
      <SidebarRail />
    </Sidebar>
  );
}
