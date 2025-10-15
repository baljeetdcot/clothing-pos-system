@echo off
echo ========================================
echo POS Database Migration Fix
echo ========================================
echo.

echo This script will fix the database migration issue.
echo The app is looking for the database in the wrong location.
echo.

REM Get the current user's AppData path
set "USERPROFILE=%USERPROFILE%"
set "APPDATA_PATH=%USERPROFILE%\AppData\Roaming\clothing-pos"

echo Creating database directory: %APPDATA_PATH%
if not exist "%APPDATA_PATH%" (
    mkdir "%APPDATA_PATH%"
    echo Directory created successfully.
) else (
    echo Directory already exists.
)

echo.
echo Checking for database files...

REM Check if pos_database.db exists in current directory
if exist "pos_database.db" (
    echo Found pos_database.db in current directory.
    echo Copying to correct location...
    copy "pos_database.db" "%APPDATA_PATH%\pos-database.db"
    if %errorlevel% equ 0 (
        echo Database copied successfully!
        echo.
        echo The database is now in the correct location:
        echo %APPDATA_PATH%\pos-database.db
    ) else (
        echo ERROR: Failed to copy database file.
        pause
        exit /b 1
    )
) else (
    echo ERROR: pos_database.db not found in current directory.
    echo Please make sure you're running this script from the project folder.
    echo.
    echo Current directory: %CD%
    echo.
    echo Files in current directory:
    dir /b *.db
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migration Fix Complete!
echo ========================================
echo.
echo Your POS app should now show all the data from the source PC.
echo.
echo Database location: %APPDATA_PATH%\pos-database.db
echo.
echo You can now start the POS application:
echo   npm run electron-dev
echo.
pause
