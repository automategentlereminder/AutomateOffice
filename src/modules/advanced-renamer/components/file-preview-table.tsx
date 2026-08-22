"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import type { PreviewRow } from "@/modules/advanced-renamer/lib/types";
import { cn } from "@/lib/utils";

type FilePreviewTableProps = {
  rows: PreviewRow[];
  showProgress?: boolean;
  progressIndex?: number;
};

function stateLabel(row: PreviewRow) {
  switch (row.state) {
    case "renamed":
      return "Will rename";
    case "unchanged":
      return "Unchanged";
    case "invalid":
      return "Invalid";
    default:
      return row.state;
  }
}

export function FilePreviewTable({
  rows,
  showProgress = false,
  progressIndex = 0,
}: FilePreviewTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Select a folder to load files into the preview table.
      </div>
    );
  }

  return (
    <div className="border border-border">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem] border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span>Current name</span>
        <span>New name</span>
        <span>Status</span>
      </div>

      <div ref={parentRef} className="h-[420px] overflow-auto">
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          className="relative w-full"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isActive =
              showProgress &&
              row.state === "renamed" &&
              virtualRow.index < progressIndex;

            return (
              <div
                key={row.fileName}
                className={cn(
                  "absolute inset-x-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem] items-center gap-3 border-b border-border px-4 py-3 text-sm",
                  isActive && "bg-emerald-50/70 dark:bg-emerald-950/20",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="truncate font-medium">{row.fileName}</span>
                <span className="truncate text-muted-foreground">
                  {row.newName ?? "—"}
                </span>
                <div className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit",
                      row.state === "renamed" &&
                        "border-emerald-600/30 text-emerald-700 dark:text-emerald-300",
                      row.state === "invalid" &&
                        "border-destructive/30 text-destructive",
                    )}
                  >
                    {stateLabel(row)}
                  </Badge>
                  {row.detail ? (
                    <span className="text-[11px] leading-4 text-muted-foreground">
                      {row.detail}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
