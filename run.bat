@echo off
title DMForge Hot-Patching Dev Server
echo ===================================================
echo             DMForge Dev Server Engine           
echo ===================================================
echo.
echo [1/3] Building hot-patchable Docker image [dmforge:latest]...
docker build -t dmforge .

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker build failed! Please check if Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Cleaning up any old dmforge containers...
docker stop dmforge-container >nul 2>&1
docker rm dmforge-container >nul 2>&1

echo.
echo [3/3] Launching new hot-patching Docker container [dmforge-container]...
echo Mapping Vite dev port 5173 to http://localhost:5173 ...
echo Enabling live HMR with local folder bind-mount...
docker run -d -p 5173:5173 --name dmforge-container -v "%cd%:/app" -v /app/node_modules dmforge

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker run failed! Port 5173 might be in use by another application.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo    SUCCESS! Opening browser to http://localhost:5173
echo ===================================================
echo.
start http://localhost:5173
echo.
echo Hot-patching is active! 
echo Any changes you make to your local code files will automatically 
echo sync and reload in the browser without restarting this container.
echo.
echo You can now close this window.
timeout /t 5
