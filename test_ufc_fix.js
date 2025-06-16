// Quick test to verify the UFC fetcher fix
console.log('🧪 Testing UFC Fetcher initialization after fix...');

try {
  // Test loading the Google UFC scraper (this was failing before)
  const GoogleUFCScraper = require('./googleUFCScraper');
  console.log('✅ GoogleUFCScraper loaded successfully');
  
  // Test creating an instance
  const scraper = new GoogleUFCScraper();
  console.log('✅ GoogleUFCScraper instance created successfully');
  
  // Test loading the UFC Fetcher (this should now work)
  const UFCFetcher = require('./ufcFetcher');
  console.log('✅ UFCFetcher loaded successfully');
  
  // Test creating UFC Fetcher instance
  const ufcFetcher = new UFCFetcher();
  console.log('✅ UFCFetcher instance created successfully');
  
  console.log('\n🎉 SUCCESS: All modules loaded without JSON parsing errors!');
  console.log('The "Invalid or unexpected token" errors should be resolved.');
  console.log('\nThe app should now be able to:');
  console.log('- Initialize the UFC Fetcher properly');
  console.log('- Use Google search for UFC start times');
  console.log('- Fetch UFC data without errors');
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ Error during testing:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
