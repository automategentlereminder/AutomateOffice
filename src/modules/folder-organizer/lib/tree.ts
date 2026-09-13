import path from "node:path";

import { buildAbsoluteTarget } from "@/modules/folder-organizer/lib/validate";
import {
  WINDOWS_MAX_PATH,
  type OrganizerRow,
  type TreeNode,
} from "@/modules/folder-organizer/lib/types";

type MutableNode = {
  id: string;
  name: string;
  kind: "folder" | "file";
  children: Map<string, MutableNode>;
  pathHint: string;
  longPath?: boolean;
};

function toTreeNode(node: MutableNode): TreeNode {
  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    pathHint: node.pathHint,
    longPath: node.longPath,
    children: [...node.children.values()]
      .sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map(toTreeNode),
  };
}

export function buildOrganizationTree(
  rows: OrganizerRow[],
  rootPath: string,
): TreeNode {
  const root: MutableNode = {
    id: "root",
    name: rootPath.trim() || "Root",
    kind: "folder",
    children: new Map(),
    pathHint: rootPath.trim() || "(choose root)",
  };

  for (const row of rows) {
    let cursor = root;
    const parts: string[] = [];

    for (const folder of row.folders) {
      if (!folder) {
        break;
      }
      parts.push(folder);
      const key = `folder:${folder}`;
      let next = cursor.children.get(key);
      if (!next) {
        const relative = parts.join(path.sep);
        const absolute = rootPath.trim()
          ? path.join(rootPath.trim(), relative)
          : relative;
        next = {
          id: `${cursor.id}/${key}`,
          name: folder,
          kind: "folder",
          children: new Map(),
          pathHint: absolute,
          longPath: absolute.length >= WINDOWS_MAX_PATH,
        };
        cursor.children.set(key, next);
      }
      cursor = next;
    }

    if (row.fileName) {
      const absolute = rootPath.trim()
        ? buildAbsoluteTarget(rootPath.trim(), row)
        : buildAbsoluteTarget("", row);
      const key = `file:${row.fileName}:${row.rowNumber}`;
      cursor.children.set(key, {
        id: `${cursor.id}/${key}`,
        name: row.fileName,
        kind: "file",
        children: new Map(),
        pathHint: absolute,
        longPath: absolute.length >= WINDOWS_MAX_PATH,
      });
    }
  }

  return toTreeNode(root);
}
