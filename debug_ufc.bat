@echo off
echo =======================================
echo 🔍 DEBUGGING UFC API - Finding Real Events
echo =======================================
echo.
echo Investigating why Erin Blanchfield vs Maycee Barber
echo event is not being returned...
echo.

cd /d "C:\svn\git\SportsApp"

echo 🔍 Running comprehensive UFC API test...
node debug_ufc_api.js

echo.
echo =======================================
echo 🔍 Analysis Complete
echo =======================================
echo.
echo The results above will show:
echo 1. What UFC events the API actually returns
echo 2. If June 2025 events exist in the database
echo 3. Whether specific fighter searches work
echo 4. Alternative search methods
echo.
echo Press any key to continue with fixing the UFC fetcher...
pause > nul
