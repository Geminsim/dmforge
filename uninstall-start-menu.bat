@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-start-menu.ps1"
if errorlevel 1 pause
endlocal
