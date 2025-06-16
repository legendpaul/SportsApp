// Force cache refresh and test function URLs
console.log('🔄 FORCE REFRESH - Clearing caches and testing function URLs');

// Clear all caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log(`Deleted cache: ${cacheName}`);
    });
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cleared localStorage and sessionStorage');

// Wait for app to load and test function URLs
setTimeout(() => {
  if (window.sportsApp && window.sportsApp.testFootballFunctionUrls) {
    console.log('🧪 Testing function URLs...');
    const urls = window.sportsApp.testFootballFunctionUrls();
    console.log('Function URLs:', urls);
    
    if (urls.primary && urls.primary.includes('fetch-football-api')) {
      console.error('❌ STILL USING WRONG FUNCTION! Should be fetch-football, not fetch-football-api');
      console.log('💡 Try: Hard refresh (Ctrl+F5) or clear browser cache completely');
    } else if (urls.primary && urls.primary.includes('fetch-football')) {
      console.log('✅ Using correct function: fetch-football');
    } else {
      console.warn('⚠️ Unexpected function URL:', urls.primary);
    }
  } else {
    console.log('⏳ App not loaded yet, waiting...');
    setTimeout(() => {
      if (window.sportsApp) {
        const urls = window.sportsApp.testFootballFunctionUrls();
        console.log('Function URLs (delayed):', urls);
      }
    }, 2000);
  }
}, 1000);

// Instructions for user
console.log(`
🔧 CACHE CLEARING INSTRUCTIONS:
1. Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) for hard refresh
2. Or go to DevTools → Application → Clear Storage → Clear site data
3. Or try incognito/private browsing mode
4. Then reload the page and test again

💡 After refreshing, run this in console to test:
window.sportsApp.testFootballFunctionUrls()
`);
