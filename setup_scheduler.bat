@echo off
REM Optional: Windows Task Scheduler setup for SportsApp
REM NOTE: Your app now auto-fetches on startup by default!
REM This script is OPTIONAL for users who want additional scheduled updates

echo ==========================================
echo SportsApp - Optional Scheduled Updates
echo ==========================================
echo.

echo ℹ️  NOTICE: Your SportsApp already auto-fetches on startup!
echo ℹ️  This scheduled task setup is OPTIONAL.
echo.
echo Your app currently:
echo ✅ Auto-fetches fresh matches every time you start it
echo ✅ Auto-refreshes every 2 hours while running
echo ✅ Cleans up old matches automatically
echo.
echo This script adds:
echo 📅 Daily background updates even when app is closed
echo 🕐 Runs at 2:00 AM every day
echo 🔄 Keeps data fresh for faster startup
echo.

set /p continue="Do you want to add scheduled background updates? (Y/N): "

if /i not "%continue%"=="Y" (
    echo.
    echo ⏭️ Skipping scheduled task setup
    echo Your app will continue to work perfectly with startup auto-fetch!
    echo.
    echo To use your app:
    echo 1. Just run: npm start
    echo 2. App fetches fresh matches automatically
    echo 3. Use manual refresh button if needed
    echo.
    pause
    exit /b 0
)

echo.
echo 📅 Setting up optional background updates...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo ✅ Running with Administrator privileges
echo.

REM Set variables
set TASK_NAME=SportsApp-BackgroundUpdate
set SCRIPT_PATH=C:\svn\bitbucket\SportsApp\cleanup.bat
set LOG_PATH=C:\svn\bitbucket\SportsApp\logs\task_scheduler.log

REM Check if the cleanup script exists
if not exist "%SCRIPT_PATH%" (
    echo ❌ Error: Cleanup script not found at %SCRIPT_PATH%
    echo Please ensure the SportsApp is properly installed.
    pause
    exit /b 1
)

echo 📅 Creating optional scheduled task: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Schedule: Daily at 2:00 AM (background updates)
echo.

REM Delete existing task if it exists
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo 🗑️  Removing existing task...
    schtasks /delete /tn "%TASK_NAME%" /f >nul
)

REM Create the scheduled task
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "%SCRIPT_PATH%" ^
    /sc daily ^
    /st 02:00 ^
    /ru "NT AUTHORITY\SYSTEM" ^
    /rl highest ^
    /f

if %errorlevel% equ 0 (
    echo ✅ Optional scheduled task created successfully!
    echo.
    echo Task Details:
    echo - Name: %TASK_NAME%
    echo - Runs: Daily at 2:00 AM (background)
    echo - Script: %SCRIPT_PATH%
    echo - User: NT AUTHORITY\SYSTEM
    echo.
    
    REM Display the created task
    echo 📋 Task information:
    schtasks /query /tn "%TASK_NAME%" /fo list
    
) else (
    echo ❌ Failed to create scheduled task!
    echo Error code: %errorlevel%
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Optional Setup Complete!
echo ==========================================
echo.
echo Your SportsApp now has TWO update methods:
echo.
echo 🚀 PRIMARY (Always works):
echo   - Auto-fetch on startup (already enabled)
echo   - Auto-refresh every 2 hours while running
echo   - Manual refresh buttons in the app
echo.
echo 📅 SECONDARY (Just added):
echo   - Background update at 2:00 AM daily
echo   - Keeps data fresh even when app is closed
echo   - Faster startup times
echo.
echo Normal usage:
echo 1. Start your app: npm start
echo 2. Fresh matches appear automatically
echo 3. Background task keeps data updated overnight
echo.
echo To view/manage the background task:
echo 1. Open Task Scheduler (taskschd.msc)
echo 2. Look for: %TASK_NAME%
echo.
echo To remove the background task:
echo   schtasks /delete /tn "%TASK_NAME%" /f
echo.

echo Press any key to exit...
pause >nul
