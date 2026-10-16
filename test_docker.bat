@echo off
title Alphabet Safari - Docker Test & Launch Suite
cd /d "%~dp0"

echo ======================================================================
echo    ALPHABET SAFARI DOCKER TESTING & DEPLOYMENT SUITE
echo ======================================================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker was not detected in PATH.
    echo     Please ensure Docker Desktop is installed and running on Windows.
    echo     Download: https://www.docker.com/products/docker-desktop/
    echo.
    echo In the meantime, you can test locally with:
    echo   - Local web server: py -m http.server 8085
    echo   - Browser URL     : http://localhost:8085
    echo.
    pause
    exit /b 1
)

echo [1/2] Building Nginx Docker image...
docker compose build

if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker build encountered an error.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting containerized Alphabet Safari app...
docker compose up -d

echo.
echo ======================================================================
echo  [+] Alphabet Safari running in Docker:
echo      - Web App URL : http://localhost:8085
echo ======================================================================
echo  To stop container: docker compose down
echo ======================================================================
pause
