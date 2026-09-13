@echo off
title Food Safety Inspection Platform

echo Starting Food Safety Backend...
start "Food Safety Backend" cmd.exe /k "cd /d "%~dp0backend" && uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Food Safety Frontend...
start "Food Safety Frontend" cmd.exe /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 7 /nobreak >nul

echo Opening Food Safety Inspection Platform...
start "" "http://localhost:5173"

exit