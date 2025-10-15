@echo off
echo ========================================
echo Starting POS Network System
echo ========================================
echo.

echo Starting React development server...
start "React Server" cmd /k "npm start"

echo Waiting 10 seconds for React server to start...
timeout /t 10 /nobreak >nul

echo Starting Node.js API server...
start "API Server" cmd /k "npm run server"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo.
echo React app: http://localhost:3000
echo API server: http://localhost:3001
echo Network access: http://[YOUR_IP]:3001
echo.
echo Press any key to close this window...
pause >nul
