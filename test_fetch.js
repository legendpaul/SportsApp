const MatchFetcher = require('./matchFetcher');

const fetcher = new MatchFetcher();

if (fetcher.apiKey === 'YOUR_FOOTBALL_DATA_API_KEY_HERE') {
  console.log("----------------------------------------------------------------------------------");
  console.log("IMPORTANT: Football-Data.org API Key Not Set");
  console.log("----------------------------------------------------------------------------------");
  console.log("The test_fetch.js script will likely fail because a valid API key for Football-Data.org");
  console.log("has not been configured in matchFetcher.js. ");
  console.log("Please edit matchFetcher.js and replace 'YOUR_FOOTBALL_DATA_API_KEY_HERE' with your personal API key.");
  console.log("You can obtain a free key from https://www.football-data.org/client/register");
  console.log("----------------------------------------------------------------------------------");
  console.log("Attempting to run test anyway...");
  console.log("----------------------------------------------------------------------------------");
}

console.log('📥 Testing match fetching from Football-Data.org...');

fetcher.fetchTodaysMatches()
  .then(matches => {
    console.log(`✅ Successfully fetched ${matches.length} matches for today`);
    
    if (matches.length > 0) {
      console.log('\n📊 Sample matches:');
      matches.slice(0, 3).forEach(match => {
        console.log(`  ⚽ ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition})`);
      });
      
      if (matches.length > 3) {
        console.log(`  ... and ${matches.length - 3} more matches`);
      }
    } else {
      console.log('ℹ️ No matches found for today - this might be normal if no games are scheduled');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.log('❌ Match fetch error:', error.message);
    process.exit(1);
  });
