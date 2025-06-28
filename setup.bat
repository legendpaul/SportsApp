@echo off
echo ===================================================
echo   UK Sports TV Guide - Setup Helper
echo ===================================================
echo.
echo This script will help you set up your Real Data
echo Sports App for the first time.
echo.
pause

echo.
echo Step 1: Checking Node.js installation...
echo ========================================
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Make sure to add it to your PATH during installation.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

echo.
echo Step 2: Installing dependencies...
echo =================================
echo Installing required packages...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Please check your internet connection and try again.
    pause
    exit /b 1
) else (
    echo ✅ Dependencies installed successfully
)

echo.
echo Step 3: Checking environment setup...
echo ====================================
if exist .env (
    echo ✅ .env file exists
) else (
    echo 📝 Creating .env file from template...
    copy .env.example .env >nul
    echo ✅ .env file created from template
    echo.
    echo ⚠️ IMPORTANT: Edit .env file and add your API keys!
    echo.
    echo Required for UFC data:
    echo - GOOGLE_API_KEY
    echo - SEARCH_ENGINE_ID
    echo.
    echo Optional for enhanced football data:
    echo - FOOTBALL_DATA_API_KEY
    echo - API_FOOTBALL_KEY
    echo.
    echo See .env file for setup instructions.
)

echo.
echo Step 4: Testing basic functionality...
echo =====================================
echo Running quick validation...
node verify_no_mock_data.js
if %errorlevel% neq 0 (
    echo ⚠️ Validation completed with warnings - this is normal for initial setup
) else (
    echo ✅ Basic validation passed
)

echo.
echo ===================================================
echo   Setup Complete!
echo ===================================================
echo.
echo Your Real Data Sports App is now set up.
echo.
echo Next steps:
echo 1. Edit .env file with your API keys (see .env.example)
echo 2. Run 'quick_test_real_data.bat' to test functionality
echo 3. Open 'test-real-data.html' in your browser for detailed testing
echo 4. Run 'validate_real_data.bat' before deployment
echo.
echo To start the app:
echo - Web version: Run 'npm run serve' then open http://localhost:8000
echo - Desktop version: Run 'npm start'
echo.
echo For more information, see:
echo - REAL_DATA_IMPLEMENTATION.md
echo - DEPLOYMENT_CHECKLIST.md
echo.
pause