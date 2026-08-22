"use client";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  Copy,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  Replace,
} from "lucide-react";
import { useMemo, useState } from "react";

import { FilePreviewTable } from "@/modules/advanced-renamer/components/file-preview-table";
import { AdvancedRenamerGuide } from "@/modules/advanced-renamer/components/guide";
import { StepPanel } from "@/modules/advanced-renamer/components/step-panel";
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
import { Textarea } from "@/components/ui/textarea";
import {
  computeRenames,
  getOperations,
} from "@/modules/advanced-renamer/lib/compute";
import { parseSpreadsheet } from "@/modules/advanced-renamer/lib/spreadsheet";
import type {
  ExecuteMode,
  FileEntry,
  MatchMode,
  ProgressEvent,
  SortDirection,
  SortField,
  SpreadsheetData,
} from "@/modules/advanced-renamer/lib/types";

export default function AdvancedRenamerPage() {
  const [folderPath, setFolderPath] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [pattern, setPattern] = useState("{#}_name");
  const [numberStart, setNumberStart] = useState(1);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [matchMode, setMatchMode] = useState<MatchMode>("sequential");
  const [inclusionColumn, setInclusionColumn] = useState<string>("");
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      computeRenames({
        files,
        sortField,
        sortDirection,
        pattern,
        numberStart,
        spreadsheet,
        matchMode,
        inclusionColumn: inclusionColumn || null,
      }),
    [
      files,
      sortField,
      sortDirection,
      pattern,
      numberStart,
      spreadsheet,
      matchMode,
      inclusionColumn,
    ],
  );

  const operations = useMemo(() => getOperations(preview.rows), [preview.rows]);

  const stepOneStatus =
    files.length > 0
      ? ("complete" as const)
      : folderPath
        ? ("warning" as const)
        : ("active" as const);
  const stepTwoStatus =
    files.length === 0
      ? ("pending" as const)
      : preview.warnings.some((warning) => warning.includes("Pattern"))
        ? ("warning" as const)
        : pattern.trim()
          ? ("complete" as const)
          : ("active" as const);
  const stepThreeStatus =
    files.length === 0
      ? ("pending" as const)
      : matchMode === "inclusion" && spreadsheet && !inclusionColumn
        ? ("warning" as const)
        : ("complete" as const);
  const stepFourStatus =
    files.length === 0
      ? ("pending" as const)
      : preview.warnings.length > 0
        ? ("warning" as const)
        : operations.length > 0
          ? ("active" as const)
          : ("warning" as const);

  async function loadFolder(pathValue: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingFolder(true);

    try {
      const response = await fetch("/api/tools/advanced-renamer/list-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: pathValue }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not read folder.");
      }

      setFolderPath(data.folderPath);
      setFiles(data.files);
      setProgressIndex(0);
      setProgressMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not read folder.",
      );
    } finally {
      setLoadingFolder(false);
    }
  }

  async function handlePickFolder() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingFolder(true);

    try {
      const response = await fetch("/api/tools/advanced-renamer/pick-folder", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not open folder picker.");
      }

      if (data.cancelled || !data.path) {
        setErrorMessage(
          "Folder picker was cancelled, or the dialog closed without a selection. You can also paste a folder path and click Load.",
        );
        return;
      }

      await loadFolder(data.path);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not open folder picker.",
      );
    } finally {
      setLoadingFolder(false);
    }
  }

  async function handleSpreadsheetUpload(file: File | null) {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    const buffer = await file.arrayBuffer();
    const parsed = parseSpreadsheet(buffer, file.name);
    setSpreadsheet(parsed);
    setSpreadsheetName(file.name);

    if (parsed.headers.length > 0 && !inclusionColumn) {
      setInclusionColumn(parsed.headers[0] ?? "");
    }
  }

  async function runExecute(mode: ExecuteMode) {
    if (operations.length === 0 || preview.warnings.length > 0) {
      return;
    }

    setExecuting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgressIndex(0);
    setProgressMessage("Starting…");

    try {
      const response = await fetch("/api/tools/advanced-renamer/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath,
          mode,
          operations,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error ?? "Rename failed to start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) {
            continue;
          }

          const event = JSON.parse(line.slice(5)) as ProgressEvent;

          if (event.type === "start") {
            setProgressMessage(`Processing 0 of ${event.total}…`);
          }

          if (event.type === "progress") {
            setProgressIndex(event.index);
            setProgressMessage(
              event.status === "ok"
                ? `Renamed ${event.from} → ${event.to}`
                : `Failed on ${event.from}: ${event.message}`,
            );
          }

          if (event.type === "done") {
            setSuccessMessage(
              mode === "copy"
                ? `Copied and renamed ${event.succeeded} file(s) into the Renamed folder${event.failed ? ` (${event.failed} failed)` : ""}.`
                : `Renamed ${event.succeeded} file(s)${event.failed ? ` (${event.failed} failed)` : ""}.`,
            );
            await loadFolder(folderPath);
          }
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Rename failed.",
      );
    } finally {
      setExecuting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <section className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Advanced Renamer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Build dynamic names, preview safely, then rename.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Select a folder, compose a dynamic name with <code>{'{#}'}</code> and
          spreadsheet columns, preview every change, then rename in place or copy
          into a <strong>Renamed</strong> subfolder.
        </p>
      </section>

      <AdvancedRenamerGuide />

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
        title="Select folder"
        description="Choose the folder whose files you want to rename. Only files in the top level of that folder are listed."
        status={stepOneStatus}
        hint="Make sure files are saved and closed in Excel, PDF viewers, or other apps before renaming."
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={folderPath}
            onChange={(event) => setFolderPath(event.target.value)}
            placeholder="C:\Work\Files"
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handlePickFolder} disabled={loadingFolder}>
              <FolderOpen className="size-4" />
              {loadingFolder ? "Waiting for folder…" : "Browse"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => loadFolder(folderPath)}
              disabled={loadingFolder || !folderPath.trim()}
            >
              <RefreshCw className="size-4" />
              Load
            </Button>
          </div>
        </div>

        {files.length > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Loaded <strong>{files.length}</strong> file(s) from{" "}
            <span className="font-mono">{folderPath}</span>
          </p>
        ) : null}
      </StepPanel>

      <StepPanel
        step={2}
        title="Build dynamic name"
        description="Use {#} for numbering and {Column Name} for spreadsheet values. Add dashes, underscores, or fixed text as needed."
        status={stepTwoStatus}
        hint="Example: {#}_{Item Name}-2026"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
          <div className="space-y-2">
            <Label htmlFor="pattern">Dynamic name pattern</Label>
            <Textarea
              id="pattern"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number-start">Number starts from</Label>
            <Input
              id="number-start"
              type="number"
              min={0}
              value={numberStart}
              onChange={(event) =>
                setNumberStart(Number(event.target.value || 0))
              }
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Label htmlFor="spreadsheet">Import spreadsheet (optional)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="spreadsheet"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) =>
                handleSpreadsheetUpload(event.target.files?.[0] ?? null)
              }
            />
            {spreadsheetName ? (
              <Badge variant="outline">
                <FileSpreadsheet className="size-3.5" />
                {spreadsheetName}
              </Badge>
            ) : null}
          </div>

          {spreadsheet ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Header row detected automatically. Available columns:
              </p>
              <div className="flex flex-wrap gap-2">
                {spreadsheet.headers.map((header) => (
                  <Button
                    key={header}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPattern((current) =>
                        current.includes(`{${header}}`)
                          ? current
                          : `${current}{${header}}`,
                      )
                    }
                  >
                    Insert {`{${header}}`}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </StepPanel>

      <StepPanel
        step={3}
        title="Sort and match files"
        description="Sort the working file order like Windows Explorer. Use advanced matching to pair files with spreadsheet rows when filenames include the selected column value."
        status={stepThreeStatus}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Sort by</Label>
            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value as SortField)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="modifiedAt">Last modified</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={sortDirection}
              onValueChange={(value) =>
                setSortDirection(value as SortDirection)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">
                  <span className="inline-flex items-center gap-2">
                    <ArrowDownAZ className="size-4" />
                    Ascending
                  </span>
                </SelectItem>
                <SelectItem value="desc">
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpAZ className="size-4" />
                    Descending
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Matching mode</Label>
            <Select
              value={matchMode}
              onValueChange={(value) => setMatchMode(value as MatchMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential (1 to 1)</SelectItem>
                <SelectItem value="inclusion">
                  Advanced (filename includes value)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Advanced match column</Label>
            <Select
              value={inclusionColumn}
              onValueChange={(value) => setInclusionColumn(value ?? "")}
              disabled={!spreadsheet || matchMode !== "inclusion"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick column" />
              </SelectTrigger>
              <SelectContent>
                {(spreadsheet?.headers ?? []).map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {matchMode === "inclusion" && spreadsheet ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Rows are processed in spreadsheet order. If row 2 contains{" "}
            <strong>XYZ</strong>, the first unused file whose name includes{" "}
            <strong>XYZ</strong> is matched to that row.
          </p>
        ) : null}
      </StepPanel>

      <StepPanel
        step={4}
        title="Preview and rename"
        description="Review the current and new names before processing. Invalid or duplicate targets stay blocked until fixed."
        status={stepFourStatus}
        hint="Close all open files before clicking Rename or Copy and rename."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {preview.notes.map((note) => (
            <Badge key={note} variant="outline">
              {note}
            </Badge>
          ))}
          <Badge variant="outline">
            {preview.stats.renameCount} rename(s) · {preview.stats.unchangedCount}{" "}
            unchanged
          </Badge>
        </div>

        {preview.warnings.length > 0 ? (
          <div className="mb-4 space-y-2">
            {preview.warnings.map((warning) => (
              <p
                key={warning}
                className="border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"
              >
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        <FilePreviewTable
          rows={preview.rows}
          showProgress={executing}
          progressIndex={progressIndex}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={
              executing ||
              operations.length === 0 ||
              preview.warnings.length > 0 ||
              !folderPath
            }
            onClick={() => runExecute("rename")}
          >
            <Replace className="size-4" />
            Rename
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              executing ||
              operations.length === 0 ||
              preview.warnings.length > 0 ||
              !folderPath
            }
            onClick={() => runExecute("copy")}
          >
            <Copy className="size-4" />
            Copy and rename
          </Button>
        </div>

        {progressMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{progressMessage}</p>
        ) : null}
      </StepPanel>
    </main>
  );
}
