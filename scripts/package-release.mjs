/**
 * Packages a Windows-ready folder under release/AutomateOffice.
 * Requires Node.js 20+ on the target machine (portable Node can be added later).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const releaseDir = path.join(root, "release", "AutomateOffice");

if (!existsSync(standaloneDir)) {
  console.error("Missing .next/standalone. Run `npm run build` first.");
  process.exit(1);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

cpSync(standaloneDir, releaseDir, { recursive: true });

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(releaseDir, ".next", "static");
mkdirSync(path.dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, path.join(releaseDir, "public"), { recursive: true });
}

const drizzleSrc = path.join(root, "drizzle");
if (existsSync(drizzleSrc)) {
  cpSync(drizzleSrc, path.join(releaseDir, "drizzle"), { recursive: true });
}

const launcher = `@echo off
setlocal
title AutomateOffice
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js 20+ is required to run AutomateOffice.
  echo  Install from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

netstat -ano | findstr ":3847" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo.
  echo  AutomateOffice is already running.
  echo  Opening http://localhost:3847
  echo.
  start "" "http://localhost:3847"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo.
echo  Starting AutomateOffice at http://localhost:3847
echo  Keep this window open while you use the app.
echo  Close this window to stop AutomateOffice.
echo.

set PORT=3847
set HOSTNAME=127.0.0.1
start /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3847'"
node server.js

echo.
echo  AutomateOffice has stopped.
pause
`;

writeFileSync(path.join(releaseDir, "Start AutomateOffice.bat"), launcher, "utf8");

writeFileSync(
  path.join(releaseDir, "README.txt"),
  `AutomateOffice — local release package
=====================================

Requirements
- Windows
- Node.js 20+ on PATH (https://nodejs.org/)

Start
1. Double-click "Start AutomateOffice.bat"
2. The app opens at http://localhost:3847
3. Keep the window open while you work

Data
User data stays in:
  %LOCALAPPDATA%\\AutomateOffice\\

Upgrades
Replace this AutomateOffice folder with a newer release.
Do not delete the AppData folder if you want to keep local data.

Tools
- Advanced Renamer: /tools/advanced-renamer
`,
  "utf8",
);

console.log(`Packaged release at ${releaseDir}`);
