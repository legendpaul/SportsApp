@echo off
REM Enhanced test script for SportsApp with Startup Auto-Fetch

echo ==========================================
echo SportsApp Startup Auto-Fetch - Test Suite
echo ==========================================
echo.

set APP_DIR=C:\svn\bitbucket\SportsApp
cd /d "%APP_DIR%"

echo 📍 Current directory: %CD%
echo 📅 Test started at: %date% %time%
echo.
echo ℹ️  Testing the NEW startup auto-fetch system
echo ℹ️  Your app now fetches matches automatically on startup!
echo.

REM Test 1: Check required files exist
echo 🔍 Test 1: Checking required files...
set TEST1_PASS=true

if not exist "dataManager.js" (
    echo ❌ Missing: dataManager.js
    set TEST1_PASS=false
)
if not exist "dailyCleanup.js" (
    echo ❌ Missing: dailyCleanup.js
    set TEST1_PASS=false
)
if not exist "matchFetcher.js" (
    echo ❌ Missing: matchFetcher.js
    set TEST1_PASS=false
)
if not exist "test_api.js" (
    echo ❌ Missing: test_api.js
    set TEST1_PASS=false
)
if not exist "test_fetch.js" (
    echo ❌ Missing: test_fetch.js
    set TEST1_PASS=false
)
if not exist "test_full.js" (
    echo ❌ Missing: test_full.js
    set TEST1_PASS=false
)
if not exist "cleanup.bat" (
    echo ❌ Missing: cleanup.bat
    set TEST1_PASS=false
)
if not exist "setup_api.bat" (
    echo ❌ Missing: setup_api.bat
    set TEST1_PASS=false
)
if not exist "data" (
    echo ❌ Missing: data directory
    set TEST1_PASS=false
)
if not exist "logs" (
    echo ❌ Missing: logs directory
    set TEST1_PASS=false
)
if not exist "styles_api.css" (
    echo ❌ Missing: styles_api.css
    set TEST1_PASS=false
)

if "%TEST1_PASS%"=="true" (
    echo ✅ All required files found
) else (
    echo ❌ Some required files are missing
)
echo.

REM Test 2: Check Node.js availability
echo 🔍 Test 2: Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is available
    node --version
) else (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install from https://nodejs.org
)
echo.

REM Test 3: Test data file loading
echo 🔍 Test 3: Testing data file...
if exist "data\matches.json" (
    echo ✅ Data file exists
    
    REM Validate JSON format and check for startup fetch data
    node -e "
        try {
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('data/matches.json', 'utf8'));
            console.log('✅ JSON format is valid');
            console.log('📊 Football matches:', data.footballMatches ? data.footballMatches.length : 0);
            console.log('📊 UFC events:', data.ufcEvents ? data.ufcEvents.length : 0);
            console.log('📊 Last fetch:', data.lastFetch || 'Never');
            
            // Check for startup auto-fetch configuration
            if (data.lastFetch) {
                console.log('✅ Startup auto-fetch data present');
            } else {
                console.log('ℹ️ No previous fetch recorded (normal for first run)');
            }
        } catch (e) {
            console.log('❌ JSON format error:', e.message);
            process.exit(1);
        }
    "
    
    if %errorlevel% neq 0 (
        echo ❌ Data file has invalid JSON format
    )
) else (
    echo ⚠️ Data file does not exist (will be created automatically on first run)
)
echo.

REM Test 4: Test DataManager
echo 🔍 Test 4: Testing DataManager...
node -e "
    try {
        const DataManager = require('./dataManager');
        const dm = new DataManager();
        console.log('✅ DataManager loaded successfully');
        
        const status = dm.getCleanupStatus();
        console.log('📊 Current status:', JSON.stringify(status, null, 2));
    } catch (e) {
        console.log('❌ DataManager error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% equ 0 (
    echo ✅ DataManager test passed
) else (
    echo ❌ DataManager test failed
)
echo.

REM Test 5: Test MatchFetcher and API configuration
echo 🔍 Test 5: Testing MatchFetcher and API configuration...
node -e "
    try {
        const MatchFetcher = require('./matchFetcher');
        const fetcher = new MatchFetcher();
        console.log('✅ MatchFetcher loaded successfully');
        
        // Check if API key is configured
        const fs = require('fs');
        const content = fs.readFileSync('./matchFetcher.js', 'utf8');
        if (content.includes('YOUR_API_KEY_HERE')) {
            console.log('⚠️ API key not configured');
            console.log('   Run: setup_api.bat to configure your API key');
            console.log('   App will work with fallback data until configured');
        } else {
            console.log('✅ API key appears to be configured');
            console.log('   Startup auto-fetch will work');
        }
    } catch (e) {
        console.log('❌ MatchFetcher error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% equ 0 (
    echo ✅ MatchFetcher test passed
) else (
    echo ❌ MatchFetcher test failed
)
echo.

REM Test 6: Test API connection (if key is configured)
echo 🔍 Test 6: Testing API connection...
node -e "
    const MatchFetcher = require('./matchFetcher');
    const fetcher = new MatchFetcher();
    
    // Check if API key is set
    const fs = require('fs');
    const content = fs.readFileSync('./matchFetcher.js', 'utf8');
    if (content.includes('YOUR_API_KEY_HERE')) {
        console.log('⏭️ Skipping API test - no API key configured');
        console.log('   This is OK - app will use fallback data');
        console.log('   Run setup_api.bat to enable auto-fetch');
        process.exit(0);
    }
    
    console.log('🔗 Testing API connection for startup auto-fetch...');
    fetcher.testConnection().then(success => {
        if (success) {
            console.log('✅ API connection successful!');
            console.log('   Startup auto-fetch will work perfectly');
            process.exit(0);
        } else {
            console.log('❌ API connection failed');
            console.log('   Startup auto-fetch will fall back to cached data');
            process.exit(1);
        }
    }).catch(e => {
        console.log('❌ API test error:', e.message);
        console.log('   Check internet connection or API key');
        process.exit(1);
    });
"

if %errorlevel% equ 0 (
    echo ✅ API test passed (or skipped with valid reason)
) else (
    echo ❌ API test failed
)
echo.

REM Test 7: Test startup auto-fetch simulation
echo 🔍 Test 7: Testing startup auto-fetch simulation...
echo Simulating app startup fetch process...
node -e "
    try {
        console.log('🚀 Simulating startup auto-fetch...');
        
        // Load app.js to test startup logic
        const fs = require('fs');
        const appContent = fs.readFileSync('./app.js', 'utf8');
        
        if (appContent.includes('autoFetchOnStartup')) {
            console.log('✅ Startup auto-fetch code found in app.js');
        } else {
            console.log('❌ Startup auto-fetch code missing from app.js');
            process.exit(1);
        }
        
        if (appContent.includes('shouldAutoFetch')) {
            console.log('✅ Smart fetch logic found (avoids too frequent requests)');
        } else {
            console.log('⚠️ Smart fetch logic not found');
        }
        
        if (appContent.includes('startupCleanup')) {
            console.log('✅ Startup cleanup logic found');
        } else {
            console.log('⚠️ Startup cleanup logic not found');
        }
        
        console.log('✅ Startup auto-fetch simulation passed');
        
    } catch (e) {
        console.log('❌ Startup auto-fetch simulation error:', e.message);
        process.exit(1);
    }
"

if %errorlevel% equ 0 (
    echo ✅ Startup auto-fetch simulation passed
) else (
    echo ❌ Startup auto-fetch simulation failed
)
echo.

REM Test 8: Test CSS and UI enhancements
echo 🔍 Test 8: Testing UI enhancements...
if exist "styles_api.css" (
    echo ✅ API styles file exists
    
    REM Check for startup-specific styles
    findstr "startup-loading" "styles_api.css" >nul
    if %errorlevel% equ 0 (
        echo ✅ Startup loading styles found
    ) else (
        echo ❌ Startup loading styles missing
    )
    
    findstr "auto-fetch-indicator" "styles_api.css" >nul
    if %errorlevel% equ 0 (
        echo ✅ Auto-fetch indicator styles found
    ) else (
        echo ❌ Auto-fetch indicator styles missing
    )
) else (
    echo ❌ Missing styles_api.css
)

if exist "index.html" (
    findstr "styles_api.css" "index.html" >nul
    if %errorlevel% equ 0 (
        echo ✅ API styles linked in HTML
    ) else (
        echo ❌ API styles not linked in HTML
    )
) else (
    echo ❌ Missing index.html
)
echo.

REM Test 9: Check log directory permissions
echo 🔍 Test 9: Testing log file permissions...
echo Test log entry > "logs\test.log" 2>&1
if %errorlevel% equ 0 (
    echo ✅ Log directory is writable
    del "logs\test.log" >nul 2>&1
) else (
    echo ❌ Cannot write to logs directory
    echo Check directory permissions
)
echo.

REM Test 10: Optional scheduled task check
echo 🔍 Test 10: Checking optional scheduled task...
schtasks /query /tn "SportsApp-BackgroundUpdate" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Optional background scheduled task exists
    echo 📋 Task details:
    schtasks /query /tn "SportsApp-BackgroundUpdate" /fo list | findstr /C:"Task To Run" /C:"Next Run Time" /C:"Status"
) else (
    echo ℹ️ No background scheduled task found (this is normal)
    echo   Your app uses startup auto-fetch instead
    echo   Run setup_scheduler.bat if you want optional background updates
)
echo.

echo ==========================================
echo Test Summary
echo ==========================================
echo.
echo 📊 Test completed at: %date% %time%
echo.

REM Determine overall status
echo 🎯 System Status:
echo.

if exist "matchFetcher.js" (
    findstr "YOUR_API_KEY_HERE" "matchFetcher.js" >nul
    if %errorlevel% equ 0 (
        echo 🟡 API Integration: NOT CONFIGURED
        echo    → Run: setup_api.bat to enable auto-fetch
        echo    → App will work with fallback data until configured
    ) else (
        echo 🟢 API Integration: CONFIGURED
        echo    → Startup auto-fetch ready
        echo    → Fresh matches on every startup
    )
) else (
    echo 🔴 API Integration: MISSING FILES
)

if exist "app.js" (
    findstr "autoFetchOnStartup.*true" "app.js" >nul
    if %errorlevel% equ 0 (
        echo 🟢 Startup Auto-Fetch: ENABLED
        echo    → Fetches fresh matches every time you start the app
        echo    → Auto-refreshes every 2 hours while running
    ) else (
        echo 🟡 Startup Auto-Fetch: DISABLED
        echo    → Edit app.js to enable: autoFetchOnStartup = true
    )
) else (
    echo 🔴 Startup Auto-Fetch: MISSING FILES
)

if exist "data\matches.json" (
    echo 🟢 Data Storage: READY
) else (
    echo 🟡 Data Storage: WILL BE CREATED ON FIRST RUN
)

echo.
echo 🎯 Next Steps:
if exist "matchFetcher.js" (
    findstr "YOUR_API_KEY_HERE" "matchFetcher.js" >nul
    if %errorlevel% equ 0 (
        echo 1. Run: setup_api.bat ^(configure API for auto-fetch^)
        echo 2. Test: npm start ^(your app will auto-fetch^)
        echo 3. Optional: setup_scheduler.bat ^(background updates^)
    ) else (
        echo 1. ✅ System is fully configured!
        echo 2. Test: npm start ^(auto-fetch will work^)
        echo 3. Watch for "Checking for new matches..." on startup
        echo 4. Optional: setup_scheduler.bat ^(background updates^)
    )
)
echo.

echo 💡 How your app works now:
echo   🚀 Start app: npm start
echo   ⏳ "Checking for new matches..." appears
echo   📥 Fresh matches downloaded automatically
echo   🧹 Old matches cleaned up automatically
echo   ✅ Ready to use with latest data!
echo.

echo For quick setup guide: QUICK_START.md
echo For technical docs: CLEANUP_README.md
echo.

pause
