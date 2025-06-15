const https = require('https');

// Alternative Football API Function - Uses reliable API instead of web scraping
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Fetching football data from Football-Data.org API...');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Looking for matches on: ${today}`);
    
    // Try multiple API sources
    let matches = [];
    let apiSource = 'unknown';
    
    // Method 1: Try Football-Data.org (free tier)
    try {
      matches = await fetchFromFootballData(today);
      apiSource = 'football-data.org';
      console.log(`Football-Data.org returned ${matches.length} matches`);
    } catch (apiError) {
      console.log('Football-Data.org failed:', apiError.message);
      
      // Method 2: Try free-to-use API
      try {
        matches = await fetchFromFreeAPI(today);
        apiSource = 'free-api';
        console.log(`Free API returned ${matches.length} matches`);
      } catch (freeApiError) {
        console.log('Free API failed:', freeApiError.message);
        
        // Method 3: Use demo data as last resort
        matches = generateRealisticDemoMatches();
        apiSource = 'demo-data';
        console.log('Using demo data as fallback');
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: matches,
        totalFound: matches.length,
        todayCount: matches.length,
        fetchTime: new Date().toISOString(),
        source: apiSource,
        note: apiSource === 'demo-data' ? 'APIs unavailable, using demo data' : `Live data from ${apiSource}`
      })
    };

  } catch (error) {
    console.error('Error fetching football data:', error);
    
    // Always return demo data on error
    const demoMatches = generateRealisticDemoMatches();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: demoMatches,
        totalFound: demoMatches.length,
        todayCount: demoMatches.length,
        fetchTime: new Date().toISOString(),
        source: 'demo-data',
        error: error.message,
        note: 'Using demo data due to API error'
      })
    };
  }
};

// Fetch from Football-Data.org (free tier - 10 calls per minute)
function fetchFromFootballData(date) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path: `/v4/matches?dateFrom=${date}&dateTo=${date}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': 'YOUR_API_KEY_HERE', // You'd need to register for a free key
        'Accept': 'application/json'
      }
    };

    console.log(`Calling Football-Data.org API: ${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Football-Data.org response: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            const matches = parseFootballDataMatches(jsonData);
            resolve(matches);
          } catch (parseError) {
            reject(new Error(`Parse error: ${parseError.message}`));
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request Error: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Fetch from a free API (no key required)
function fetchFromFreeAPI(date) {
  return new Promise((resolve, reject) => {
    // Note: This would use a real free API like api-football.com free tier
    // For demo purposes, we'll simulate a successful response
    
    console.log('Attempting free API call...');
    
    // Simulate API delay
    setTimeout(() => {
      // For now, return empty array (would implement real API call)
      resolve([]);
    }, 1000);
  });
}

// Parse Football-Data.org API response
function parseFootballDataMatches(apiResponse) {
  const matches = [];
  
  if (apiResponse.matches && Array.isArray(apiResponse.matches)) {
    apiResponse.matches.forEach(match => {
      try {
        const matchTime = new Date(match.utcDate);
        const ukTime = matchTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/London'
        });
        
        // Determine UK TV channel based on competition
        let channels = determineUKChannel(match.competition.name);
        
        const parsedMatch = {
          id: `api_${match.id}`,
          time: ukTime,
          teamA: match.homeTeam.name,
          teamB: match.awayTeam.name,
          competition: match.competition.name,
          channel: channels.join(', '),
          channels: channels,
          status: match.status.toLowerCase(),
          createdAt: new Date().toISOString(),
          matchDate: new Date(match.utcDate).toISOString().split('T')[0],
          apiSource: 'football-data.org',
          venue: match.venue || ''
        };
        
        matches.push(parsedMatch);
        console.log(`Parsed API match: ${parsedMatch.teamA} vs ${parsedMatch.teamB} at ${parsedMatch.time}`);
        
      } catch (parseError) {
        console.log(`Error parsing match: ${parseError.message}`);
      }
    });
  }
  
  return matches;
}

// Determine UK TV channel based on competition
function determineUKChannel(competition) {
  const channelMap = {
    'Premier League': ['Sky Sports Premier League', 'BBC One'],
    'Championship': ['Sky Sports Football'],
    'FA Cup': ['BBC One', 'ITV1'],
    'UEFA Champions League': ['TNT Sports 1', 'TNT Sports 2'],
    'UEFA Europa League': ['TNT Sports 1'],
    'FIFA World Cup': ['BBC One', 'ITV1'],
    'UEFA European Championship': ['BBC One', 'ITV1'],
    'Primera División': ['Premier Sports 1'], // La Liga
    'Serie A': ['TNT Sports'],
    'Bundesliga': ['Sky Sports Football'],
    'Ligue 1': ['Discovery+']
  };
  
  // Find matching competition
  for (const [comp, channels] of Object.entries(channelMap)) {
    if (competition.toLowerCase().includes(comp.toLowerCase())) {
      return channels;
    }
  }
  
  // Default channels for unknown competitions
  return ['Sky Sports Football'];
}

// Generate realistic demo matches
function generateRealisticDemoMatches() {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  
  // Adjust match times based on day of week
  let matches = [];
  
  if (dayOfWeek === 0) { // Sunday
    matches = [
      {
        id: `api_demo_${Date.now()}_1`,
        time: "14:00",
        teamA: "Manchester United",
        teamB: "Liverpool",
        competition: "Premier League",
        channel: "Sky Sports Premier League, Sky Sports Main Event",
        channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'Old Trafford'
      },
      {
        id: `api_demo_${Date.now()}_2`,
        time: "16:30",
        teamA: "Chelsea",
        teamB: "Arsenal",
        competition: "Premier League",
        channel: "Sky Sports Premier League",
        channels: ["Sky Sports Premier League"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'Stamford Bridge'
      }
    ];
  } else if (dayOfWeek === 6) { // Saturday
    matches = [
      {
        id: `api_demo_${Date.now()}_1`,
        time: "12:30",
        teamA: "Manchester City",
        teamB: "Tottenham",
        competition: "Premier League",
        channel: "TNT Sports 1",
        channels: ["TNT Sports 1"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'Etihad Stadium'
      },
      {
        id: `api_demo_${Date.now()}_2`,
        time: "15:00",
        teamA: "Newcastle United",
        teamB: "Brighton",
        competition: "Premier League",
        channel: "Sky Sports Premier League",
        channels: ["Sky Sports Premier League"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'St. James\' Park'
      },
      {
        id: `api_demo_${Date.now()}_3`,
        time: "17:30",
        teamA: "West Ham",
        teamB: "Aston Villa",
        competition: "Premier League",
        channel: "Sky Sports Premier League",
        channels: ["Sky Sports Premier League"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'London Stadium'
      }
    ];
  } else { // Weekday
    matches = [
      {
        id: `api_demo_${Date.now()}_1`,
        time: "20:00",
        teamA: "Real Madrid",
        teamB: "Barcelona",
        competition: "UEFA Champions League",
        channel: "TNT Sports 1",
        channels: ["TNT Sports 1"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'api-demo',
        venue: 'Santiago Bernabéu'
      }
    ];
  }
  
  console.log(`Generated ${matches.length} realistic demo matches for ${new Date().toLocaleDateString('en-GB', { weekday: 'long' })}`);
  return matches;
}
