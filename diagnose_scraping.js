// Enhanced diagnostic script to debug the 0 matches issue
const MatchFetcher = require('./matchFetcher');

async function diagnoseWebScrapingIssue() {
  console.log('🔍 DIAGNOSING WEB SCRAPING ISSUE');
  console.log('='.repeat(60));
  
  // Create enhanced debug logger
  const debugLogger = (category, message, data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${category.toUpperCase()}] ${message}`);
    if (data) {
      if (typeof data === 'string' && data.length > 200) {
        console.log('    Data preview:', data.substring(0, 200) + '...');
      } else {
        console.log('    Data:', data);
      }
    }
  };
  
  const fetcher = new MatchFetcher(debugLogger);
  
  try {
    console.log('📋 Step 1: Testing basic connectivity...');
    console.log('-'.repeat(40));
    
    // Test connection
    const connectionTest = await fetcher.testConnection();
    console.log(`Connection result: ${connectionTest ? '✅ Success' : '❌ Failed'}`);
    
    if (!connectionTest) {
      console.log('');
      console.log('❌ ISSUE FOUND: Cannot connect to live-footballontv.com');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Check your internet connection');
      console.log('   2. The website might be temporarily down');
      console.log('   3. Your firewall might be blocking the request');
      console.log('   4. The app will use sample data instead');
      console.log('');
      console.log('✅ This is not a critical error - the app will still work!');
      return;
    }
    
    console.log('');
    console.log('📋 Step 2: Fetching and analyzing website content...');
    console.log('-'.repeat(40));
    
    // Fetch today's matches with detailed logging
    const matches = await fetcher.fetchTodaysMatches();
    
    console.log('');
    console.log('📊 RESULTS:');
    console.log(`   Matches found: ${matches.length}`);
    
    if (matches.length === 0) {
      console.log('');
      console.log('❌ ISSUE FOUND: 0 matches extracted from website');
      console.log('');
      console.log('🔍 DIAGNOSIS:');
      console.log('   This could happen for several reasons:');
      console.log('   1. No football matches scheduled for today');
      console.log('   2. Website structure has changed');
      console.log('   3. Parsing logic needs adjustment');
      console.log('');
      console.log('📁 Debug files saved:');
      console.log('   - debug/fetched_html.html (raw website content)');
      console.log('   - debug/parsed_lines.txt (processed lines)');
      console.log('');
      console.log('💡 NEXT STEPS:');
      console.log('   1. Check debug/fetched_html.html to see if content looks correct');
      console.log('   2. Look for today\\'s date in the HTML file');
      console.log('   3. The app will use sample data with working channel filters');
      
    } else {
      console.log('');
      console.log('✅ SUCCESS: Web scraping is working!');
      console.log('');
      console.log('📋 Sample matches found:');
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.time} - ${match.teamA} vs ${match.teamB}`);
        console.log(`      Competition: ${match.competition}`);
        console.log(`      Channel: ${match.channel}`);
        console.log('');
      });
      
      const allChannels = fetcher.getAllChannels(matches);
      console.log(`📺 Channels found: ${allChannels.length}`);
      console.log(`   ${allChannels.slice(0, 5).join(', ')}${allChannels.length > 5 ? '...' : ''}`);
    }
    
    console.log('');
    console.log('📋 Step 3: Testing data update process...');
    console.log('-'.repeat(40));
    
    const updateResult = await fetcher.updateMatchData();
    console.log(`Update success: ${updateResult.success ? '✅' : '❌'}`);
    console.log(`New matches added: ${updateResult.added || 0}`);
    console.log(`Total matches in system: ${updateResult.total || 0}`);
    
    console.log('');
    console.log('🎯 FINAL DIAGNOSIS:');
    console.log('='.repeat(60));
    
    if (connectionTest && matches.length > 0) {
      console.log('✅ WEB SCRAPING IS WORKING PERFECTLY!');
      console.log('   Your app will fetch real football data from the website.');
    } else if (connectionTest && matches.length === 0) {
      console.log('⚠️  WEB SCRAPING CONNECTED BUT NO MATCHES FOUND');
      console.log('   This is normal if:');
      console.log('   - No football matches are scheduled for today');
      console.log('   - Website structure has changed (check debug files)');
      console.log('   Your app will use sample data with working features.');
    } else {
      console.log('⚠️  WEB SCRAPING NOT AVAILABLE');
      console.log('   Your app will use sample data with all features working.');
    }
    
    console.log('');
    console.log('📱 WHAT HAPPENS IN THE APP:');
    console.log('   - Sample football matches will be shown');
    console.log('   - Channel filtering will work normally');
    console.log('   - Debug window will show this diagnosis');
    console.log('   - "Refresh Sports Data" button will retry web scraping');
    
    console.log('');
    console.log('🚀 The app is ready to use regardless of web scraping status!');
    
  } catch (error) {
    console.log('');
    console.log('❌ DIAGNOSTIC ERROR:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('🔧 This error is not critical:');
    console.log('   - The app will still work with sample data');
    console.log('   - All features (channel filtering, debug) will work');
    console.log('   - You can try again later or check your internet connection');
  }
}

// Auto-run if this script is executed directly
if (require.main === module) {
  diagnoseWebScrapingIssue().then(() => {
    console.log('');
    console.log('✅ Diagnosis complete!');
    console.log('Run "npm start" to launch the app.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Diagnostic script error:', error);
    process.exit(1);
  });
}

module.exports = diagnoseWebScrapingIssue;
