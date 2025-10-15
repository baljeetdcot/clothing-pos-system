@echo off
echo ========================================
echo POS System - Network Setup
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
echo Installing network dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Building React application...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR: Failed to build React application!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Network Setup Complete!
echo ========================================
echo.
echo The POS system is now ready for network access.
echo.
echo To start the server:
echo   1. Run: npm run server
echo   2. Access from this PC: http://localhost:3001
echo   3. Access from other PCs: http://[YOUR_IP]:3001
echo.
echo To find your IP address:
echo   - Windows: ipconfig
echo   - Look for "IPv4 Address" under your network adapter
echo.
echo Starting the server now...
echo Press Ctrl+C to stop the server
echo.

call npm run server

pause
