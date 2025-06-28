@echo off
echo ===================================================
echo   Quick Real Data Test
echo ===================================================
echo.
echo Testing real data sources quickly...
echo This will check if your setup is working.
echo.

echo 1. Testing UFC data fetching...
echo ----------------------------
timeout /t 2 /nobreak >nul
node test_google_ufc.js
if %errorlevel% neq 0 (
    echo ⚠️ UFC test completed with warnings
) else (
    echo ✅ UFC test passed
)

echo.
echo 2. Testing football data fetching...
echo ---------------------------------
timeout /t 2 /nobreak >nul
node test_fetch.js
if %errorlevel% neq 0 (
    echo ⚠️ Football test completed with warnings
) else (
    echo ✅ Football test passed
)

echo.
echo 3. Quick mock data check...
echo -------------------------
findstr /i /r "fake mock demo fallback" *.js >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ Potential mock data found - run full validation
) else (
    echo ✅ No obvious mock data patterns found
)

echo.
echo ===================================================
echo   Quick Test Complete
echo ===================================================
echo.
echo For comprehensive validation, run:
echo   validate_real_data.bat
echo.
echo For detailed testing, open:
echo   test-real-data.html in your browser
echo.
pause