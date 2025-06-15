@echo off
echo =====================================================
echo Testing New Web Scraping and Channel Filter Features
echo =====================================================
echo.

echo 1. Testing web scraping functionality...
node test_webscraping.js

echo.
echo 2. Starting the Sports App...
echo    - Check for new matches from live-footballontv.com
echo    - Test the channel filter at the bottom of the page
echo    - Use Select All / Clear All buttons
echo.

npm start
