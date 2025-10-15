@echo off
echo ========================================
echo   POS System - GitHub Deployment
echo ========================================
echo.

echo Step 1: Checking Git status...
git status
echo.

echo Step 2: Adding all files...
git add .
echo.

echo Step 3: Committing changes...
git commit -m "Deploy POS system to DigitalOcean App Platform"
echo.

echo Step 4: Pushing to GitHub...
echo Please make sure you have:
echo 1. Created a GitHub repository
echo 2. Added the remote origin
echo 3. Have GitHub credentials configured
echo.

set /p GITHUB_URL="Enter your GitHub repository URL (e.g., https://github.com/username/clothing-pos-system.git): "

if "%GITHUB_URL%"=="" (
    echo Error: GitHub URL is required
    pause
    exit /b 1
)

echo Adding remote origin...
git remote add origin %GITHUB_URL% 2>nul
git remote set-url origin %GITHUB_URL%

echo Pushing to GitHub...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! Code pushed to GitHub
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Go to https://cloud.digitalocean.com/apps
    echo 2. Click "Create App"
    echo 3. Connect your GitHub repository
    echo 4. Follow the deployment guide
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR: Failed to push to GitHub
    echo ========================================
    echo.
    echo Please check:
    echo 1. GitHub repository exists
    echo 2. You have push permissions
    echo 3. GitHub credentials are configured
    echo.
)

pause
