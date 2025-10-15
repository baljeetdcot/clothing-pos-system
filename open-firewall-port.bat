@echo off
echo ========================================
echo Opening Firewall Port for POS System
echo ========================================
echo.

echo Adding firewall rule to allow port 3001...
netsh advfirewall firewall add rule name="POS System Port 3001" dir=in action=allow protocol=TCP localport=3001

if %errorlevel% equ 0 (
    echo.
    echo ✅ Firewall rule added successfully!
    echo Port 3001 is now open for network access.
) else (
    echo.
    echo ❌ Failed to add firewall rule.
    echo Please run this script as Administrator.
)

echo.
echo Note: You may need to run this script as Administrator.
pause
