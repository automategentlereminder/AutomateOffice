# AutomateOffice

A collection of tools for automating everyday corporate work.

AutomateOffice brings practical, focused utilities into one place — helping teams spend less time on repetitive tasks and more time on what matters. The app runs locally in your browser, stores data on your machine, and upgrades without losing your data.

## Tools

| Tool | Description | Status |
|------|-------------|--------|
| [Advanced Renamer](#advanced-renamer) | Dynamic file renaming with spreadsheet columns and preview | Available |
| [Folder Organizer](#folder-organizer) | Create folder trees from Excel, then place files | Available |

New tools are added as separate modules under `src/modules/`.

## Advanced Renamer

Rename files from a folder using a dynamic name pattern, optional Excel/CSV columns, Windows-style sorting, and a preview table before you commit.

### Quick guide

1. **Select a folder** — Browse or paste a path, then Load. Only top-level files are listed. Close apps that may lock those files first.
2. **Build a dynamic name** — Use `{#}` for numbering (set the start value) and `{Column Name}` after importing an `.xlsx`, `.xls`, or `.csv` (first row = headers). Fixed text like `-` or `_` is allowed.
3. **Sort and match** — Sort by Name / Last modified / Size. Sequential maps files 1-to-1 with rows. Advanced matching pairs each spreadsheet value with the first unused file whose name includes that value.
4. **Preview and rename** — Review Current → New names. Notes show row/file count mismatches. **Rename** updates in place; **Copy and rename** writes into a `Renamed` subfolder.

An in-app **Quick guide** panel on the tool page covers the same steps.

### Module location

```
src/modules/advanced-renamer/
```

## Folder Organizer

Create a folder tree from Excel (`File name` + `Folder 1`…`Folder 10`), preview it, create folders under a chosen root, then optionally place files.

### Quick guide

1. **Spreadsheet** — Download the template or upload `.xlsx` / `.csv`.
2. **Root + checks** — Choose the create location. Progressive checks catch invalid characters, hierarchy gaps, and long Windows paths (override allowed).
3. **Create folders** — Collapsible tree preview, then create.
4. **Place files** — (1) Recursively search another folder and copy/move matches, (2) copy one source file under many names, or (3) folders only.

### Module location

```
src/modules/folder-organizer/
```

## Local development

Requirements: Node.js 20+

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

On Windows, double-click:

```
Start AutomateOffice.bat
```

Keep the command window open while you work.

## Distributable build

Build a shareable Windows folder (still needs Node.js 20+ on the target PC for now):

```bash
npm run dist
```

Output:

```
release/AutomateOffice/
  Start AutomateOffice.bat
  server.js
  README.txt
  ...
```

Zip and share that folder. Recipients double-click `Start AutomateOffice.bat`.

User data stays outside the release folder, so upgrades are: replace the app folder, keep AppData.

| Stage | Who it's for | What they need |
|-------|----------------|----------------|
| **Dev** | Building tools | Node.js 20+, `Start AutomateOffice.bat` in the repo |
| **Release** | Early users | Node.js 20+, zip of `release/AutomateOffice` |
| **Later** | Wider rollout | Packaged `.exe` / portable Node (no separate install) |

## Local data

```
%LOCALAPPDATA%\AutomateOffice\
  data\automateoffice.db
  backups\
  logs\
```

Schema migrations run automatically when the app starts.

## Project layout

```
src/
  modules/                 # one folder per tool (preferred place for new features)
    advanced-renamer/
    folder-organizer/
  app/                     # thin Next.js routes that mount modules
  components/              # shared shell UI (sidebar, footer, theme)
  lib/tools/registry.ts    # tool list for the sidebar
```

## Stack

- Next.js + React
- shadcn/ui + Tailwind (Inter, emerald theme, dark mode)
- SQLite via libSQL + Drizzle ORM

## License

MIT — see [LICENSE](LICENSE).
