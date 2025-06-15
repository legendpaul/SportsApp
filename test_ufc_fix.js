// Test script for the fixed UFC fetcher
const UFCFetcher = require('./ufcFetcher');

async function testUFCFix() {
  console.log('🥊 Testing fixed UFC fetcher...\n');
  
  const fetcher = new UFCFetcher();
  
  try {
    console.log('🔍 Testing UFC API connection...');
    const connected = await fetcher.testConnection();
    console.log(`Connection: ${connected ? '✅ Success' : '⚠️ Using fallback data'}\n`);
    
    console.log('📥 Fetching upcoming UFC events...');
    const upcomingEvents = await fetcher.fetchUpcomingUFCEvents();
    
    console.log(`\n📊 Results: Found ${upcomingEvents.length} upcoming UFC events\n`);
    
    if (upcomingEvents.length > 0) {
      console.log('✅ SUCCESS! Current UFC events:');
      
      upcomingEvents.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📅 Date: ${event.date} at ${event.time}`);
        console.log(`   🏟️  Venue: ${event.location}`);
        console.log(`   📺 Broadcast: ${event.broadcast}`);
        console.log(`   🥊 Main Card (${event.mainCard.length} fights):`);
        
        event.mainCard.forEach((fight, fIndex) => {
          const titleText = fight.title ? ` [${fight.title}]` : '';
          console.log(`      ${fIndex + 1}. ${fight.fighter1} vs ${fight.fighter2} (${fight.weightClass})${titleText}`);
        });
        
        if (event.prelimCard.length > 0) {
          console.log(`   🥊 Prelims (${event.prelimCard.length} fights):`);
          event.prelimCard.slice(0, 3).forEach((fight, fIndex) => {
            console.log(`      ${fIndex + 1}. ${fight.fighter1} vs ${fight.fighter2} (${fight.weightClass})`);
          });
          if (event.prelimCard.length > 3) {
            console.log(`      ... and ${event.prelimCard.length - 3} more prelim fights`);
          }
        }
      });
      
      // Test updating data
      console.log('\n🔄 Testing UFC data update...');
      const updateResult = await fetcher.updateUFCData();
      console.log(`Update result: ${updateResult.success ? '✅' : '❌'} - Added ${updateResult.added} new UFC events`);
      console.log(`Total UFC events in database: ${updateResult.total}`);
      
    } else {
      console.log('⚠️  No UFC events found - this should not happen with the fixed fetcher');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUFCFix().then(() => {
  console.log('\n🏁 UFC Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 UFC Test error:', error);
  process.exit(1);
});
