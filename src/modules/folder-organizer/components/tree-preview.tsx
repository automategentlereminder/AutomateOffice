"use client";

import { ChevronDown, FileIcon, FolderIcon } from "lucide-react";
import { useState } from "react";

import type { TreeNode } from "@/modules/folder-organizer/lib/types";
import { cn } from "@/lib/utils";

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent/40",
          node.longPath && "bg-amber-50/50 dark:bg-amber-950/20",
        )}
        style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
        onClick={() => hasChildren && setOpen((value) => !value)}
      >
        {hasChildren ? (
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
        ) : (
          <span className="inline-block size-3.5 shrink-0" />
        )}
        {node.kind === "folder" ? (
          <FolderIcon className="size-3.5 shrink-0 text-primary" />
        ) : (
          <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{node.name}</span>
        {node.longPath ? (
          <span className="ml-auto shrink-0 text-[11px] text-amber-700 dark:text-amber-300">
            long path
          </span>
        ) : null}
      </button>
      {open
        ? node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))
        : null}
    </div>
  );
}

export function TreePreview({ tree }: { tree: TreeNode }) {
  return (
    <div className="max-h-[420px] overflow-auto border border-border bg-card">
      <TreeItem node={tree} />
    </div>
  );
}
