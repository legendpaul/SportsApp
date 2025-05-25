@echo off
REM SportsApp API Setup Script - Football + UFC Auto-Fetch

echo ==========================================
echo SportsApp - Sports Data Integration Setup
echo ==========================================
echo.

echo This script will configure automatic sports data fetching
echo that runs every time you start the SportsApp.
echo.
echo ⚽ Football: Football-Data.org API (requires free API key)
echo 🥊 UFC: TheSportsDB API (free, no API key required)
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js is available
echo.

REM Check if we're in the right directory
if not exist "matchFetcher.js" (
    echo ❌ Error: matchFetcher.js not found
    echo Please run this script from the SportsApp directory
    pause
    exit /b 1
)

if not exist "ufcFetcher.js" (
    echo ❌ Error: ufcFetcher.js not found
    echo Please ensure UFC fetcher is installed
    pause
    exit /b 1
)

echo 📍 Current directory: %CD%
echo.

echo ==========================================
echo Step 1: Football API Setup
echo ==========================================
echo.
echo For football matches, you need a free API key from:
echo https://www.football-data.org/client/register
echo.
echo Free tier includes:
echo - 10 requests per minute
echo - 10 competitions including Premier League, Champions League
echo - Perfect for personal use
echo.

set /p api_key="Enter your Football API key (or 'skip' to configure later): "

if /i "%api_key%"=="skip" (
    echo ⏭️ Skipping football API setup - you can configure it later
    echo Edit matchFetcher.js and replace 'YOUR_API_KEY_HERE'
    goto :test_ufc
)

if "%api_key%"=="" (
    echo ❌ No API key provided
    goto :test_ufc
)

echo.
echo 🔧 Configuring football API key...

REM Update the API key in matchFetcher.js using PowerShell
powershell -Command "$content = Get-Content 'matchFetcher.js' -Raw; $content = $content -replace 'YOUR_API_KEY_HERE', '%api_key%'; Set-Content 'matchFetcher.js' $content"

if %errorlevel% equ 0 (
    echo ✅ Football API key configured successfully
) else (
    echo ❌ Failed to configure API key automatically
    echo Please manually edit matchFetcher.js and replace 'YOUR_API_KEY_HERE' with your key
)

:test_ufc
echo.
echo ==========================================
echo Step 2: Testing API Connections
echo ==========================================
echo.

echo 🔍 Testing Football API connection...
node test_api.js

if %errorlevel% equ 0 (
    echo ✅ Football API connection test passed
    set FOOTBALL_WORKING=true
) else (
    echo ❌ Football API connection test failed
    echo.
    echo Possible issues:
    echo 1. Invalid API key
    echo 2. Network connection problems
    echo 3. API rate limit exceeded
    echo.
    set FOOTBALL_WORKING=false
)

echo.
echo 🥊 Testing UFC API connection...
node test_ufc_api.js

if %errorlevel% equ 0 (
    echo ✅ UFC API connection test passed
    set UFC_WORKING=true
) else (
    echo ❌ UFC API connection test failed
    echo Check your internet connection
    set UFC_WORKING=false
)

echo.
echo ==========================================
echo Step 3: Test Data Fetching
echo ==========================================
echo.

if "%FOOTBALL_WORKING%"=="true" (
    echo ⚽ Testing football match fetching...
    node test_fetch.js
    
    if %errorlevel% equ 0 (
        echo ✅ Football match fetching test passed
    ) else (
        echo ❌ Football match fetching test failed
    )
) else (
    echo ⏭️ Skipping football fetch test due to API connection issues
)

echo.

if "%UFC_WORKING%"=="true" (
    echo 🥊 Testing UFC event fetching...
    node test_ufc_fetch.js
    
    if %errorlevel% equ 0 (
        echo ✅ UFC event fetching test passed
    ) else (
        echo ❌ UFC event fetching test failed
    )
) else (
    echo ⏭️ Skipping UFC fetch test due to API connection issues
)

echo.
echo ==========================================
echo Step 4: Complete System Test
echo ==========================================
echo.

set /p run_test="Run a complete test now (fetch football + UFC + cleanup)? (Y/N): "

if /i "%run_test%"=="Y" (
    echo 🚀 Running complete sports data test...
    echo.
    node test_full.js
    echo.
    echo ✅ Complete test finished
) else (
    echo ⏭️ Skipping complete test
)

echo.
echo ==========================================
echo Setup Summary
echo ==========================================
echo.

if "%FOOTBALL_WORKING%"=="true" (
    echo ✅ Football Integration: WORKING
) else (
    echo ❌ Football Integration: NOT WORKING
)

if "%UFC_WORKING%"=="true" (
    echo ✅ UFC Integration: WORKING
) else (
    echo ❌ UFC Integration: NOT WORKING
)

if "%FOOTBALL_WORKING%"=="true" (
    if "%UFC_WORKING%"=="true" (
        echo.
        echo 🎉 BOTH SPORTS APIs ARE WORKING!
        echo ✅ Startup Auto-fetch: ENABLED
        echo.
        echo Your SportsApp will now automatically:
        echo 1. 🚀 Fetch fresh sports data every time you start the app
        echo 2. ⚽ Get football matches from 10+ major leagues
        echo 3. 🥊 Get UFC events and fight cards
        echo 4. 🧹 Clean up old matches and events (older than 3 hours)
        echo 5. 🔄 Auto-refresh every 2 hours while running
        echo 6. 📝 Log all activities
        echo.
        echo How it works:
        echo - Start your SportsApp normally: npm start
        echo - App automatically checks for new data on startup
        echo - Fresh football and UFC data appears within seconds
        echo - Old data is cleaned up automatically
        echo.
        echo Manual controls available in the app:
        echo - 📥 Refresh Sports Data button
        echo - 🧹 Cleanup button
        echo.
        echo What you'll get:
        echo ⚽ FOOTBALL: Premier League, Champions League, La Liga, Serie A, etc.
        echo 🥊 UFC: Upcoming events, fight cards, venues, UK broadcast info
        echo.
    )
) else (
    echo.
    echo ⚠️ Setup incomplete
    echo.
    if "%FOOTBALL_WORKING%"=="false" (
        echo To fix football API:
        echo 1. Check your API key in matchFetcher.js
        echo 2. Ensure internet connection
        echo 3. Run this setup again
        echo.
    )
    if "%UFC_WORKING%"=="false" (
        echo To fix UFC API:
        echo 1. Check internet connection
        echo 2. Try running test_ufc_api.js manually
        echo.
    )
    echo The app will still work with manual data entry.
)

echo ==========================================
echo Setup Complete!
echo ==========================================
echo.

if "%FOOTBALL_WORKING%"=="true" (
    if "%UFC_WORKING%"=="true" (
        echo 🎉 Your SportsApp is now fully automated!
        echo.
        echo Next steps:
        echo 1. Start your SportsApp: npm start
        echo 2. Watch for "Checking for new sports data..." message
        echo 3. Fresh football and UFC data will appear automatically
        echo.
        echo The app covers:
        echo ⚽ Premier League, Champions League, Europa League
        echo ⚽ La Liga, Serie A, Bundesliga, Ligue 1
        echo ⚽ International competitions
        echo 🥊 UFC events, fight cards, UK broadcast times
        echo 📺 Accurate UK times and TV channels
        echo.
    )
) else (
    echo ⚠️ Some APIs need attention
    echo.
    echo You can still use the app - it will work with whatever APIs are functional.
    echo Re-run this script after fixing any API issues.
)

echo Press any key to exit...
pause >nul
