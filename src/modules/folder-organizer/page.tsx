"use client";

import {
  Copy,
  Download,
  FileSpreadsheet,
  FolderOpen,
  FolderTree,
  MoveRight,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  FolderOrganizerGuide,
  ValidationChecks,
} from "@/modules/folder-organizer/components/guide";
import { StepPanel } from "@/modules/folder-organizer/components/step-panel";
import { TreePreview } from "@/modules/folder-organizer/components/tree-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadTemplate, parseOrganizerSpreadsheet } from "@/modules/folder-organizer/lib/parse";
import { buildOrganizationTree } from "@/modules/folder-organizer/lib/tree";
import {
  uniqueFolderPaths,
  validateOrganizerRows,
} from "@/modules/folder-organizer/lib/validate";
import type {
  DuplicatePolicy,
  FileMatch,
  OrganizerRow,
  ProgressEvent,
} from "@/modules/folder-organizer/lib/types";

type PlacementMode = "search" | "one-file" | "folders-only";

async function readSse(
  response: Response,
  onEvent: (event: ProgressEvent) => void,
) {
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data:")) continue;
      onEvent(JSON.parse(line.slice(5)) as ProgressEvent);
    }
  }
}

export default function FolderOrganizerPage() {
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [rows, setRows] = useState<OrganizerRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState("");
  const [allowLongPaths, setAllowLongPaths] = useState(false);
  const [foldersCreated, setFoldersCreated] = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>("search");
  const [sourceFolder, setSourceFolder] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>("first");
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [searchMeta, setSearchMeta] = useState<{
    scannedFileCount: number;
    softWarning: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validation = useMemo(
    () => validateOrganizerRows(rows, rootPath),
    [rows, rootPath],
  );
  const tree = useMemo(
    () => buildOrganizationTree(rows, rootPath),
    [rows, rootPath],
  );
  const folderPaths = useMemo(() => uniqueFolderPaths(rows), [rows]);

  const stepOneStatus =
    rows.length > 0 ? "complete" : parseError ? "warning" : "active";
  const stepTwoStatus =
    rows.length === 0
      ? "pending"
      : validation.blockingCount > 0
        ? "warning"
        : rootPath
          ? validation.warningCount > 0
            ? "warning"
            : "complete"
          : "active";
  const stepThreeStatus = foldersCreated
    ? "complete"
    : validation.canCreateFolders
      ? "active"
      : "pending";
  const stepFourStatus = foldersCreated ? "active" : "pending";

  async function handleUpload(file: File | null) {
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setFoldersCreated(false);
    setMatches([]);
    setSearchMeta(null);

    const buffer = await file.arrayBuffer();
    const parsed = parseOrganizerSpreadsheet(buffer, file.name);
    setSheetName(file.name);
    if (parsed.error) {
      setParseError(parsed.error);
      setRows([]);
      return;
    }
    setParseError(null);
    setRows(parsed.rows);
  }

  async function pickRoot() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/tools/folder-organizer/pick-folder", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open folder picker.");
      if (data.cancelled || !data.path) {
        setErrorMessage("Folder picker cancelled. You can also paste a path.");
        return;
      }
      setRootPath(data.path);
      setFoldersCreated(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Picker failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createFolders() {
    if (!validation.canCreateFolders) return;
    if (validation.warningCount > 0 && !allowLongPaths) {
      setErrorMessage(
        "Long path warnings exist. Enable “Allow long paths anyway” to continue, or shorten names.",
      );
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgressMessage("Creating folders…");

    try {
      const response = await fetch("/api/tools/folder-organizer/create-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootPath,
          folderPaths,
          allowLongPaths,
        }),
      });

      await readSse(response, (event) => {
        if (event.type === "progress") {
          setProgressMessage(
            event.status === "ok"
              ? `Created ${event.label}`
              : `Failed ${event.label}: ${event.message}`,
          );
        }
        if (event.type === "done") {
          setFoldersCreated(true);
          setSuccessMessage(
            `Created ${event.succeeded} folder path(s)${event.failed ? ` (${event.failed} failed)` : ""}.`,
          );
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickSourceFolder() {
    setBusy(true);
    try {
      const response = await fetch("/api/tools/folder-organizer/pick-folder", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open folder picker.");
      if (data.path) setSourceFolder(data.path);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Picker failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickSourceFile() {
    setBusy(true);
    try {
      const response = await fetch("/api/tools/folder-organizer/pick-file", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open file picker.");
      if (data.path) setSourceFile(data.path);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Picker failed.");
    } finally {
      setBusy(false);
    }
  }

  async function searchFiles() {
    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/tools/folder-organizer/search-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFolder,
          rows,
          duplicatePolicy,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed.");
      setMatches(data.matches);
      setSearchMeta({
        scannedFileCount: data.scannedFileCount,
        softWarning: data.softWarning,
      });
      setSourceFolder(data.sourceFolder);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function transferMatches(mode: "copy" | "move") {
    const operations = matches
      .filter((match) => match.status === "found" && match.chosenSource)
      .map((match) => ({
        sourcePath: match.chosenSource as string,
        targetRelativeDir: match.targetRelativeDir,
        targetFileName: match.targetFileName,
      }));

    if (operations.length === 0) {
      setErrorMessage("No matched files ready to transfer.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setProgressMessage("Transferring files…");

    try {
      const response = await fetch("/api/tools/folder-organizer/copy-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootPath,
          mode,
          operations,
          allowLongPaths,
        }),
      });

      await readSse(response, (event) => {
        if (event.type === "progress") {
          setProgressMessage(
            event.status === "ok"
              ? `${mode === "copy" ? "Copied" : "Moved"} ${event.label}`
              : `Failed ${event.label}: ${event.message}`,
          );
        }
        if (event.type === "done") {
          setSuccessMessage(
            `${mode === "copy" ? "Copied" : "Moved"} ${event.succeeded} file(s)${event.failed ? ` (${event.failed} failed)` : ""}.`,
          );
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyOneFileManyNames() {
    if (!sourceFile) {
      setErrorMessage("Pick a source file first.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setProgressMessage("Copying file under planned names…");

    try {
      const response = await fetch("/api/tools/folder-organizer/copy-one-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootPath,
          sourceFile,
          rows,
          allowLongPaths,
        }),
      });

      await readSse(response, (event) => {
        if (event.type === "progress") {
          setProgressMessage(
            event.status === "ok"
              ? `Copied ${event.label}`
              : `Skipped/failed ${event.label}: ${event.message}`,
          );
        }
        if (event.type === "done") {
          setSuccessMessage(
            `Copied ${event.succeeded} file(s)${event.failed ? ` (${event.failed} skipped/failed)` : ""}.`,
          );
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <section className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Folder Organizer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Plan folders in Excel, create the tree, then place files.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Upload a sheet with <code>File name</code> and <code>Folder 1…Folder 10</code>,
          preview the structure, create folders, then copy from a source folder,
          stamp one file under many names, or stop after folders.
        </p>
      </section>

      <FolderOrganizerGuide />

      {(errorMessage || successMessage) && (
        <div className="space-y-2">
          {errorMessage ? (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
              {successMessage}
            </div>
          ) : null}
        </div>
      )}

      <StepPanel
        step={1}
        title="Spreadsheet"
        description="Download a ready template or upload .xlsx / .csv. First row must be headers."
        status={stepOneStatus}
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download template
          </Button>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
            className="max-w-md"
          />
          {sheetName ? (
            <Badge variant="outline">
              <FileSpreadsheet className="size-3.5" />
              {sheetName} · {rows.length} row(s)
            </Badge>
          ) : null}
        </div>
        {parseError ? (
          <p className="mt-3 text-sm text-destructive">{parseError}</p>
        ) : null}
      </StepPanel>

      <StepPanel
        step={2}
        title="Root location and checks"
        description="Choose where the folder tree should be created. Checks run as you go."
        status={stepTwoStatus}
        hint="Hierarchy gaps are blocked. Long paths warn but can be overridden."
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={rootPath}
            onChange={(event) => {
              setRootPath(event.target.value);
              setFoldersCreated(false);
            }}
            placeholder="C:\Work\Archive"
            className="font-mono text-sm"
          />
          <Button type="button" onClick={pickRoot} disabled={busy}>
            <FolderOpen className="size-4" />
            Browse
          </Button>
        </div>

        <div className="mt-4">
          <ValidationChecks checks={validation.checks} />
        </div>

        {validation.issues.length > 0 ? (
          <div className="mt-4 max-h-48 space-y-2 overflow-auto">
            {validation.issues.slice(0, 40).map((issue) => (
              <p
                key={`${issue.rowNumber}-${issue.type}-${issue.message}`}
                className={
                  issue.blocking
                    ? "border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                    : "border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"
                }
              >
                {issue.message}
              </p>
            ))}
          </div>
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allowLongPaths}
            onChange={(event) => setAllowLongPaths(event.target.checked)}
          />
          Allow long paths anyway (override Windows length warnings)
        </label>
      </StepPanel>

      <StepPanel
        step={3}
        title="Preview tree and create folders"
        description="Collapsible preview of how folders and planned file names will sit under the root."
        status={stepThreeStatus}
      >
        <TreePreview tree={tree} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={busy || !validation.canCreateFolders}
            onClick={createFolders}
          >
            <FolderTree className="size-4" />
            Create folders
          </Button>
          <Badge variant="outline">{folderPaths.length} unique folder path(s)</Badge>
        </div>
      </StepPanel>

      <StepPanel
        step={4}
        title="Place files"
        description="After folders exist, choose how files should land in the tree."
        status={stepFourStatus}
        hint="Make sure source files are closed and saved before copy or move."
      >
        {!foldersCreated ? (
          <p className="text-sm text-muted-foreground">
            Create folders in step 3 first. Mode C only needs that step.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={placementMode}
                onValueChange={(value) =>
                  setPlacementMode((value as PlacementMode) ?? "search")
                }
              >
                <SelectTrigger className="w-full max-w-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="search">
                    1) I have these files in some folder
                  </SelectItem>
                  <SelectItem value="one-file">
                    2) One file, many names
                  </SelectItem>
                  <SelectItem value="folders-only">
                    3) Folders only — I&apos;m done
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {placementMode === "folders-only" ? (
              <p className="border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Folders are already created from step 3. Nothing more to do.
              </p>
            ) : null}

            {placementMode === "search" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={sourceFolder}
                    onChange={(event) => setSourceFolder(event.target.value)}
                    placeholder="Folder to search recursively"
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" onClick={pickSourceFolder} disabled={busy}>
                    <FolderOpen className="size-4" />
                    Browse
                  </Button>
                  <Button type="button" onClick={searchFiles} disabled={busy || !sourceFolder}>
                    <RefreshCw className="size-4" />
                    Search
                  </Button>
                </div>

                <div className="max-w-xs space-y-2">
                  <Label>When duplicates match</Label>
                  <Select
                    value={duplicatePolicy}
                    onValueChange={(value) =>
                      setDuplicatePolicy((value as DuplicatePolicy) ?? "first")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">Use first match</SelectItem>
                      <SelectItem value="skip">Skip duplicates for review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchMeta ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Scanned {searchMeta.scannedFileCount} file(s)
                    </Badge>
                    <Badge variant="outline">
                      Found {matches.filter((m) => m.status === "found").length}
                    </Badge>
                    <Badge variant="outline">
                      Missing {matches.filter((m) => m.status === "missing").length}
                    </Badge>
                    {searchMeta.softWarning ? (
                      <Badge variant="outline">{searchMeta.softWarning}</Badge>
                    ) : null}
                  </div>
                ) : null}

                {matches.length > 0 ? (
                  <div className="max-h-64 overflow-auto border border-border">
                    <div className="grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_7rem] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      <span>Row</span>
                      <span>Requested</span>
                      <span>Match / note</span>
                      <span>Status</span>
                    </div>
                    {matches.map((match) => (
                      <div
                        key={`${match.rowNumber}-${match.requestedName}`}
                        className="grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_7rem] gap-2 border-b border-border px-3 py-2 text-sm"
                      >
                        <span>{match.rowNumber}</span>
                        <span className="truncate">{match.requestedName}</span>
                        <span className="truncate text-muted-foreground">
                          {match.chosenSource ?? match.detail ?? "—"}
                        </span>
                        <span>{match.status}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || matches.every((m) => m.status !== "found")}
                    onClick={() => transferMatches("copy")}
                  >
                    <Copy className="size-4" />
                    Copy matched files
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || matches.every((m) => m.status !== "found")}
                    onClick={() => transferMatches("move")}
                  >
                    <MoveRight className="size-4" />
                    Move matched files
                  </Button>
                </div>
              </div>
            ) : null}

            {placementMode === "one-file" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={sourceFile}
                    onChange={(event) => setSourceFile(event.target.value)}
                    placeholder="Source file path"
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" onClick={pickSourceFile} disabled={busy}>
                    Browse file
                  </Button>
                  <Button
                    type="button"
                    disabled={busy || !sourceFile}
                    onClick={copyOneFileManyNames}
                  >
                    <Copy className="size-4" />
                    Copy under all names
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Missing extensions in Excel inherit the source extension. Rows whose
                  extension differs from the source are skipped.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {progressMessage ? (
          <p className="mt-4 text-sm text-muted-foreground">{progressMessage}</p>
        ) : null}
      </StepPanel>
    </main>
  );
}
