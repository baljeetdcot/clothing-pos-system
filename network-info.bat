@echo off
echo ========================================
echo POS System Network Information
echo ========================================
echo.

echo Getting your computer's IP addresses...
echo.

echo Local IP Addresses:
ipconfig | findstr "IPv4"

echo.
echo ========================================
echo Testing Port 3001 Accessibility
echo ========================================
echo.

echo Testing if port 3001 is listening...
netstat -an | findstr ":3001"

echo.
echo ========================================
echo Network Access URLs
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set ip=%%a
    set ip=!ip: =!
    echo Access from other devices: http://!ip!:3001
)

echo.
echo ========================================
echo Troubleshooting Tips
echo ========================================
echo.
echo 1. Make sure the POS server is running
echo 2. Check Windows Firewall settings
echo 3. Ensure both PCs are on the same network
echo 4. Try accessing from the same PC first: http://localhost:3001
echo 5. If using different networks, you may need port forwarding
echo.

pause
