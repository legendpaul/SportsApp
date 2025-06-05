const https = require('https');

function makeApiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.thesportsdb.com',
      path: '/api/v1/json/3' + endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'SportsApp/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(new Error(`JSON Parse Error: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request Error: ${error.message}`));
    });

    req.end();
  });
}

async function testUFCAPI() {
  try {
    console.log('🔍 Testing UFC API search methods...');
    
    // Test 1: Search for UFC events
    console.log('\n1. Testing UFC search...');
    const ufcSearch = await makeApiRequest('/searchevents.php?e=UFC');
    console.log('UFC search results found:', ufcSearch.event ? ufcSearch.event.length : 0);
    
    if (ufcSearch.event && ufcSearch.event.length > 0) {
      console.log('First 3 UFC events found:');
      ufcSearch.event.slice(0, 3).forEach((event, i) => {
        console.log(`  ${i+1}. ${event.strEvent} - ${event.dateEvent} - ${event.strStatus}`);
      });
    }
    
    // Test 2: Search specifically for June 2025 events
    console.log('\n2. Looking for June 2025 events...');
    const june2025Events = ufcSearch.event ? ufcSearch.event.filter(event => 
      event.dateEvent && event.dateEvent.includes('2025-06')
    ) : [];
    console.log('June 2025 UFC events found:', june2025Events.length);
    
    june2025Events.forEach(event => {
      console.log(`  📅 ${event.dateEvent} - ${event.strEvent}`);
      console.log(`     Status: ${event.strStatus}`);
      console.log(`     Venue: ${event.strVenue || 'TBD'}`);
      if (event.strDescriptionEN) {
        console.log(`     Description: ${event.strDescriptionEN.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Test 3: Search for specific fighters
    console.log('\n3. Testing fighter-specific searches...');
    const blanchfieldSearch = await makeApiRequest('/searchevents.php?e=Blanchfield');
    console.log('Blanchfield events found:', blanchfieldSearch.event ? blanchfieldSearch.event.length : 0);
    
    const barberSearch = await makeApiRequest('/searchevents.php?e=Barber');
    console.log('Barber events found:', barberSearch.event ? barberSearch.event.length : 0);
    
    // Test 4: Try different search terms
    console.log('\n4. Testing alternative search terms...');
    const mmaSearch = await makeApiRequest('/searchevents.php?e=MMA');
    console.log('MMA events found:', mmaSearch.event ? mmaSearch.event.length : 0);
    
    const fightSearch = await makeApiRequest('/searchevents.php?e=Fight');
    console.log('Fight events found:', fightSearch.event ? fightSearch.event.length : 0);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testUFCAPI();
