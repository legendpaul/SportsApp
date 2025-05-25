const MatchFetcher = require('./matchFetcher');

console.log('🔍 Testing Football-Data.org API connection...');

const fetcher = new MatchFetcher();

fetcher.testConnection()
  .then(success => {
    if (success) {
      console.log('✅ API connection test successful!');
      process.exit(0);
    } else {
      console.log('❌ API connection test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('❌ API test error:', error.message);
    process.exit(1);
  });
