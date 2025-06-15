// Quick test script for the fixed match fetcher
const MatchFetcher = require('./matchFetcher');

async function testFix() {
  console.log('🧪 Testing fixed match fetcher...\n');
  
  const fetcher = new MatchFetcher((category, message, data) => {
    console.log(`[${category.toUpperCase()}] ${message}`);
    if (data && typeof data === 'object') {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  });
  
  try {
    console.log('🔍 Testing connection...');
    const connected = await fetcher.testConnection();
    console.log(`Connection: ${connected ? '✅ Success' : '❌ Failed'}\n`);
    
    if (connected) {
      console.log('📥 Fetching today\'s matches...');
      const matches = await fetcher.fetchTodaysMatches();
      
      console.log(`\n📊 Results: Found ${matches.length} matches for today\n`);
      
      if (matches.length > 0) {
        console.log('✅ SUCCESS! Here are the first few matches:');
        matches.slice(0, 5).forEach((match, index) => {
          console.log(`\n${index + 1}. ${match.time} - ${match.teamA} vs ${match.teamB}`);
          console.log(`   Competition: ${match.competition}`);
          console.log(`   Channels: ${match.channel}`);
          console.log(`   Source: ${match.apiSource}`);
        });
        
        // Test updating data
        console.log('\n🔄 Testing data update...');
        const updateResult = await fetcher.updateMatchData();
        console.log(`Update result: ${updateResult.success ? '✅' : '❌'} - Added ${updateResult.added} new matches`);
        
      } else {
        console.log('⚠️  No matches found - this might be normal if there are no matches today');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFix().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});
