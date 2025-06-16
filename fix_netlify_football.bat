@echo off
echo ========================================
echo    Fixing Netlify Football Data Issue
echo ========================================
echo.
echo This script will help fix your football match search issue on Netlify
echo.

echo Step 1: Updated web-matchfetcher.js to use the correct Netlify function
echo   - Changed from fetch-football-api (needs API keys) to fetch-football (web scraping)
echo   - Added fallback to try both functions
echo   - Improved error handling
echo.

echo Step 2: Created test tools
echo   - test-netlify-functions.html (browser-based function tester)
echo   - test_netlify_functions.js (console test script)
echo.

echo ========================================
echo    Next Steps for You:
echo ========================================
echo.
echo 1. Deploy your updated code to Netlify:
echo    - Commit the changes to git
echo    - Push to your repository
echo    - Netlify will automatically redeploy
echo.
echo 2. Test your Netlify functions:
echo    - Visit: https://your-site.netlify.app/test-netlify-functions.html
echo    - Click "Test All Functions"
echo    - Check which functions work
echo.
echo 3. Expected results:
echo    - fetch-football should work (scrapes live data)
echo    - fetch-football-api might fail (needs API keys)
echo    - fetch-ufc should work
echo.
echo 4. If you want to use API-based data (more reliable):
echo    - Get free API keys from:
echo      * https://www.football-data.org/ (free tier)
echo      * https://rapidapi.com/api-sports/api/api-football (free tier)
echo    - Add them as environment variables in Netlify:
echo      * FOOTBALL_DATA_API_KEY
echo      * API_FOOTBALL_KEY
echo.

echo ========================================
echo    Troubleshooting:
echo ========================================
echo.
echo If football data still doesn't work after deployment:
echo   1. Check the test page for function errors
echo   2. Look at Netlify function logs in your dashboard
echo   3. The web app will fall back to CORS proxy in local development
echo   4. Contact me with the test results for further help
echo.

pause
