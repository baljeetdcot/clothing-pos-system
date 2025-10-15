@echo off
echo ========================================
echo POS System - Production Build Test
echo ========================================
echo.

echo This will build and test the production version locally.
echo This simulates what will run on DigitalOcean.
echo.

set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Test cancelled.
    pause
    exit /b 0
)

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Building React app for production...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Starting production server...
echo.
echo ========================================
echo Production Server Starting...
echo ========================================
echo.
echo Access your POS at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run server-prod

pause
