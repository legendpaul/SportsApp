const https = require('https');

// Alternative Football API Function - Uses reliable APIs instead of web scraping
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
    console.log('Fetching football data from multiple API sources...');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Looking for matches on: ${today}`);
    
    let matches = [];
    let apiSource = 'unknown';
    let lastError = null;
    
    // Method 1: Try FootballData.org API (free tier)
    try {
      console.log('Attempting FootballData.org API...');
      matches = await fetchFromFootballData(today);
      apiSource = 'football-data.org';
      console.log(`FootballData.org returned ${matches.length} matches`);
    } catch (apiError) {
      console.log('FootballData.org failed:', apiError.message);
      lastError = apiError;
      
      // Method 2: Try API-Football free tier
      try {
        console.log('Attempting API-Football...');
        matches = await fetchFromAPIFootball(today);
        apiSource = 'api-football';
        console.log(`API-Football returned ${matches.length} matches`);
      } catch (apiFreeError) {
        console.log('API-Football failed:', apiFreeError.message);
        lastError = apiFreeError;
        
        // Method 3: Try OpenLigaDB (German league data, but free)
        try {
          console.log('Attempting OpenLigaDB...');
          matches = await fetchFromOpenLigaDB(today);
          apiSource = 'openligadb';
          console.log(`OpenLigaDB returned ${matches.length} matches`);
        } catch (ligaError) {
          console.log('OpenLigaDB failed:', ligaError.message);
          lastError = ligaError;
          
          // Method 4: Try FIFA API (if available)
          try {
            console.log('Attempting alternative APIs...');
            matches = await fetchFromAlternativeAPI(today);
            apiSource = 'alternative-api';
            console.log(`Alternative API returned ${matches.length} matches`);
          } catch (altError) {
            console.log('All APIs failed:', altError.message);
            throw new Error(`All API sources failed. Last error: ${altError.message}`);
          }
        }
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
        note: matches.length > 0 ? `Live data from ${apiSource}` : 'No matches found for today from API sources'
      })
    };

  } catch (error) {
    console.error('Error fetching football data from APIs:', error);
    
    // Return error response instead of demo data
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        matches: [],
        totalFound: 0,
        todayCount: 0,
        fetchTime: new Date().toISOString(),
        source: 'error',
        note: 'Failed to fetch live data from any API source'
      })
    };
  }
};

// Fetch from Football-Data.org (free tier - 10 calls per minute)
function fetchFromFootballData(date) {
  return new Promise((resolve, reject) => {
    // Note: You need to register at https://www.football-data.org/ for a free API key
    const apiKey = process.env.FOOTBALL_DATA_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (apiKey === 'YOUR_API_KEY_HERE') {
      reject(new Error('Football-Data.org API key not configured'));
      return;
    }
    
    const options = {
      hostname: 'api.football-data.org',
      path: `/v4/matches?dateFrom=${date}&dateTo=${date}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': apiKey,
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
            reject(new Error(`Football-Data.org parse error: ${parseError.message}`));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('Football-Data.org rate limit exceeded'));
        } else if (res.statusCode === 403) {
          reject(new Error('Football-Data.org API key invalid or expired'));
        } else {
          reject(new Error(`Football-Data.org API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Football-Data.org Request Error: ${error.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Football-Data.org request timeout'));
    });

    req.end();
  });
}

// Fetch from API-Football (free tier available)
function fetchFromAPIFootball(date) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.API_FOOTBALL_KEY || 'YOUR_API_FOOTBALL_KEY';
    
    if (apiKey === 'YOUR_API_FOOTBALL_KEY') {
      reject(new Error('API-Football key not configured'));
      return;
    }
    
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: `/fixtures?date=${date}`,
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    };

    console.log(`Calling API-Football: ${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`API-Football response: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            const matches = parseAPIFootballMatches(jsonData);
            resolve(matches);
          } catch (parseError) {
            reject(new Error(`API-Football parse error: ${parseError.message}`));
          }
        } else {
          reject(new Error(`API-Football Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`API-Football Request Error: ${error.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('API-Football request timeout'));
    });

    req.end();
  });
}

// Fetch from OpenLigaDB (German league data, free)
function fetchFromOpenLigaDB(date) {
  return new Promise((resolve, reject) => {
    // OpenLigaDB provides German league data for free
    const year = new Date().getFullYear();
    
    const options = {
      hostname: 'api.openligadb.de',
      path: `/getmatchdata/bl1/${year}`, // Bundesliga data
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    console.log(`Calling OpenLigaDB: ${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`OpenLigaDB response: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            const matches = parseOpenLigaDBMatches(jsonData, date);
            resolve(matches);
          } catch (parseError) {
            reject(new Error(`OpenLigaDB parse error: ${parseError.message}`));
          }
        } else {
          reject(new Error(`OpenLigaDB Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`OpenLigaDB Request Error: ${error.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('OpenLigaDB request timeout'));
    });

    req.end();
  });
}

// Try alternative free APIs
function fetchFromAlternativeAPI(date) {
  return new Promise((resolve, reject) => {
    // This could be expanded to try other free APIs like:
    // - TheSportsDB (free tier)
    // - SportRadar (free tier)
    // - API-FOOTBALL (different endpoint)
    
    console.log('No alternative APIs configured yet');
    reject(new Error('No alternative APIs available'));
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
          id: `football_data_${match.id}`,
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
        console.log(`Parsed Football-Data match: ${parsedMatch.teamA} vs ${parsedMatch.teamB} at ${parsedMatch.time}`);
        
      } catch (parseError) {
        console.log(`Error parsing Football-Data match: ${parseError.message}`);
      }
    });
  }
  
  return matches;
}

// Parse API-Football response
function parseAPIFootballMatches(apiResponse) {
  const matches = [];
  
  if (apiResponse.response && Array.isArray(apiResponse.response)) {
    apiResponse.response.forEach(match => {
      try {
        const matchTime = new Date(match.fixture.date);
        const ukTime = matchTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/London'
        });
        
        let channels = determineUKChannel(match.league.name);
        
        const parsedMatch = {
          id: `api_football_${match.fixture.id}`,
          time: ukTime,
          teamA: match.teams.home.name,
          teamB: match.teams.away.name,
          competition: match.league.name,
          channel: channels.join(', '),
          channels: channels,
          status: match.fixture.status.short.toLowerCase(),
          createdAt: new Date().toISOString(),
          matchDate: new Date(match.fixture.date).toISOString().split('T')[0],
          apiSource: 'api-football',
          venue: match.fixture.venue ? match.fixture.venue.name : ''
        };
        
        matches.push(parsedMatch);
        console.log(`Parsed API-Football match: ${parsedMatch.teamA} vs ${parsedMatch.teamB} at ${parsedMatch.time}`);
        
      } catch (parseError) {
        console.log(`Error parsing API-Football match: ${parseError.message}`);
      }
    });
  }
  
  return matches;
}

// Parse OpenLigaDB response
function parseOpenLigaDBMatches(apiResponse, targetDate) {
  const matches = [];
  
  if (Array.isArray(apiResponse)) {
    apiResponse.forEach(match => {
      try {
        const matchTime = new Date(match.matchDateTime);
        const matchDate = matchTime.toISOString().split('T')[0];
        
        // Only return matches for the target date
        if (matchDate !== targetDate) {
          return;
        }
        
        const ukTime = matchTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/London'
        });
        
        let channels = ['Sky Sports Football', 'Discovery+']; // Typical German league channels in UK
        
        const parsedMatch = {
          id: `openligadb_${match.matchID}`,
          time: ukTime,
          teamA: match.team1.teamName,
          teamB: match.team2.teamName,
          competition: 'Bundesliga',
          channel: channels.join(', '),
          channels: channels,
          status: match.matchIsFinished ? 'finished' : 'upcoming',
          createdAt: new Date().toISOString(),
          matchDate: matchDate,
          apiSource: 'openligadb',
          venue: match.location || ''
        };
        
        matches.push(parsedMatch);
        console.log(`Parsed OpenLigaDB match: ${parsedMatch.teamA} vs ${parsedMatch.teamB} at ${parsedMatch.time}`);
        
      } catch (parseError) {
        console.log(`Error parsing OpenLigaDB match: ${parseError.message}`);
      }
    });
  }
  
  return matches;
}

// Determine UK TV channel based on competition
function determineUKChannel(competition) {
  const lowerComp = competition.toLowerCase();
  
  // Mapping based on typical UK broadcasting rights
  if (lowerComp.includes('premier league')) {
    return ['Sky Sports Premier League', 'Sky Sports Main Event'];
  } else if (lowerComp.includes('championship')) {
    return ['Sky Sports Football'];
  } else if (lowerComp.includes('fa cup')) {
    return ['BBC One', 'ITV1'];
  } else if (lowerComp.includes('champions league') || lowerComp.includes('uefa champions')) {
    return ['TNT Sports 1', 'TNT Sports 2'];
  } else if (lowerComp.includes('europa league') || lowerComp.includes('uefa europa')) {
    return ['TNT Sports 1'];
  } else if (lowerComp.includes('conference league') || lowerComp.includes('uefa conference')) {
    return ['TNT Sports 2'];
  } else if (lowerComp.includes('world cup') || lowerComp.includes('fifa')) {
    return ['BBC One', 'ITV1'];
  } else if (lowerComp.includes('european championship') || lowerComp.includes('euros')) {
    return ['BBC One', 'ITV1'];
  } else if (lowerComp.includes('primera division') || lowerComp.includes('la liga')) {
    return ['Premier Sports 1'];
  } else if (lowerComp.includes('serie a')) {
    return ['TNT Sports'];
  } else if (lowerComp.includes('bundesliga')) {
    return ['Sky Sports Football', 'Discovery+'];
  } else if (lowerComp.includes('ligue 1')) {
    return ['Discovery+'];
  } else if (lowerComp.includes('eredivisie')) {
    return ['Premier Sports 2'];
  } else if (lowerComp.includes('scottish premiership')) {
    return ['Sky Sports Football'];
  } else if (lowerComp.includes('carabao cup') || lowerComp.includes('efl cup')) {
    return ['Sky Sports Football'];
  } else if (lowerComp.includes('community shield')) {
    return ['ITV1'];
  } else {
    // Default channels for unknown competitions
    return ['Check TV Guide'];
  }
}
