@echo off
setlocal
title DMForge Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" %*
if errorlevel 1 (
  echo.
  echo DMForge failed to start. Review the error above.
  pause
)
endlocal
