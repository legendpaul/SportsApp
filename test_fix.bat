@echo off
echo ========================================
echo    Testing UFC Fetcher Fix
echo ========================================
echo.
echo Testing if the "Invalid or unexpected token" errors are resolved...
echo.

node test_ufc_fix.js

echo.
echo ========================================
echo.
echo If you see "SUCCESS" above, the fix worked!
echo You can now run your Sports App normally.
echo.
pause
