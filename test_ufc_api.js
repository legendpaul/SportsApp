const UFCFetcher = require('./ufcFetcher');

console.log('🔍 Testing UFC API connection with TheSportsDB...');

const fetcher = new UFCFetcher();

fetcher.testConnection()
  .then(success => {
    if (success) {
      console.log('✅ UFC API connection test successful!');
      console.log('🥊 TheSportsDB UFC API is working');
      process.exit(0);
    } else {
      console.log('❌ UFC API connection test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('❌ UFC API test error:', error.message);
    process.exit(1);
  });
