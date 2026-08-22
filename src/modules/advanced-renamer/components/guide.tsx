"use client";

import { ChevronDown, CircleHelp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "1. Select a folder",
    body: "Click Browse to pick a folder, or paste a path and click Load. Only files in that folder (not subfolders) are listed. Close Excel, PDF viewers, and other apps that may lock those files before renaming.",
  },
  {
    title: "2. Build a dynamic name",
    body: "Type a pattern such as {#}_{Item Name}-final. Use {#} for a counter (set the start number beside the pattern). Import an .xlsx, .xls, or .csv if you need column values — the first row is the header. Click Insert {Column} to add a column token.",
  },
  {
    title: "3. Sort and match",
    body: "Sort by Name, Last modified, or Size (ascending/descending), just like Windows Explorer. Sequential matching maps sorted files 1-to-1 with spreadsheet rows. Advanced matching walks Excel rows in order and pairs each value with the first unused file whose name includes that value.",
  },
  {
    title: "4. Preview, then rename",
    body: "Check Current name → New name in the table. Notes show when spreadsheet rows and file counts differ. Fix any warnings before continuing. Rename changes files in place. Copy and rename writes into a Renamed subfolder and leaves originals untouched.",
  },
];

export function AdvancedRenamerGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CircleHelp className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Quick guide</p>
            <p className="text-xs text-muted-foreground">
              Four steps: folder → pattern → match → preview & rename
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
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </div>

      {open ? (
        <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="border border-border bg-card p-4">
              <h3 className="text-sm font-semibold tracking-tight">
                {section.title}
              </h3>
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
