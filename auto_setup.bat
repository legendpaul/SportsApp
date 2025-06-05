@echo off
echo =======================================
echo UK Sports TV Guide - Auto Setup
echo =======================================
echo.
echo This script will setup the Sports TV Guide app automatically.
echo.

set appDir=C:\svn\git\SportsApp

echo Navigating to app directory...
cd "%appDir%"

echo.
echo Step 1: Installing Node.js dependencies...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to install dependencies!
    echo Please make sure Node.js is installed.
    echo Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Creating placeholder assets...
if not exist "assets\icon.png" (
    echo Creating placeholder icon...
    echo SPORTS TV > "assets\icon.png"
)

echo.
echo ✅ Setup complete!
echo.
echo You can now run the app using:
echo 1. Double-click SportsApp.bat
echo 2. Or run "npm start" in this directory
echo.
echo =======================================
echo Ready to launch Sports TV Guide!
echo =======================================
echo.
echo Would you like to start the app now? (Y/N)
set /p choice="Enter your choice: "

if /i "%choice%"=="Y" (
    echo.
    echo Launching Sports TV Guide...
    call npm start
) else (
    echo.
    echo Setup complete. Run SportsApp.bat to start the app later.
)

echo.
pause