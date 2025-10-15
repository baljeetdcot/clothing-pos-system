@echo off
echo Installing Clothing Store POS System (Simple Version)...
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Clean previous installation
echo Cleaning previous installation...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Install dependencies without better-sqlite3
echo Installing dependencies (excluding problematic packages)...
call npm install --legacy-peer-deps --ignore-scripts
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Install sqlite3 as alternative
echo Installing alternative database...
call npm install sqlite3 --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Warning: Could not install sqlite3, will use in-memory database
)

REM Build the application
echo Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build application
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo You can now run: npm run electron-dev
echo.
pause
