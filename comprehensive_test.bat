@echo off
REM Comprehensive SportsApp Test Suite - Football + UFC Integration

echo ==========================================
echo SportsApp Comprehensive Test Suite
echo ==========================================
echo.

set APP_DIR=C:\svn\bitbucket\SportsApp
cd /d "%APP_DIR%"

echo 📍 Current directory: %CD%
echo 📅 Test started at: %date% %time%
echo.
echo 🎯 Testing the complete Sports App system:
echo    ⚽ Football auto-fetch (Football-Data.org)
echo    🥊 UFC auto-fetch (TheSportsDB) 
echo    🧹 Automatic cleanup
echo    🚀 Startup integration
echo.

REM Test 1: Check all required files
echo 🔍 Test 1: Checking all required files...
set TEST1_PASS=true

set required_files=dataManager.js dailyCleanup.js matchFetcher.js ufcFetcher.js test_api.js test_ufc_api.js test_fetch.js test_ufc_fetch.js test_full.js cleanup.bat setup_api.bat

for %%f in (%required_files%) do (
    if not exist "%%f" (
        echo ❌ Missing: %%f
        set TEST1_PASS=false
    )
)

if exist "data" (
    echo ✅ Data directory exists
) else (
    echo ❌ Missing: data directory
    set TEST1_PASS=false
)

if exist "logs" (
    echo ✅ Logs directory exists  
) else (
    echo ❌ Missing: logs directory
    set TEST1_PASS=false
)

if "%TEST1_PASS%"=="true" (
    echo ✅ All required files found
) else (
    echo ❌ Some required files are missing
    echo Please ensure complete installation
)
echo.

REM Test 2: Node.js and basic functionality
echo 🔍 Test 2: Testing Node.js and basic functionality...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is available
    node --version
) else (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install from https://nodejs.org
    echo Cannot continue with remaining tests
    pause
    exit /b 1
)

REM Test basic module loading
node -e "
    try {
        const DataManager = require('./dataManager');
        const MatchFetcher = require('./matchFetcher');
        const UFCFetcher = require('./ufcFetcher');
        const DailyCleanup = require('./dailyCleanup');
        console.log('✅ All core modules load successfully');
    } catch (e) {
        console.log('❌ Module loading error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% neq 0 (
    echo ❌ Core module loading failed
    echo Please check for syntax errors in JavaScript files
    pause
    exit /b 1
)

echo ✅ Core modules load successfully
echo.

REM Test 3: Data file structure
echo 🔍 Test 3: Testing data file structure...
if exist "data\matches.json" (
    echo ✅ Data file exists
    
    node -e "
        try {
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));
            
            // Check structure
            if (Array.isArray(data.footballMatches)) {
                console.log('✅ Football matches array structure valid');
                console.log('📊 Football matches:', data.footballMatches.length);
            } else {
                console.log('❌ Invalid football matches structure');
            }
            
            if (Array.isArray(data.ufcEvents)) {
                console.log('✅ UFC events array structure valid');
                console.log('📊 UFC events:', data.ufcEvents.length);
            } else {
                console.log('❌ Invalid UFC events structure');
            }
            
            // Check timestamps
            console.log('📅 Last football fetch:', data.lastFetch || 'Never');
            console.log('📅 Last UFC fetch:', data.lastUFCFetch || 'Never');
            console.log('📅 Last cleanup:', data.lastCleanup || 'Never');
            
        } catch (e) {
            console.log('❌ Data file error:', e.message);
            process.exit(1);
        }
    "
    
    if %errorlevel% neq 0 (
        echo ❌ Data file has invalid structure
    )
) else (
    echo ⚠️ Data file does not exist (normal for first run)
    echo Will be created automatically
)
echo.

REM Test 4: API Configuration Check
echo 🔍 Test 4: Checking API configurations...

REM Check Football API key
node -e "
    const fs = require('fs');
    const content = fs.readFileSync('./matchFetcher.js', 'utf8');
    if (content.includes('YOUR_API_KEY_HERE')) {
        console.log('⚠️ Football API key not configured');
        console.log('   Run setup_api.bat to configure');
    } else {
        console.log('✅ Football API key appears configured');
    }
"

REM Check UFC fetcher
node -e "
    try {
        const UFCFetcher = require('./ufcFetcher');
        const fetcher = new UFCFetcher();
        console.log('✅ UFC fetcher initialized (no API key required)');
    } catch (e) {
        console.log('❌ UFC fetcher error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% neq 0 (
    echo ❌ UFC fetcher initialization failed
)
echo.

REM Test 5: API Connection Tests
echo 🔍 Test 5: Testing API connections...

echo 🔗 Testing Football API...
node test_api.js
if %errorlevel% equ 0 (
    echo ✅ Football API connection successful
    set FOOTBALL_API=working
) else (
    echo ❌ Football API connection failed
    set FOOTBALL_API=failed
)

echo.
echo 🔗 Testing UFC API...
node test_ufc_api.js
if %errorlevel% equ 0 (
    echo ✅ UFC API connection successful  
    set UFC_API=working
) else (
    echo ❌ UFC API connection failed
    set UFC_API=failed
)
echo.

REM Test 6: Data Fetching Tests
echo 🔍 Test 6: Testing data fetching capabilities...

if "%FOOTBALL_API%"=="working" (
    echo ⚽ Testing football data fetching...
    node test_fetch.js
    if %errorlevel% equ 0 (
        echo ✅ Football data fetching successful
    ) else (
        echo ❌ Football data fetching failed
    )
) else (
    echo ⏭️ Skipping football fetch test (API not working)
)

echo.

if "%UFC_API%"=="working" (
    echo 🥊 Testing UFC data fetching...
    node test_ufc_fetch.js
    if %errorlevel% equ 0 (
        echo ✅ UFC data fetching successful
    ) else (
        echo ❌ UFC data fetching failed
    )
) else (
    echo ⏭️ Skipping UFC fetch test (API not working)
)
echo.

REM Test 7: Integrated System Test
echo 🔍 Test 7: Testing complete integrated system...
echo 🚀 Running full system integration test...

node test_full.js
if %errorlevel% equ 0 (
    echo ✅ Complete system integration test passed
    set SYSTEM_TEST=passed
) else (
    echo ❌ Complete system integration test failed
    set SYSTEM_TEST=failed
)
echo.

REM Test 8: Cleanup and Data Management
echo 🔍 Test 8: Testing cleanup and data management...
node -e "
    try {
        const DataManager = require('./dataManager');
        const dm = new DataManager();
        
        console.log('🧹 Testing cleanup functionality...');
        const result = dm.cleanupOldMatches();
        
        if (result.success) {
            console.log('✅ Cleanup test passed');
            console.log('📊 Removed', result.removedCount, 'old events');
            console.log('📊 Remaining events:', result.remaining);
        } else {
            console.log('❌ Cleanup test failed');
            process.exit(1);
        }
    } catch (e) {
        console.log('❌ Cleanup error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% equ 0 (
    echo ✅ Cleanup and data management test passed
) else (
    echo ❌ Cleanup and data management test failed
)
echo.

REM Test 9: File Permissions and Logging
echo 🔍 Test 9: Testing file permissions and logging...
echo Test log entry > "logs\comprehensive_test.log" 2>&1
if %errorlevel% equ 0 (
    echo ✅ Log directory is writable
    del "logs\comprehensive_test.log" >nul 2>&1
) else (
    echo ❌ Cannot write to logs directory
    echo Check directory permissions
)

REM Test data directory write permissions
echo Test data > "data\test_write.json" 2>&1
if %errorlevel% equ 0 (
    echo ✅ Data directory is writable
    del "data\test_write.json" >nul 2>&1
) else (
    echo ❌ Cannot write to data directory
    echo Check directory permissions
)
echo.

REM Final Summary
echo ==========================================
echo COMPREHENSIVE TEST SUMMARY
echo ==========================================
echo.
echo 📊 Test completed at: %date% %time%
echo.

echo 🎯 API Status:
if "%FOOTBALL_API%"=="working" (
    echo ✅ Football API: WORKING
) else (
    echo ❌ Football API: FAILED
)

if "%UFC_API%"=="working" (
    echo ✅ UFC API: WORKING  
) else (
    echo ❌ UFC API: FAILED
)

echo.
echo 🎯 System Status:
if "%SYSTEM_TEST%"=="passed" (
    echo ✅ Integrated System: WORKING
) else (
    echo ❌ Integrated System: FAILED
)

echo.
echo 🎯 Overall Assessment:
if "%FOOTBALL_API%"=="working" (
    if "%UFC_API%"=="working" (
        if "%SYSTEM_TEST%"=="passed" (
            echo 🟢 EXCELLENT: Complete sports system operational
            echo    ⚽ Football auto-fetch ready
            echo    🥊 UFC auto-fetch ready  
            echo    🧹 Automatic cleanup working
            echo    🚀 Startup integration ready
            echo.
            echo 🎉 Your SportsApp is fully functional!
            echo.
            echo Next steps:
            echo 1. Start your app: npm start
            echo 2. Watch for "Checking for new sports data..." on startup
            echo 3. Enjoy automatic football + UFC updates!
        ) else (
            echo 🟡 GOOD: APIs working but system integration issues
        )
    ) else (
        echo 🟡 PARTIAL: Football working, UFC needs attention
    )
) else (
    if "%UFC_API%"=="working" (
        echo 🟡 PARTIAL: UFC working, Football needs attention
    ) else (
        echo 🔴 ATTENTION NEEDED: Both APIs require configuration
    )
)

echo.
echo 📋 Resources:
echo - Setup APIs: setup_api.bat
echo - Quick test: quick_test.bat  
echo - Demo: demo.bat
echo - Documentation: QUICK_START.md
echo.

pause
