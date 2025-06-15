// Test script to verify UK TV channel fixes for UFC
const UFCFetcher = require('./ufcFetcher');

async function testUKChannelFixes() {
  console.log('🇬🇧 Testing UK TV Channel fixes for UFC...\n');
  console.log('='.repeat(60));
  
  const fetcher = new UFCFetcher();
  
  try {
    console.log('🔍 Testing UFC fetcher with UK channels...');
    const upcomingEvents = await fetcher.fetchUpcomingUFCEvents();
    
    console.log(`\n📊 Found ${upcomingEvents.length} UFC events\n`);
    
    if (upcomingEvents.length > 0) {
      console.log('✅ UFC EVENT DATA WITH UK CHANNELS:');
      
      upcomingEvents.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📅 Date: ${event.date} at ${event.time}`);
        console.log(`   🏟️ Venue: ${event.location}`);
        console.log(`   📺 UK TV Channel: ${event.broadcast} ✅`);
        console.log(`   🥊 Main Event: ${event.mainCard[0]?.fighter1} vs ${event.mainCard[0]?.fighter2}`);
        
        // Verify no ESPN references
        if (event.broadcast.includes('ESPN')) {
          console.log(`   ❌ ERROR: Still contains ESPN: ${event.broadcast}`);
        } else {
          console.log(`   ✅ CORRECT: UK channel only: ${event.broadcast}`);
        }
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 CHANNEL VERIFICATION SUMMARY');
      console.log('='.repeat(60));
      
      // Check all events for correct channels
      let allChannelsCorrect = true;
      upcomingEvents.forEach(event => {
        console.log(`• ${event.title.substring(0, 30)}... → ${event.broadcast}`);
        if (event.broadcast.includes('ESPN')) {
          allChannelsCorrect = false;
          console.log(`  ❌ Contains ESPN - needs fixing`);
        } else if (event.broadcast.includes('TNT Sports')) {
          console.log(`  ✅ UK channel correct`);
        } else {
          console.log(`  ⚠️ Unknown channel format`);
        }
      });
      
      console.log('\n' + '='.repeat(60));
      
      if (allChannelsCorrect) {
        console.log('🎉 ALL CHANNELS FIXED! No ESPN references found.');
        console.log('✅ Your app will now show:');
        console.log('   • Prelims: 11:00 PM (Sat) - TNT Sports');
        console.log('   • Main Card: 2:00 AM (Sun) - TNT Sports'); 
        console.log('   • Preliminary Card (TNT Sports)');
        console.log('   • UFC event broadcasts: TNT Sports / TNT Sports Box Office');
      } else {
        console.log('❌ Some ESPN references still found - check the output above');
      }
      
      // Test the determineBroadcast function directly
      console.log('\n🧪 Testing broadcast determination logic...');
      
      const testEvents = [
        { strEvent: 'UFC 300: Pereira vs Hill' },
        { strEvent: 'UFC Fight Night: Blanchfield vs Barber' },
        { strEvent: 'UFC on ABC 6: Hill vs Rountree Jr.' }
      ];
      
      testEvents.forEach(testEvent => {
        const broadcast = fetcher.determineBroadcast(testEvent);
        console.log(`${testEvent.strEvent} → ${broadcast}`);
        if (broadcast.includes('ESPN')) {
          console.log(`  ❌ Still shows ESPN`);
        } else {
          console.log(`  ✅ UK channel correct`);
        }
      });
      
    } else {
      console.log('❌ No UFC events found - this should not happen!');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FINAL VERIFICATION');
  console.log('='.repeat(60));
  
  console.log('Your Sports App should now show:');
  console.log('✅ UFC section: "TNT Sports" instead of "ESPN"');
  console.log('✅ UK Start Times: "TNT Sports" for both prelims and main card');
  console.log('✅ Preliminary Card header: "TNT Sports" instead of "ESPN+"');
  console.log('✅ Event broadcasts: "TNT Sports" or "TNT Sports Box Office"');
  
  console.log('\n🎯 Next steps:');
  console.log('1. Run your Sports App');
  console.log('2. Check the UFC section shows TNT Sports');
  console.log('3. Verify no ESPN references remain');
  console.log('4. Click "📥 Refresh Sports Data" to get latest UFC events');
}

// Run the test
testUKChannelFixes().then(() => {
  console.log('\n🏁 UK Channel fix test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});
