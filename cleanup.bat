@echo off
REM SportsApp Manual Update Script
REM This script is for manual testing and operations
REM The app now auto-fetches football + UFC on startup, so this is mainly for testing

echo ==========================================
echo SportsApp Manual Operations
echo ==========================================
echo Starting manual operation at %date% %time%
echo.

REM Change to the SportsApp directory
cd /d "C:\svn\bitbucket\SportsApp"

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Determine what operation to run based on arguments
set operation=full
if /i "%1"=="fetch" set operation=fetch
if /i "%1"=="cleanup" set operation=cleanup
if /i "%1"=="test" set operation=test
if /i "%1"=="full" set operation=full
if /i "%1"=="manual" set operation=full

echo 📝 Note: Your app now auto-fetches football + UFC on startup!
echo 📝 This script is mainly for testing and manual operations.
echo.

echo 🚀 Running %operation% operation...
echo.

REM Run the appropriate operation
if "%operation%"=="fetch" (
    echo 📥 Testing sports data fetching...
    node test_full.js
) else if "%operation%"=="cleanup" (
    echo 🧹 Testing cleanup only...
    node -e "
        const DataManager = require('./dataManager');
        const dm = new DataManager();
        const result = dm.cleanupOldMatches();
        console.log('Cleanup result:', result);
    "
) else if "%operation%"=="test" (
    echo 🔍 Running complete system test...
    node quick_test.bat
) else (
    echo 📥🥊 Testing complete sports update (fetch football + UFC + cleanup)...
    node test_full.js
)

if %errorlevel% equ 0 (
    echo ✅ Operation completed successfully at %date% %time%
) else (
    echo ❌ Operation failed with error code %errorlevel%
)

echo.
echo ==========================================
echo Manual Operation Complete
echo ==========================================

REM Show usage help if manual
if /i "%1"=="manual" (
    echo.
    echo 💡 How your app works now:
    echo.
    echo 🚀 AUTOMATIC (Recommended):
    echo   - Start your SportsApp: npm start
    echo   - App automatically fetches fresh football + UFC data on startup
    echo   - Auto-refreshes every 2 hours while running
    echo   - Use 📥 Refresh button in app for instant updates
    echo.
    echo 🔧 MANUAL TESTING (This script):
    echo   cleanup.bat          - Test complete update (fetch football + UFC + cleanup)
    echo   cleanup.bat fetch    - Test sports data fetching only
    echo   cleanup.bat cleanup  - Test cleanup only
    echo   cleanup.bat test     - Run complete system test
    echo.
    echo ✨ TIP: Just use "npm start" for normal operation!
    echo     The app handles everything automatically now.
    echo.
)

REM Only pause if running manually (not from automated processes)
if /i "%1"=="manual" (
    echo Press any key to exit...
    pause >nul
)
