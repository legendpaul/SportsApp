const DailyCleanup = require('./dailyCleanup');

console.log('🚀 Testing complete sports system (Football + UFC + Cleanup)...');
console.log('='.repeat(60));

const cleanup = new DailyCleanup();

async function runComprehensiveTest() {
  try {
    console.log('📊 Testing complete integrated system...');
    console.log('This test will:');
    console.log('1. ⚽ Fetch football matches from Football-Data.org');  
    console.log('2. 🥊 Fetch UFC events from TheSportsDB');
    console.log('3. 🧹 Clean up old events');
    console.log('4. 📝 Log all activities');
    console.log('');
    
    // Run full update
    const result = await cleanup.runFullUpdate();
    
    if (result.success) {
      console.log('\n🎉 COMPLETE SYSTEM TEST SUCCESSFUL!');
      console.log('='.repeat(50));
      console.log(`⚽ Football matches added: ${result.fetchedFootballMatches || 0}`);
      console.log(`🥊 UFC events added: ${result.fetchedUFCEvents || 0}`);
      console.log(`🗑️ Old events removed: ${result.removedEvents || 0}`);
      console.log(`📊 Total events remaining: ${result.totalRemaining || 0}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️ Some issues occurred:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('✅ No errors - all systems working perfectly!');
      }
      
      console.log('\n🎯 Your SportsApp is ready!');
      console.log('Start your app with: npm start');
      console.log('The app will auto-fetch sports data on startup.');
      
      process.exit(0);
    } else {
      console.log('\n❌ SYSTEM TEST FAILED');
      console.log('Check the errors above and fix any API issues.');
      if (result.error) {
        console.log('Main error:', result.error);
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.log('\n💥 UNEXPECTED ERROR during system test');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    process.exit(1);
  }
}

// Show initial status
console.log('📋 Initial system check...');
const DataManager = require('./dataManager');
const dataManager = new DataManager();
const initialStatus = dataManager.getCleanupStatus();

console.log(`Current data: ${initialStatus.totalMatches} football matches, ${initialStatus.totalUFCEvents} UFC events`);
console.log(`Last football fetch: ${initialStatus.lastFetch || 'Never'}`);
console.log(`Last UFC fetch: ${initialStatus.lastUFCFetch || 'Never'}`);
console.log(`Last cleanup: ${initialStatus.lastCleanup || 'Never'}`);
console.log('');

// Run the comprehensive test
runComprehensiveTest();
