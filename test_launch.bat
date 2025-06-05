@echo off
echo =======================================
echo Quick Launch Test
echo =======================================
echo.

cd /d "C:\svn\git\SportsApp"
echo Current directory: %CD%
echo.

echo Checking Node.js installation...
where node
if %errorlevel% neq 0 (
    echo Node.js not found in PATH. Please install Node.js.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Node.js version:
node --version

echo.
echo NPM version:
npm --version

echo.
echo Checking package.json...
if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json missing
    pause
    exit /b 1
)

echo.
echo Checking node_modules...
if exist node_modules (
    echo ✅ node_modules directory found
) else (
    echo ❌ node_modules missing - running npm install...
    npm install
)

echo.
echo Checking main entry point...
if exist main.js (
    echo ✅ main.js found
) else (
    echo ❌ main.js missing
    pause
    exit /b 1
)

echo.
echo Launching app...
npm start

pause
