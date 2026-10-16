@echo off
title Alphabet Safari Windows Launcher
cd /d "%~dp0"
echo Starting Alphabet Safari Windows Native App...
python sync_assets.py
python windows/alphabet_safari_app.py
if %ERRORLEVEL% NEQ 0 (
    echo Python launch encountered an issue. Trying with py launcher...
    py windows/alphabet_safari_app.py
)
