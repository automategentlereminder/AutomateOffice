"use client";

import { CheckCircle2, CircleHelp, ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "1. Spreadsheet",
    body: "Download the template or upload your own .xlsx/.csv. Columns: File name, Folder 1…Folder 10. First row is the header.",
  },
  {
    title: "2. Root + checks",
    body: "Choose where the tree should be created. Progressive checks catch invalid characters, hierarchy gaps, and long Windows paths. Long paths warn but can be overridden.",
  },
  {
    title: "3. Create folders",
    body: "Preview the collapsible tree, then create every folder under the root.",
  },
  {
    title: "4. Place files (optional)",
    body: "A) Search another folder recursively and copy/move matches. B) Copy one source file under many names. C) Stop after folders are created.",
  },
];

export function FolderOrganizerGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CircleHelp className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Quick guide</p>
            <p className="text-xs text-muted-foreground">
              Excel plan → create folders → place files
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Show"}
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>
      {open ? (
        <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="border border-border bg-card p-4">
              <h3 className="text-sm font-semibold tracking-tight">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ValidationChecks({
  checks,
}: {
  checks: {
    id: string;
    label: string;
    status: "pending" | "pass" | "fail" | "warn";
    detail?: string;
  }[];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {checks.map((check) => (
        <div
          key={check.id}
          className={cn(
            "flex items-start gap-3 border px-3 py-3 text-sm",
            check.status === "pass" && "border-emerald-600/30 bg-emerald-50/40 dark:bg-emerald-950/20",
            check.status === "fail" && "border-destructive/30 bg-destructive/5",
            check.status === "warn" && "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20",
            check.status === "pending" && "border-border bg-card",
          )}
        >
          {check.status === "pass" ? (
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-700 dark:text-emerald-300" />
          ) : check.status === "pending" ? (
            <CircleHelp className="mt-0.5 size-4 text-muted-foreground" />
          ) : (
            <TriangleAlert
              className={cn(
                "mt-0.5 size-4",
                check.status === "fail" ? "text-destructive" : "text-amber-600",
              )}
            />
          )}
          <div>
            <p className="font-medium text-foreground">{check.label}</p>
            {check.detail ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {check.detail}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
