@echo off
echo =======================================
echo UK Sports TV Guide - Setup Verification
echo =======================================
echo.

set appDir=C:\svn\bitbucket\SportsApp

echo Checking Sports TV Guide setup...
echo.

echo 📁 Checking directory: %appDir%
if exist "%appDir%" (
    echo ✅ App directory exists
) else (
    echo ❌ App directory missing
    goto :error
)

echo.
echo 📄 Checking essential files:

set files=package.json main.js index.html styles.css app.js SportsApp.bat auto_setup.bat README.md
for %%f in (%files%) do (
    if exist "%appDir%\%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ %%f MISSING
        set hasMissing=1
    )
)

echo.
echo 📁 Checking assets directory:
if exist "%appDir%\assets" (
    echo ✅ Assets directory exists
    if exist "%appDir%\assets\icon.png" (
        echo ✅ Icon placeholder exists
    ) else (
        echo ❌ Icon missing
    )
) else (
    echo ❌ Assets directory missing
)

echo.
echo 🔧 Checking Node.js:
where node >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Node.js is installed
    node --version
) else (
    echo ❌ Node.js not found
    echo    Download from: https://nodejs.org
    set hasNodeError=1
)

echo.
echo 📦 Checking dependencies:
if exist "%appDir%\node_modules" (
    echo ✅ Dependencies installed
) else (
    echo ⚠️  Dependencies not installed yet
    echo    Run auto_setup.bat to install
)

echo.
echo =======================================

if defined hasMissing (
    echo ❌ Setup incomplete - some files are missing
    goto :error
)

if defined hasNodeError (
    echo ❌ Node.js is required but not installed
    goto :error
)

echo ✅ Setup verification complete!
echo.
echo Your Sports TV Guide is ready to use:
echo 1. Run auto_setup.bat to install dependencies (if needed)
echo 2. Run SportsApp.bat to launch the application
echo.
goto :end

:error
echo.
echo ❌ Setup verification failed!
echo Please check the missing items above.
echo.

:end
echo Press any key to exit...
pause > nul