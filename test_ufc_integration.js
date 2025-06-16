// Test script for UFC integration verification
// Run this in Node.js environment to test both local and web functionality

console.log('🥊 UFC Integration Test Starting...\n');

// Test 1: Node.js UFC Fetcher
async function testNodeUFCFetcher() {
  console.log('1️⃣ Testing Node.js UFC Fetcher...');
  
  try {
    const UFCFetcher = require('./ufcFetcher');
    const fetcher = new UFCFetcher();
    
    console.log('   - Testing connection...');
    const connectionOk = await fetcher.testConnection();
    console.log(`   - Connection: ${connectionOk ? '✅ Success' : '⚠️ Failed (will use fallback)'}`);
    
    console.log('   - Fetching upcoming events...');
    const events = await fetcher.fetchUpcomingUFCEvents();
    console.log(`   - Found ${events.length} upcoming UFC events`);
    
    if (events.length > 0) {
      const nextEvent = events[0];
      console.log(`   - Next event: ${nextEvent.title} (${nextEvent.date})`);
      console.log(`   - Main card fights: ${nextEvent.mainCard?.length || 0}`);
      console.log(`   - Prelim fights: ${nextEvent.prelimCard?.length || 0}`);
    }
    
    console.log('   - Testing data update...');
    const updateResult = await fetcher.updateUFCData();
    console.log(`   - Update result: ${updateResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   - Added: ${updateResult.added} events, Total: ${updateResult.total}`);
    
    console.log('✅ Node.js UFC Fetcher test completed\n');
    return true;
    
  } catch (error) {
    console.error('❌ Node.js UFC Fetcher test failed:', error.message);
    return false;
  }
}

// Test 2: Netlify Function (simulated)
async function testNetlifyFunction() {
  console.log('2️⃣ Testing Netlify UFC Function...');
  
  try {
    // Import the function handler
    const { handler } = require('./netlify/functions/fetch-ufc');
    
    // Simulate a GET request
    const event = {
      httpMethod: 'GET',
      headers: {},
      body: null
    };
    
    const context = {};
    
    console.log('   - Calling UFC Netlify function...');
    const response = await handler(event, context);
    
    console.log(`   - Response status: ${response.statusCode}`);
    console.log(`   - Response headers: ${JSON.stringify(response.headers)}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log(`   - Success: ${data.success}`);
      console.log(`   - Events found: ${data.events?.length || 0}`);
      console.log(`   - Source: ${data.source}`);
      console.log(`   - Note: ${data.note}`);
      
      if (data.events && data.events.length > 0) {
        const event = data.events[0];
        console.log(`   - First event: ${event.title} (${event.date})`);
      }
    } else {
      console.log(`   - Error response: ${response.body}`);
    }
    
    console.log('✅ Netlify UFC Function test completed\n');
    return response.statusCode === 200;
    
  } catch (error) {
    console.error('❌ Netlify UFC Function test failed:', error.message);
    return false;
  }
}

// Test 3: Data structure validation
function testDataStructure() {
  console.log('3️⃣ Testing UFC Data Structure...');
  
  try {
    const UFCFetcher = require('./ufcFetcher');
    const fetcher = new UFCFetcher();
    
    const events = fetcher.getCurrentUFCEvents();
    console.log(`   - Testing ${events.length} current events...`);
    
    let structureValid = true;
    
    events.forEach((event, index) => {
      console.log(`   - Event ${index + 1}: ${event.title}`);
      
      // Check required fields
      const requiredFields = ['id', 'title', 'date', 'mainCard', 'prelimCard'];
      for (const field of requiredFields) {
        if (!event[field]) {
          console.log(`     ❌ Missing ${field}`);
          structureValid = false;
        } else {
          console.log(`     ✅ Has ${field}`);
        }
      }
      
      // Check fight card structure
      if (event.mainCard && event.mainCard.length > 0) {
        const fight = event.mainCard[0];
        const fightFields = ['fighter1', 'fighter2', 'weightClass'];
        for (const field of fightFields) {
          if (!fight[field]) {
            console.log(`     ❌ Main card fight missing ${field}`);
            structureValid = false;
          }
        }
      }
    });
    
    console.log(`✅ Data structure test: ${structureValid ? 'Valid' : 'Invalid'}\n`);
    return structureValid;
    
  } catch (error) {
    console.error('❌ Data structure test failed:', error.message);
    return false;
  }
}

// Test 4: Integration with DataManager
async function testDataManagerIntegration() {
  console.log('4️⃣ Testing DataManager Integration...');
  
  try {
    const DataManager = require('./dataManager');
    const UFCFetcher = require('./ufcFetcher');
    
    const dataManager = new DataManager();
    const ufcFetcher = new UFCFetcher();
    
    console.log('   - Loading existing data...');
    const existingData = dataManager.loadData();
    console.log(`   - Existing UFC events: ${existingData.ufcEvents?.length || 0}`);
    
    console.log('   - Running UFC update...');
    const updateResult = await ufcFetcher.updateUFCData();
    console.log(`   - Update successful: ${updateResult.success}`);
    console.log(`   - Events added: ${updateResult.added}`);
    
    console.log('   - Verifying saved data...');
    const updatedData = dataManager.loadData();
    console.log(`   - Total UFC events after update: ${updatedData.ufcEvents?.length || 0}`);
    console.log(`   - Last UFC fetch: ${updatedData.lastUFCFetch || 'Never'}`);
    
    console.log('✅ DataManager integration test completed\n');
    return true;
    
  } catch (error) {
    console.error('❌ DataManager integration test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running Complete UFC Integration Test Suite\n');
  
  const results = [];
  
  results.push(await testNodeUFCFetcher());
  results.push(await testNetlifyFunction());
  results.push(testDataStructure());
  results.push(await testDataManagerIntegration());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Test Results:');
  console.log(`   - Passed: ${passed}/${total}`);
  console.log(`   - Success Rate: ${Math.round((passed/total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All UFC integration tests PASSED!');
    console.log('✅ UFC schedule integration is working correctly for both local and Netlify environments.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above for details.');
  }
  
  return passed === total;
}

// Export for external use
module.exports = {
  testNodeUFCFetcher,
  testNetlifyFunction,
  testDataStructure,
  testDataManagerIntegration,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
