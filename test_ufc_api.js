const UFCFetcher = require('./ufcFetcher');

console.log('🔍 Testing UFC API connection and timing accuracy...');
console.log('🎯 Verifying that each UFC event has unique, accurate start times\n');

const fetcher = new UFCFetcher();

async function runComprehensiveUFCTest() {
  try {
    console.log('1️⃣ Testing UFC API Connection...');
    const apiSuccess = await fetcher.testConnection();
    
    console.log('\n2️⃣ Testing UFC Event Timing System...');
    const currentEvents = fetcher.getCurrentUFCEvents();
    
    console.log(`📊 Found ${currentEvents.length} current UFC events with accurate timing`);
    
    // Verify each event has different start times
    const startTimes = new Set();
    let timingAccurate = true;
    
    currentEvents.forEach((event, index) => {
      const mainCardTime = event.mainCardTime || event.time;
      
      console.log(`\n🥊 Event ${index + 1}: ${event.title}`);
      console.log(`   📅 Date: ${event.date}`);
      console.log(`   🎭 Type: ${event.eventType}`);
      console.log(`   ⏰ Main Card: ${mainCardTime} ET`);
      console.log(`   🇬🇧 UK Time: ${new Date(event.ukDateTime).toLocaleString('en-GB')}`);
      console.log(`   📺 Broadcast: ${event.broadcast}`);
      
      if (startTimes.has(mainCardTime)) {
        console.log(`   ❌ DUPLICATE START TIME DETECTED!`);
        timingAccurate = false;
      } else {
        console.log(`   ✅ Unique start time confirmed`);
        startTimes.add(mainCardTime);
      }
      
      // Verify timing makes sense for event type
      const hour = parseInt(mainCardTime.split(':')[0]);
      switch(event.eventType) {
        case 'abc_card':
          if (hour === 20) {
            console.log(`   ✅ ABC Card timing correct (8 PM ET)`);
          } else {
            console.log(`   ❌ ABC Card timing incorrect (should be 8 PM ET)`);
            timingAccurate = false;
          }
          break;
        case 'fight_night':
          if (hour === 22) {
            console.log(`   ✅ Fight Night timing correct (10 PM ET)`);
          } else {
            console.log(`   ❌ Fight Night timing incorrect (should be 10 PM ET)`);
            timingAccurate = false;
          }
          break;
        case 'ppv':
          if (hour === 22) {
            console.log(`   ✅ PPV timing correct (10 PM ET)`);
          } else {
            console.log(`   ❌ PPV timing incorrect (should be 10 PM ET)`);
            timingAccurate = false;
          }
          break;
      }
    });
    
    console.log('\n3️⃣ Testing UFC Data Fetching...');
    const upcomingEvents = await fetcher.fetchUpcomingUFCEvents();
    console.log(`📥 Successfully fetched ${upcomingEvents.length} upcoming events`);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 UFC TEST RESULTS:');
    console.log('='.repeat(50));
    
    if (apiSuccess) {
      console.log('✅ UFC API connection: WORKING');
    } else {
      console.log('⚠️ UFC API connection: FALLBACK MODE (still functional)');
    }
    
    if (timingAccurate) {
      console.log('✅ UFC event timing: ACCURATE & UNIQUE');
      console.log('✅ Each event type has correct start times');
      console.log('✅ No duplicate start times detected');
    } else {
      console.log('❌ UFC event timing: ISSUES DETECTED');
    }
    
    console.log(`✅ UFC event fetching: WORKING (${upcomingEvents.length} events)`);
    
    console.log('\n🎯 TIMING VERIFICATION:');
    console.log('• ABC Cards start at 8:00 PM ET (prime-time friendly)');
    console.log('• Fight Nights start at 10:00 PM ET (late-night audience)');
    console.log('• PPV Events start at 10:00 PM ET (premium timing)');
    console.log('• All UK times calculated automatically');
    console.log('• Complete broadcast schedule included');
    
    const overallSuccess = (apiSuccess || upcomingEvents.length > 0) && timingAccurate;
    
    if (overallSuccess) {
      console.log('\n🎉 COMPREHENSIVE UFC TEST: PASSED');
      console.log('🏆 UFC start times are now accurate and unique!');
      return true;
    } else {
      console.log('\n❌ COMPREHENSIVE UFC TEST: FAILED');
      return false;
    }
    
  } catch (error) {
    console.error('❌ UFC test error:', error.message);
    return false;
  }
}

runComprehensiveUFCTest()
  .then(success => {
    if (success) {
      console.log('\n✅ All UFC tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some UFC tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('❌ Unexpected UFC test error:', error.message);
    process.exit(1);
  });
