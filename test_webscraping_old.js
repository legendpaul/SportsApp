// Test script for the new web scraping functionality
const MatchFetcher = require('./matchFetcher');

async function testWebScraping() {
  console.log('🧪 Testing Football Match Web Scraping...');
  console.log('='.repeat(50));
  
  const fetcher = new MatchFetcher();
  
  try {
    // Test connection to website
    console.log('1. Testing website connection...');
    const connectionTest = await fetcher.testConnection();
    console.log(`   Connection: ${connectionTest ? '✅ Success' : '❌ Failed'}`);
    
    if (!connectionTest) {
      console.log('   ⚠️  Cannot connect to live-footballontv.com - check internet connection');
      return;
    }
    
    // Test fetching today's matches
    console.log('\n2. Fetching today\'s matches...');
    const matches = await fetcher.fetchTodaysMatches();
    console.log(`   Found: ${matches.length} matches`);
    
    if (matches.length > 0) {
      console.log('\n3. Sample matches:');
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.time} - ${match.teamA} vs ${match.teamB}`);
        console.log(`      Competition: ${match.competition}`);
        console.log(`      Channel(s): ${match.channel}`);
        if (match.channels && match.channels.length > 0) {
          console.log(`      Parsed Channels: [${match.channels.join(', ')}]`);
        }
        console.log('');
      });
      
      // Test channel extraction
      console.log('4. Testing channel extraction...');
      const allChannels = fetcher.getAllChannels(matches);
      console.log(`   Unique channels found: ${allChannels.length}`);
      console.log(`   Channels: ${allChannels.slice(0, 10).join(', ')}${allChannels.length > 10 ? '...' : ''}`);
      
    } else {
      console.log('   ⚠️  No matches found for today');
      console.log('   This could be normal if there are no football matches today');
    }
    
    // Test data update process
    console.log('\n5. Testing data update process...');
    const updateResult = await fetcher.updateMatchData();
    console.log(`   Update result: ${updateResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   New matches added: ${updateResult.added || 0}`);
    console.log(`   Total matches: ${updateResult.total || 0}`);
    
    console.log('\n🎉 Web scraping test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testWebScraping().then(() => {
    console.log('\n✅ Test script finished');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Test script error:', error);
    process.exit(1);
  });
}

module.exports = testWebScraping;
