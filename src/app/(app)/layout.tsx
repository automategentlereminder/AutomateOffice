import { AppFooter } from "@/components/app-footer";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            AutomateOffice
          </p>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
