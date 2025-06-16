@echo off
echo ==============================================
echo     UFC SCHEDULE INTEGRATION TEST
echo ==============================================
echo.

echo 🥊 Testing UFC schedule integration for both local and Netlify environments...
echo.

node test_ufc_integration.js

echo.
echo ==============================================
echo     TEST COMPLETE
echo ==============================================
echo.

if %errorlevel% equ 0 (
    echo ✅ UFC integration is working correctly!
    echo.
    echo Your SportsApp now has:
    echo   📺 Football matches from live-footballontv.com
    echo   🥊 UFC events from TheSportsDB + accurate fallback
    echo   🌐 Netlify Functions for web deployment
    echo   💻 Local development support
    echo.
    echo Ready to use:
    echo   - npm start ^(for desktop app^)
    echo   - Deploy to Netlify ^(for web app^)
    echo.
) else (
    echo ❌ Some UFC integration tests failed.
    echo Check the output above for details.
    echo.
)

pause
