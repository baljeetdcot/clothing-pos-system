@echo off
echo Installing Clothing Store POS System...
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

REM Install dependencies
echo Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    echo Trying alternative installation method...
    call npm install --force
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies even with --force
        pause
        exit /b 1
    )
)

REM Build the application
echo Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build application
    pause
    exit /b 1
)

REM Create distribution package
echo Creating installer...
call npm run dist
if %errorlevel% neq 0 (
    echo Error: Failed to create installer
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo The installer can be found in the 'dist' folder.
echo.
pause
