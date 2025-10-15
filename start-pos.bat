@echo off
echo ========================================
echo POS System Launcher
echo ========================================
echo.

echo Choose your deployment mode:
echo.
echo 1. Production Mode (Build + Serve) - Recommended
echo    - Single server on port 3001
echo    - Optimized performance
echo    - Access: http://localhost:3001
echo.
echo 2. Development Mode (Two Servers)
echo    - React dev server on port 3000
echo    - API server on port 3001
echo    - Access: http://localhost:3000
echo.
echo 3. Auto Mode (Smart Detection)
echo    - Uses production if build exists
echo    - Falls back to development mode
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" goto production
if "%choice%"=="2" goto development
if "%choice%"=="3" goto auto
goto invalid

:production
echo.
echo ========================================
echo Starting Production Mode
echo ========================================
echo.

echo Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Starting production server...
echo Access your POS at: http://localhost:3001
echo Network access: http://[YOUR_IP]:3001
echo.
call npm run server
goto end

:development
echo.
echo ========================================
echo Starting Development Mode
echo ========================================
echo.

echo Starting React development server...
start "React Dev Server" cmd /k "npm start"

echo Waiting 5 seconds for React server to start...
timeout /t 5 /nobreak >nul

echo Starting API server...
echo.
echo React app: http://localhost:3000
echo API server: http://localhost:3001
echo.
call npm run server
goto end

:auto
echo.
echo ========================================
echo Auto Mode - Smart Detection
echo ========================================
echo.

if exist "build" (
    echo Build directory found - using Production Mode
    echo.
    echo Starting production server...
    echo Access your POS at: http://localhost:3001
    echo Network access: http://[YOUR_IP]:3001
    echo.
    call npm run server
) else (
    echo No build directory - using Development Mode
    echo.
    echo Starting React development server...
    start "React Dev Server" cmd /k "npm start"
    
    echo Waiting 5 seconds for React server to start...
    timeout /t 5 /nobreak >nul
    
    echo Starting API server...
    echo.
    echo React app: http://localhost:3000
    echo API server: http://localhost:3001
    echo.
    call npm run server
)
goto end

:invalid
echo.
echo Invalid choice! Please run the script again and choose 1, 2, or 3.
pause
exit /b 1

:end
echo.
echo ========================================
echo POS System Started Successfully!
echo ========================================
pause
