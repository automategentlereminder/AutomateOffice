@echo off
setlocal
title AutomateOffice

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js is not installed on this computer.
  echo  Install Node.js 20+ from https://nodejs.org/ and run this file again.
  echo.
  pause
  exit /b 1
)

REM If AutomateOffice is already running, just open the browser.
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

if not exist "node_modules\" (
  echo.
  echo  First run: installing dependencies...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Install failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  Starting AutomateOffice at http://localhost:3847
echo  Keep this window open while you use the app.
echo  Close this window to stop AutomateOffice.
echo.

REM Open the browser after a short delay without a second console window.
start /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3847'"

call npm run dev

echo.
echo  AutomateOffice has stopped.
pause
