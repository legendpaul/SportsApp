@echo off
echo.
echo ========================================
echo   SPORTS APP - FIXED VERSION TEST
echo ========================================
echo.
echo This test will:
echo 1. Test web scraping from live-footballontv.com
echo 2. Launch the app with debug window enabled
echo 3. Show channel filtering in action
echo.
echo Features to test:
echo - Debug window (4 tabs: Requests, Raw Data, Filtering, Display)
echo - Web scraping (replaces API)
echo - Channel filter checkboxes
echo - Select All / Clear All buttons
echo.

pause

echo.
echo Testing web scraping functionality...
echo.
node test_webscraping.js

echo.
echo ========================================
echo Starting Sports App...
echo ========================================
echo.
echo INSTRUCTIONS:
echo 1. Check the Debug Window at the bottom
echo 2. Click "Refresh Sports Data" to test web scraping
echo 3. Use the Channel Filter to hide/show matches
echo 4. Watch the debug logs update in real-time
echo.

npm start
