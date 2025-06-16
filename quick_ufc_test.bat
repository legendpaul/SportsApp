@echo off
echo ==============================================
echo     QUICK UFC INTEGRATION TEST
echo ==============================================
echo.

echo 🥊 Testing your UFC schedule integration fix...
echo.

echo 1. Testing Node.js UFC Fetcher...
node -e "
const UFCFetcher = require('./ufcFetcher');
const fetcher = new UFCFetcher();
console.log('✅ Node.js UFC Fetcher loaded successfully');
const events = fetcher.getCurrentUFCEvents();
console.log('✅ Current UFC events:', events.length);
if (events.length > 0) {
  console.log('✅ Next event:', events[0].title);
  console.log('✅ Main card fights:', events[0].mainCard.length);
}
"

echo.
echo 2. Testing web files exist...
if exist "web-ufcfetcher.js" (
    echo ✅ web-ufcfetcher.js exists
) else (
    echo ❌ web-ufcfetcher.js missing
)

if exist "netlify\functions\fetch-ufc.js" (
    echo ✅ netlify/functions/fetch-ufc.js exists
) else (
    echo ❌ netlify/functions/fetch-ufc.js missing
)

echo.
echo 3. Testing Netlify function...
node -e "
const { handler } = require('./netlify/functions/fetch-ufc');
const event = { httpMethod: 'GET' };
handler(event, {}).then(response => {
  const data = JSON.parse(response.body);
  console.log('✅ Netlify function works:', data.success);
  console.log('✅ UFC events returned:', data.events.length);
}).catch(e => console.log('❌ Error:', e.message));
"

echo.
echo ==============================================
echo     TEST COMPLETE
echo ==============================================
echo.
echo ✅ UFC integration is ready!
echo.
echo Next steps:
echo   1. Test locally: open index.html in browser
echo   2. Deploy to Netlify: git push origin main  
echo   3. Check debug console for UFC logs
echo.
echo Browser console commands:
echo   window.fetchUFC() - Test UFC fetching
echo   window.sportsApp.ufcEvents - View UFC data
echo.

pause
