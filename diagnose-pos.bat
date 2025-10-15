@echo off
echo ========================================
echo POS System Diagnostic Tool
echo ========================================
echo.

echo Checking current processes...
echo.
echo Node.js processes:
tasklist | findstr node.exe
if %errorlevel% neq 0 (
    echo No Node.js processes running
)

echo.
echo Port status:
netstat -ano | findstr ":300" | findstr "LISTENING"
if %errorlevel% neq 0 (
    echo No servers listening on ports 3000/3001
)

echo.
echo Checking if build directory exists:
if exist "build" (
    echo Build directory found - Production mode available
) else (
    echo No build directory - Will use development mode
)

echo.
echo Checking package.json scripts:
echo.
echo Available npm scripts:
type package.json | findstr "scripts" -A 20

echo.
echo ========================================
echo Testing Server Startup
echo ========================================
echo.

echo Testing if npm run server works...
echo Starting server in background for 10 seconds...
start /b npm run server
timeout /t 10 /nobreak >nul

echo.
echo Checking if server started:
netstat -ano | findstr ":3001" | findstr "LISTENING"
if %errorlevel% equ 0 (
    echo ✅ Server started successfully on port 3001
) else (
    echo ❌ Server failed to start on port 3001
)

echo.
echo Killing test server...
taskkill /f /im node.exe >nul 2>&1

echo.
echo ========================================
echo Recommendations
echo ========================================
echo.

if exist "build" (
    echo 1. Use Production Mode (Option 1) - Single server on port 3001
    echo 2. Or use Development Mode (Option 2) - Two servers
) else (
    echo 1. Use Development Mode (Option 2) - Two servers
    echo 2. Or build first: npm run build, then use Production Mode
)

echo.
echo If inventory is empty, check:
echo - Server is running on port 3001
echo - Database file exists: pos_database.db
echo - Browser console for errors
echo.

pause
