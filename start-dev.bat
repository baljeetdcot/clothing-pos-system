@echo off
echo ========================================
echo POS System - Development Mode
echo ========================================
echo.

echo Starting React development server on port 3000...
echo Starting API server on port 3001...
echo.
echo Access your POS at: http://localhost:3000
echo.

echo Starting React development server...
start "React Dev Server" cmd /k "npm start"

echo Waiting 5 seconds for React server to start...
timeout /t 5 /nobreak >nul

echo Starting API server...
call npm run server
