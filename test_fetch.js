const MatchFetcher = require('./matchFetcher');

console.log('📥 Testing match fetching from Football-Data.org...');

const fetcher = new MatchFetcher();

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
