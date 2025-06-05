@echo off
echo =======================================
echo Football API Configuration Setup
echo =======================================
echo.
echo Your Sports TV Guide app needs a free API key to fetch live football data.
echo.
echo Steps to get your API key:
echo 1. Visit: https://www.football-data.org/client/register
echo 2. Sign up for a FREE account (no credit card required)
echo 3. Copy your API key from the dashboard
echo.
echo Free tier includes:
echo - 10 requests per minute
echo - 10 competitions (Premier League, Champions League, etc.)
echo - Perfect for personal use!
echo.
echo =======================================
echo.
set /p apikey="Paste your API key here (or press Enter to skip): "

if "%apikey%"=="" (
    echo.
    echo ⏭️ Skipping API setup - app will use sample data
    echo You can run this script again anytime to configure the API
    goto end
)

echo.
echo 🔑 Configuring API key...

:: Update the API key in matchFetcher.js
powershell -Command "(Get-Content 'matchFetcher.js') -replace 'YOUR_FOOTBALL_DATA_API_KEY_HERE', '%apikey%' | Set-Content 'matchFetcher.js'"

if %errorlevel% equ 0 (
    echo ✅ API key configured successfully!
    echo.
    echo Your app can now fetch live football data from Football-Data.org
    echo Run the app and click "Refresh Sports Data" to test it!
) else (
    echo ❌ Failed to configure API key
    echo Please manually edit matchFetcher.js and replace 'YOUR_FOOTBALL_DATA_API_KEY_HERE' with your key
)

:end
echo.
echo =======================================
echo Configuration complete!
echo =======================================
pause
