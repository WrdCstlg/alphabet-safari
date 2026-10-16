@echo off
title Alphabet Safari Windows Launcher
cd /d "%~dp0"
echo Starting Alphabet Safari Windows Native App...
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    py sync_assets.py
    py windows/alphabet_safari_app.py
) else (
    python sync_assets.py
    python windows/alphabet_safari_app.py
)
