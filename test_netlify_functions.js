// Quick test script for Netlify functions
console.log('🔧 Testing Netlify Functions for Football Data...');

async function testNetlifyFunctions() {
  const functions = [
    '/.netlify/functions/fetch-football',
    '/.netlify/functions/fetch-football-api'
  ];
  
  for (const functionUrl of functions) {
    console.log(`\n🧪 Testing: ${functionUrl}`);
    
    try {
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: ${data.success ? 'TRUE' : 'FALSE'}`);
        console.log(`📈 Matches: ${data.matches ? data.matches.length : 0}`);
        console.log(`📝 Source: ${data.source || 'Unknown'}`);
        console.log(`💬 Note: ${data.note || 'No note'}`);
        
        if (data.error) {
          console.log(`❌ Error: ${data.error}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ HTTP Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

// Test if running in browser
if (typeof window !== 'undefined') {
  console.log('🌐 Running in browser - testing Netlify functions...');
  testNetlifyFunctions().then(() => {
    console.log('\n🏁 Function testing complete!');
  }).catch(error => {
    console.error('💥 Test failed:', error);
  });
} else {
  console.log('📝 This script should be run in the browser console on your Netlify site');
  console.log('💡 Copy and paste this into the browser console on your Netlify-deployed site');
}
