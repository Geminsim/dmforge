@echo off
setlocal
title DMForge Docker Server
if "%DMFORGE_SYNC_TOKEN%"=="" (
    for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"') do set "DMFORGE_SYNC_TOKEN=%%i"
)

echo ===================================================
echo             DMForge Docker Server
echo ===================================================
echo.
echo [1/3] Building production Docker image [dmforge:latest]...
docker build -t dmforge .
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker build failed. Check Docker Desktop.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Removing any previous DMForge container...
docker stop dmforge-container >nul 2>&1
docker rm dmforge-container >nul 2>&1

echo [3/3] Starting authenticated DMForge container...
docker run -d -p 5173:5173 --name dmforge-container -e DMFORGE_SYNC_TOKEN=%DMFORGE_SYNC_TOKEN% dmforge
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker start failed. Port 5173 may already be in use.
    pause
    exit /b %ERRORLEVEL%
)

echo DMForge: http://localhost:5173
echo Sync token: %DMFORGE_SYNC_TOKEN%
start http://localhost:5173
timeout /t 5
endlocal
