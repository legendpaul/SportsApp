@echo off
REM Safe Cleanup - Removes only test/debug/old files before git commit

echo.
echo ================================================================
echo SAFE CLEANUP - Removing Unnecessary Files
echo ================================================================
echo.
echo This will delete:
echo   - Test files (test_*.js, test_*.bat, test*.html)
echo   - Debug files (debug_*.js, debug_*.bat, debug*.html)
echo   - Old backup files (*_backup.js.removed, *_old.js)
echo   - Redundant documentation (old MD files)
echo   - Old scraper versions
echo   - Helper scripts created during integration
echo.
echo This will KEEP:
echo   - index.html, desktop-index.html
echo   - app.js, main.js, renderer.js
echo   - matchFetcher.js, ufcFetcher.js
echo   - tapologyUFCScraper321.js (NEW - the perfect scraper)
echo   - extractUFC321.js (reference)
echo   - styles.css, styles_api.css
echo   - All current documentation (README.md, QUICK_START.md, etc.)
echo   - package.json, netlify.toml
echo.

pause

cd /d "%~dp0"

set DELETE_COUNT=0

echo.
echo Removing test files...

REM Test HTML files
for %%f in (test-*.html test.html local-test.html direct-function-test.html function-test.html error-test.html cors-fixed.html x-frame-fix-test.html ufc_local_test.html verify-deployment.html success.html version-selector.html) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

REM Test JS files
for %%f in (test_*.js check_google_integration.js diagnose_scraping.js final_validation.js verify_no_mock_data.js verify_uk_times.js) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

REM Test batch files
for %%f in (test_*.bat quick_test*.bat validate_real_data.bat verify_*.bat demo.bat comprehensive_test.bat) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing debug files...

REM Debug files
for %%f in (debug-*.html debug_*.js debug_*.bat) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing backup files...

REM Backup files
for %%f in (*_backup.js.removed matchFetcher_original.js ufcFetcher_old_google.js app_backup.js.removed ufcFetcher_backup.js.removed) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing old scraper versions...

REM Old scrapers (keep tapologyUFCScraper321.js and extractUFC321.js)
for %%f in (tapologyUFCScraper.js tapologyUFCScraperV2.js getAllUFCFights.js force_ufc_update.js) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing old documentation...

REM Old documentation
for %%f in (CLEANUP_README.md DEMO_DATA_REMOVAL_COMPLETE.md DEPLOYMENT_FIXED.md FIXED_FEATURES_README.md JAVASCRIPT_ERROR_FIXED.md LIVE_DATA_DEPLOYMENT.md LIVE_DATA_FIXES_APPLIED.md NETLIFY_DEBUG_GUIDE.md NETLIFY_FIXES_COMPLETE.md NETLIFY_FIX_README.md NETLIFY_TROUBLESHOOTING.md REAL_DATA_IMPLEMENTATION.md SOLUTION_COMPLETE.md SUCCESS_CONFIRMATION.md UFC_INTEGRATION.md UFC_INTEGRATION_FIXED.md UFC_TIMING_FIX_DOCUMENTATION.md UK_START_TIMES_FIX.md UK_TIMEZONE_LIVE_SCORES_FIXED.md X_FRAME_NUCLEAR_FIX.md X_FRAME_OPTIONS_FIX.md) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing redundant batch files...

REM Redundant batch files
for %%f in (cleanup.bat QUICK_FIX_COMPLETE.bat TRANSPARENCY_ENHANCED.bat UFC_ACCURACY_FIXED.bat UFC_ENHANCEMENT_COMPLETE.bat check-headers.sh verify-demo-removal.sh) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing integration helper files (no longer needed)...

REM Integration helpers (can be deleted after integration is complete)
for %%f in (UFC321_METHODS_TO_ADD.js UFC321_STYLES_TO_APPEND.css fix_styles_css.bat fix_styles_css.ps1 append_ufc_styles.bat EMERGENCY_RESTORE_STYLES.bat) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing temporary cleanup scripts...

REM Temporary scripts
for %%f in (cleanup_ufc321_integration.bat ufc321_integration_helper.bat COMPLETE_UFC321_INTEGRATION.bat) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo Removing other utility files...

REM Other utilities
for %%f in (dailyCleanup.js performance_optimizer.js ufcDataIntegrator.js) do (
    if exist "%%f" (
        del /Q "%%f" 2>nul
        if not exist "%%f" (
            echo   [DELETED] %%f
            set /A DELETE_COUNT+=1
        )
    )
)

echo.
echo ================================================================
echo Cleanup Complete!
echo ================================================================
echo.
echo Total files deleted: %DELETE_COUNT%
echo.
echo KEPT (Production Files):
echo   Core:     index.html, desktop-index.html, app.js, main.js, renderer.js
echo   Fetchers: matchFetcher.js, ufcFetcher.js, tapologyUFCScraper321.js
echo   Styles:   styles.css, styles_api.css
echo   Config:   package.json, netlify.toml, _headers, _redirects
echo   Docs:     README.md, API_CONFIG_README.md, UFC_321_*.md
echo   Setup:    SportsApp.bat, setup.bat, auto_setup.bat
echo   Web:      web-*.js files (for Netlify)
echo   Data:     data folder
echo   Reference: extractUFC321.js (source of truth)
echo.
echo Ready to commit to git!
echo.
pause