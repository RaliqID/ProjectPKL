@echo off
setlocal
title SAKHA Finance Operations - starting dev stack

rem ---------------------------------------------------------------------------
rem  run.cmd - double-click entry point for the whole SAKHA Finance Operations dev stack.
rem
rem  Double-click this file to start:
rem    PostgreSQL + Laravel API + queue worker + Vite SPA
rem  then open the app in the browser. It does NOT close the window on error,
rem  so any problem can be read and reported.
rem ---------------------------------------------------------------------------

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1" %*
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
    echo.
    echo [ERROR] Startup failed with code %RC%.
    echo         Check the output above and the logs in storage\logs.
    echo.
    pause
    exit /b %RC%
)

rem Success: start-all.ps1 already opened the browser and the services keep
rem running detached. Close this window freely.
endlocal
exit /b 0
