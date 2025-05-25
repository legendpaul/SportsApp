@echo off
REM Quick test after API setup - now includes UFC testing

echo ==========================================
echo SportsApp - Quick Sports Data Test
echo ==========================================
echo.

echo 🔍 Testing Football API connection...
node test_api.js

echo.
echo 🥊 Testing UFC API connection...
node test_ufc_api.js

echo.
echo 📥 Testing football match fetching...
node test_fetch.js

echo.
echo 🥊 Testing UFC event fetching...
node test_ufc_fetch.js

echo.
echo 🚀 Testing complete sports data update...
node test_full.js

echo.
echo ==========================================
echo Quick Sports Test Complete!
echo ==========================================
echo.

echo If all tests passed, your system is ready!
echo.
echo Your app now auto-fetches:
echo ⚽ Football matches (Premier League, Champions League, etc.)
echo 🥊 UFC events (upcoming and recent events)
echo.
echo To setup optional daily automation:
echo   setup_scheduler.bat (run as Administrator)
echo.
echo To test manually anytime:
echo   cleanup.bat manual
echo.
echo To start your app with auto-fetch:
echo   npm start
echo.

pause
