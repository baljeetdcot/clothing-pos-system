@echo off
echo Resetting dependencies to fix installation issues...
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Remove existing node_modules and package-lock.json
echo Cleaning existing dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

REM Install with legacy peer deps
echo Installing dependencies with legacy peer deps...
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo Trying with --force flag...
    call npm install --force
    if %errorlevel% neq 0 (
        echo Error: Still failed to install dependencies
        echo Please check your Node.js version (should be 16 or higher)
        pause
        exit /b 1
    )
)

echo.
echo Dependencies installed successfully!
echo You can now run: npm run electron-dev
echo.
pause
