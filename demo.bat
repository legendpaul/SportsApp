@echo off
REM Complete SportsApp Demo - Football + UFC Integration

echo ==========================================
echo SportsApp - Complete Sports Integration Demo
echo ==========================================
echo.

echo This demo shows your SportsApp fetching both:
echo ⚽ Football matches from Football-Data.org
echo 🥊 UFC events from TheSportsDB
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js required. Install from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js available
echo 📍 Directory: %CD%
echo.

echo ==========================================
echo Demo 1: API Connection Tests
echo ==========================================
echo.

echo 🔍 Testing Football API (Football-Data.org)...
node test_api.js
set FOOTBALL_STATUS=%errorlevel%

echo.
echo 🔍 Testing UFC API (TheSportsDB)...
node test_ufc_api.js
set UFC_STATUS=%errorlevel%

echo.
echo ==========================================
echo Demo 2: Data Fetching Tests
echo ==========================================
echo.

if %FOOTBALL_STATUS% equ 0 (
    echo ⚽ Fetching football matches...
    node test_fetch.js
    echo.
) else (
    echo ⚽ Skipping football fetch (API not working)
    echo.
)

if %UFC_STATUS% equ 0 (
    echo 🥊 Fetching UFC events...
    node test_ufc_fetch.js
    echo.
) else (
    echo 🥊 Skipping UFC fetch (API not working)
    echo.
)

echo ==========================================
echo Demo 3: Complete System Integration
echo ==========================================
echo.

echo 🚀 Running complete sports system test...
echo This combines football + UFC + cleanup:
echo.

node test_full.js

echo.
echo ==========================================
echo Demo 4: Data Structure Preview
echo ==========================================
echo.

echo 📊 Current data file contents:
if exist "data\matches.json" (
    echo.
    echo Football matches:
    node -e "
        try {
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));
            console.log('⚽ Football matches:', data.footballMatches.length);
            if (data.footballMatches.length > 0) {
                data.footballMatches.slice(0, 2).forEach(match => {
                    console.log('  - ' + match.teamA + ' vs ' + match.teamB + ' (' + match.competition + ')');
                });
            }
            console.log('🥊 UFC events:', data.ufcEvents.length);
            if (data.ufcEvents.length > 0) {
                data.ufcEvents.slice(0, 2).forEach(event => {
                    console.log('  - ' + event.title + ' (' + event.date + ')');
                });
            }
        } catch (e) {
            console.log('❌ Error reading data file:', e.message);
        }
    "
) else (
    echo ⚠️ No data file found - will be created on first run
)

echo.
echo ==========================================
echo Demo Complete!
echo ==========================================
echo.

if %FOOTBALL_STATUS% equ 0 (
    if %UFC_STATUS% equ 0 (
        echo 🎉 BOTH SPORTS APIs ARE WORKING!
        echo.
        echo Your SportsApp is ready for:
        echo ⚽ Automatic football match updates
        echo 🥊 Automatic UFC event updates  
        echo 🧹 Automatic cleanup of old events
        echo 🔄 Startup auto-fetch for fresh data
        echo.
        echo To start your app:
        echo   npm start
        echo.
        echo The app will automatically fetch fresh sports data on startup!
    ) else (
        echo ⚽ Football API working, 🥊 UFC API needs attention
        echo Your app will work with football data only
    )
) else (
    if %UFC_STATUS% equ 0 (
        echo 🥊 UFC API working, ⚽ Football API needs attention
        echo Your app will work with UFC data only
    ) else (
        echo ❌ Both APIs need attention
        echo.
        echo To fix:
        echo 1. Run setup_api.bat to configure APIs
        echo 2. Check internet connection
        echo 3. Verify API keys
    )
)

echo.
echo For detailed setup: setup_api.bat
echo For quick testing: quick_test.bat
echo For full documentation: QUICK_START.md
echo.

pause
