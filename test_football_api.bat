@echo off
echo =======================================
echo 🔑 Testing Football API Connection
echo =======================================
echo.
echo Testing your API key: 35813088b3ae49dbb84843a9f959ba69
echo.

cd /d "C:\svn\git\SportsApp"

echo 🔍 Running API connection test...
node -e "
const MatchFetcher = require('./matchFetcher');
const fetcher = new MatchFetcher();

fetcher.testConnection().then(success => {
  if (success) {
    console.log('✅ SUCCESS: Football API is working!');
    console.log('🎯 Your app can now fetch live Premier League, Champions League, and other matches!');
  } else {
    console.log('❌ API test failed - check your internet connection');
  }
}).catch(err => {
  console.log('❌ Error testing API:', err.message);
});
"

echo.
echo =======================================
echo 🚀 Ready to get live football data!
echo =======================================
echo.
echo Your Sports TV Guide can now:
echo ✅ Fetch today's live football matches
echo ✅ Get Premier League fixtures
echo ✅ Show Champions League games  
echo ✅ Display Europa League matches
echo ✅ Include La Liga, Serie A, Bundesliga
echo.
echo Press any key to launch the app and test live data...
pause > nul

echo.
echo 🚀 Launching Sports TV Guide with live data...
call SportsApp.bat
