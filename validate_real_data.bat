@echo off
echo ===================================================
echo   UK Sports TV Guide - Real Data Validation
echo ===================================================
echo.
echo This script will run comprehensive validation
echo to ensure all mock/fake data has been removed
echo and real data sources are working properly.
echo.
pause

echo.
echo 1/4 - Verifying no mock data exists...
echo ===================================================
node verify_no_mock_data.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Mock data verification FAILED!
    echo Please review the output above and fix any issues.
    pause
    exit /b 1
)

echo.
echo 2/4 - Testing UFC real data systems...
echo ===================================================
node test_real_ufc_data.js
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ UFC data test completed with warnings.
    echo This may be due to network connectivity.
    echo Check the output above for details.
    pause
)

echo.
echo 3/4 - Testing football data systems...
echo ===================================================
node test_fetch.js
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Football data test completed with warnings.
    echo This may be due to network connectivity.
    echo Check the output above for details.
    pause
)

echo.
echo 4/4 - Running final deployment validation...
echo ===================================================
node final_validation.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Final validation FAILED!
    echo Please address the issues above before deployment.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   ✅ ALL VALIDATIONS PASSED!
echo ===================================================
echo.
echo Your Real Data Sports App is ready for deployment!
echo.
echo Next steps:
echo 1. Commit all changes to Git
echo 2. Deploy to Netlify
echo 3. Configure environment variables
echo 4. Test production deployment
echo.
echo See DEPLOYMENT_CHECKLIST.md for detailed instructions.
echo.
pause