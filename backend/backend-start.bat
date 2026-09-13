@echo off
cd /d "%~dp0"

echo ========================================
echo   FOOD SAFETY - BACKEND
echo ========================================
echo.
echo Starting FastAPI server...
echo.

uvicorn main:app --reload

pause