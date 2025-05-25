@echo off
echo =======================================
echo UK Sports TV Guide - Simple Runner
echo =======================================
echo.
echo This script will run the Sports TV Guide app.
echo.

:: Create directory for log file
mkdir C:\temp 2>nul

:: Redirect all output to a log file for debugging
echo Running with full logging to C:\temp\sports_app_log.txt
echo Log started at %date% %time% > C:\temp\sports_app_log.txt
echo. >> C:\temp\sports_app_log.txt

echo Step 1: Checking environment... >> C:\temp\sports_app_log.txt
echo Current directory: %CD% >> C:\temp\sports_app_log.txt
echo PATH: %PATH% >> C:\temp\sports_app_log.txt
echo. >> C:\temp\sports_app_log.txt

set appDir=C:\svn\bitbucket\SportsApp

echo Step 2: Checking app directory... >> C:\temp\sports_app_log.txt
if exist "%appDir%" (
    echo App directory exists: %appDir% >> C:\temp\sports_app_log.txt
) else (
    echo App directory NOT found: %appDir% >> C:\temp\sports_app_log.txt
)
echo. >> C:\temp\sports_app_log.txt

echo Attempting to run Sports TV Guide...
echo. 

echo Step 3: Creating placeholder assets if needed... >> C:\temp\sports_app_log.txt
if not exist "%appDir%\assets" (
    echo Creating assets directory >> C:\temp\sports_app_log.txt
    mkdir "%appDir%\assets"
)

if not exist "%appDir%\assets\icon.png" (
    echo Creating placeholder icon >> C:\temp\sports_app_log.txt
    echo SPORTS > "%appDir%\assets\icon.png"
    echo Placeholder icon created >> C:\temp\sports_app_log.txt
) else (
    echo Icon file already exists >> C:\temp\sports_app_log.txt
)
echo. >> C:\temp\sports_app_log.txt

echo Step 4: Checking for node.exe... >> C:\temp\sports_app_log.txt
where node >> C:\temp\sports_app_log.txt 2>&1
echo Result of 'where node': %errorlevel% >> C:\temp\sports_app_log.txt
echo. >> C:\temp\sports_app_log.txt

echo Step 5: Attempting to run app... >> C:\temp\sports_app_log.txt
cd "%appDir%"
echo Changed to directory: %CD% >> C:\temp\sports_app_log.txt
echo. >> C:\temp\sports_app_log.txt

echo Checking if node_modules exists... >> C:\temp\sports_app_log.txt
if not exist "node_modules" (
    echo Installing dependencies... >> C:\temp\sports_app_log.txt
    echo Installing npm dependencies...
    call npm install >> C:\temp\sports_app_log.txt 2>&1
    echo Result of npm install: %errorlevel% >> C:\temp\sports_app_log.txt
) else (
    echo Dependencies already installed >> C:\temp\sports_app_log.txt
)
echo. >> C:\temp\sports_app_log.txt

echo Step 6: Launching Sports TV Guide... >> C:\temp\sports_app_log.txt
echo.
echo Launching UK Sports TV Guide...

:: Try to launch the app
echo Launching with npm start >> C:\temp\sports_app_log.txt
call npm start >> C:\temp\sports_app_log.txt 2>&1
echo Result: %errorlevel% >> C:\temp\sports_app_log.txt

if %errorlevel% neq 0 (
    echo.
    echo =======================================
    echo Error launching the app!
    echo Check the log file at:
    echo C:\temp\sports_app_log.txt
    echo.
    echo Common solutions:
    echo 1. Install Node.js from https://nodejs.org
    echo 2. Run "npm install" in the app directory
    echo 3. Check that all files are present
    echo =======================================
) else (
    echo.
    echo =======================================
    echo Sports TV Guide launched successfully!
    echo =======================================
)

echo.
echo Press any key to exit...
pause > nul