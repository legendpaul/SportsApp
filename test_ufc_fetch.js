const UFCFetcher = require('./ufcFetcher');

console.log('🥊 Testing UFC event fetching from TheSportsDB...');

const fetcher = new UFCFetcher();

fetcher.updateUFCData()
  .then(result => {
    if (result.success) {
      console.log(`✅ Successfully fetched ${result.added} UFC events`);
      console.log(`📊 Total UFC events: ${result.total}`);
      
      if (result.added > 0) {
        console.log('\n🥊 New UFC events found:');
        result.events.slice(0, 3).forEach(event => {
          console.log(`  🗓️ ${event.date} - ${event.title}`);
          console.log(`     📍 ${event.location}`);
          console.log(`     📺 ${event.broadcast}`);
        });
        
        if (result.events.length > 3) {
          console.log(`  ... and ${result.events.length - 3} more events`);
        }
      } else {
        console.log('ℹ️ No new UFC events found - existing data is up to date');
      }
      
      process.exit(0);
    } else {
      console.log('❌ UFC fetch failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.log('❌ UFC fetch error:', error.message);
    process.exit(1);
  });
