@echo off
echo ========================================
echo POS System Setup for New PC
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Choose the LTS version and restart this script.
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.
echo Starting the POS application...
echo The app will open in a new window.
echo.

call npm run electron-dev

pause
