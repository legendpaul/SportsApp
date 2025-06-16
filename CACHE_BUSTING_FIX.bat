@echo off
echo ========================================
echo    NETLIFY CACHE-BUSTING FIX
echo ========================================
echo.
echo PROBLEM IDENTIFIED: Your app is still calling the wrong Netlify function
echo due to browser caching of the old JavaScript files.
echo.
echo EVIDENCE FROM DEBUG REPORT:
echo - App is calling: fetch-football-api (WRONG - needs API keys)
echo - Should be calling: fetch-football (CORRECT - web scraping)
echo - Result: 0 matches found because no API keys configured
echo.

echo ========================================
echo    FIXES APPLIED:
echo ========================================
echo.
echo 1. Updated script versions (2.1.0 → 2.1.1) for cache busting
echo 2. Added function URL debugging to match fetcher
echo 3. Created cache testing tools
echo 4. Added manual test methods
echo.

echo ========================================
echo    DEPLOYMENT STEPS:
echo ========================================
echo.
echo 1. Commit and push these changes:
git add .
git commit -m "Fix: Cache busting for Netlify function URLs v2.1.1"
git push
echo.
echo 2. Wait for Netlify to redeploy (usually 1-2 minutes)
echo.

echo ========================================
echo    TESTING STEPS:
echo ========================================
echo.
echo 3. Test cache clearing:
echo    a) Visit: https://minnkasports.netlify.app/cache-test.html
echo    b) Check if it shows correct function URLs
echo    c) If still wrong, try hard refresh (Ctrl+F5)
echo.
echo 4. Alternative testing:
echo    a) Open incognito/private browsing window
echo    b) Visit your main site
echo    c) Open DevTools console and run:
echo       window.sportsApp.testFootballFunctionUrls()
echo.
echo 5. Manual cache clearing:
echo    a) DevTools → Application → Clear Storage
echo    b) Select "Clear site data"
echo    c) Refresh page
echo.

echo ========================================
echo    EXPECTED RESULTS:
echo ========================================
echo.
echo ✅ Primary Function: /.netlify/functions/fetch-football
echo ✅ Football matches should appear on your site
echo ✅ Debug logs should show successful data fetching
echo.
echo ❌ If still showing: /.netlify/functions/fetch-football-api
echo    Then browser cache is still cached - try incognito mode
echo.

echo ========================================
echo    TROUBLESHOOTING:
echo ========================================
echo.
echo If football data STILL doesn't work after cache clearing:
echo.
echo 1. Test individual functions:
echo    https://minnkasports.netlify.app/test-netlify-functions.html
echo.
echo 2. Check Netlify function logs:
echo    - Go to Netlify dashboard
echo    - Your site → Functions tab
echo    - Check for errors
echo.
echo 3. Send debug report:
echo    - Go to your main site
echo    - Open debug window
echo    - Copy debug logs
echo    - Include cache test results
echo.

echo ========================================
echo    FILES CREATED/UPDATED:
echo ========================================
echo.
echo ✅ web-matchfetcher.js (v2.1.1) - Fixed function URLs + logging
echo ✅ web-app.js (v2.1.1) - Added test methods
echo ✅ index.html - Updated script versions
echo ✅ cache-test.html - Cache busting tester
echo ✅ force-refresh-test.js - Console cache test script
echo.

pause
