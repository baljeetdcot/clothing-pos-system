@echo off
echo ========================================
echo POS Production Setup
echo ========================================
echo.

echo This will build the React app for production mode.
echo After this, you can use the single-server mode.
echo.

set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Setup cancelled.
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
echo ========================================
echo Production Setup Complete!
echo ========================================
echo.
echo You can now use:
echo   - start-pos.bat (choose option 1 or 3)
echo   - Or directly: npm run server
echo.
echo Access your POS at: http://localhost:3001
echo Network access: http://[YOUR_IP]:3001
echo.
pause
