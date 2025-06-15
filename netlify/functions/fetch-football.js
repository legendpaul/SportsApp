const https = require('https');

// Netlify Function to fetch football data (bypasses CORS)
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
    console.log('Fetching football data from live-footballontv.com...');
    
    let htmlContent;
    let fetchMethod = 'unknown';
    
    // Try multiple fetch strategies
    try {
      htmlContent = await fetchWebsiteWithRetry('www.live-footballontv.com', '/');
      fetchMethod = 'direct';
    } catch (directError) {
      console.log('Direct fetch failed:', directError.message);
      
      // Try alternative approach
      try {
        htmlContent = await fetchWithUserAgentRotation('www.live-footballontv.com', '/');
        fetchMethod = 'user-agent-rotation';
      } catch (rotationError) {
        console.log('User agent rotation failed:', rotationError.message);
        
        // Return demo data as fallback
        console.log('All fetch methods failed, returning demo data');
        const demoMatches = generateDemoMatches();
        
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
            note: 'Using demo data due to website access issues'
          })
        };
      }
    }
    
    if (!htmlContent) {
      throw new Error('No content received from website');
    }

    console.log(`Received HTML content: ${htmlContent.length} characters via ${fetchMethod}`);
    
    const matches = parseMatches(htmlContent);
    
    // Filter for today's matches
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(match => match.matchDate === today);
    
    console.log(`Found ${matches.length} total matches, ${todayMatches.length} for today`);
    
    // If no matches found, use demo data
    if (todayMatches.length === 0) {
      console.log('No matches found for today, returning demo data');
      const demoMatches = generateDemoMatches();
      
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
          note: 'No live matches found for today, showing demo data'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: todayMatches,
        totalFound: matches.length,
        todayCount: todayMatches.length,
        fetchTime: new Date().toISOString(),
        source: 'live-data',
        fetchMethod: fetchMethod
      })
    };

  } catch (error) {
    console.error('Error fetching football data:', error);
    
    // Return demo data even on error
    const demoMatches = generateDemoMatches();
    
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
        note: 'Using demo data due to error'
      })
    };
  }
};

// Function to fetch website content with retry logic
function fetchWebsiteWithRetry(hostname, path, maxRetries = 3) {
  return new Promise(async (resolve, reject) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to fetch from ${hostname}`);
        const result = await fetchWebsite(hostname, path);
        resolve(result);
        return;
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    reject(lastError);
  });
}

// Function to fetch website content
function fetchWebsite(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    console.log(`Making request to https://${hostname}${path}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`Response status: ${res.statusCode} ${res.statusMessage}`);
      console.log('Response headers:', res.headers);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Redirect to: ${res.headers.location}`);
        const url = new URL(res.headers.location, `https://${hostname}`);
        fetchWebsite(url.hostname, url.pathname + url.search)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response completed. Content length: ${data.length} characters`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Website Error: ${res.statusCode} - ${data.substring(0, 200)}...`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Request failed: ${error.message}`);
      reject(new Error(`Request Error: ${error.message}`));
    });

    req.setTimeout(20000, () => {
      req.destroy();
      console.log('Request timed out after 20 seconds');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Alternative fetch method with user agent rotation
function fetchWithUserAgentRotation(hostname, path) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];
  
  return new Promise((resolve, reject) => {
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': randomUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1'
      }
    };

    console.log(`Alternative fetch to https://${hostname}${path} with UA: ${randomUA.substring(0, 50)}...`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`Alternative response status: ${res.statusCode} ${res.statusMessage}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Alternative response completed. Content length: ${data.length} characters`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Alternative Website Error: ${res.statusCode} - ${data.substring(0, 200)}...`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Alternative request failed: ${error.message}`);
      reject(new Error(`Alternative Request Error: ${error.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      console.log('Alternative request timed out after 15 seconds');
      reject(new Error('Alternative request timeout'));
    });

    req.end();
  });
}

// Function to parse matches from HTML
function parseMatches(htmlContent) {
  console.log('Starting to parse HTML content for matches...');
  const matches = [];
  
  try {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    // Look for today's date section in HTML - Dynamic date patterns
    const todayPatterns = [
      `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
      `${today.toLocaleDateString('en-US', { weekday: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-US', { month: 'long' })} ${today.getFullYear()}`,
      // Additional patterns for different date formats
      `${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
      `${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())}, ${today.getFullYear()}`
    ];
    
    console.log('Looking for today\'s date patterns:', todayPatterns);
    
    // Find today's date section
    let todaySection = null;
    let nextDayIndex = -1;
    
    for (const pattern of todayPatterns) {
      const patternIndex = htmlContent.indexOf(pattern);
      if (patternIndex !== -1) {
        console.log(`Found today's date section: ${pattern}`);
        todaySection = pattern;
        
        const fixtureStartIndex = htmlContent.indexOf('<div class="fixture">', patternIndex);
        const nextDayPattern = htmlContent.indexOf('class="fixture-date"', patternIndex + pattern.length);
        nextDayIndex = nextDayPattern !== -1 ? nextDayPattern : htmlContent.length;
        
        if (fixtureStartIndex !== -1 && fixtureStartIndex < nextDayIndex) {
          const todayFixturesSection = htmlContent.substring(fixtureStartIndex, nextDayIndex);
          matches.push(...parseFixturesFromHTML(todayFixturesSection, todayFormatted));
        }
        break;
      }
    }
    
    if (!todaySection) {
      console.log('Could not find today\'s date section, parsing all fixtures for today');
      const allFixtures = parseAllFixturesFromHTML(htmlContent);
      const todayMatches = allFixtures.filter(match => {
        match.matchDate = todayFormatted;
        return true;
      });
      matches.push(...todayMatches);
    }
    
    console.log(`Parsing completed: ${matches.length} matches extracted`);
    
  } catch (error) {
    console.log(`Error parsing matches: ${error.message}`);
  }
  
  return matches;
}

function parseFixturesFromHTML(htmlSection, matchDate) {
  const matches = [];
  
  try {
    const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
    let match;
    
    while ((match = fixtureRegex.exec(htmlSection)) !== null) {
      const fixtureHTML = match[1];
      const parsedMatch = parseIndividualFixture(fixtureHTML, matchDate);
      
      if (parsedMatch) {
        matches.push(parsedMatch);
      }
    }
    
  } catch (error) {
    console.log(`Error parsing fixtures section: ${error.message}`);
  }
  
  return matches;
}

function parseAllFixturesFromHTML(htmlContent) {
  const matches = [];
  
  try {
    const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
    let match;
    
    const today = new Date().toISOString().split('T')[0];
    
    while ((match = fixtureRegex.exec(htmlContent)) !== null) {
      const fixtureHTML = match[1];
      const parsedMatch = parseIndividualFixture(fixtureHTML, today);
      
      if (parsedMatch) {
        matches.push(parsedMatch);
      }
    }
    
  } catch (error) {
    console.log(`Error parsing all fixtures: ${error.message}`);
  }
  
  return matches;
}

function parseIndividualFixture(fixtureHTML, matchDate) {
  try {
    // Extract time
    const timeMatch = fixtureHTML.match(/<div class="fixture__time">([^<]+)<\/div>/);
    if (!timeMatch) return null;
    
    const time = timeMatch[1].trim();
    if (time === 'TBC') return null;
    
    // Extract teams
    const teamsMatch = fixtureHTML.match(/<div class="fixture__teams">([^<]+)<\/div>/);
    if (!teamsMatch) return null;
    
    const teamsText = teamsMatch[1].trim();
    const teams = parseTeamsFromText(teamsText);
    if (!teams) return null;
    
    // Extract competition
    const competitionMatch = fixtureHTML.match(/<div class="fixture__competition">([^<]+)<\/div>/);
    const competition = competitionMatch ? cleanHTML(competitionMatch[1].trim()) : 'Football';
    
    // Extract channels
    const channels = parseChannelsFromHTML(fixtureHTML);
    
    const matchObj = {
      id: `netlify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: time,
      teamA: teams.teamA,
      teamB: teams.teamB,
      competition: competition,
      channel: channels.length > 0 ? channels.join(', ') : 'Check TV Guide',
      channels: channels.length > 0 ? channels : ['Check TV Guide'],
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      matchDate: matchDate,
      apiSource: 'live-footballontv.com',
      venue: ''
    };
    
    console.log(`Parsed match: ${teams.teamA} vs ${teams.teamB} at ${time}`);
    
    return matchObj;
    
  } catch (error) {
    console.log(`Error parsing individual fixture: ${error.message}`);
    return null;
  }
}

function parseTeamsFromText(teamsText) {
  try {
    const cleanText = teamsText.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
    
    const patterns = [
      /^(.+?)\s+v\s+(.+)$/,
      /^(.+?)\s+vs\s+(.+)$/,
      /^(.+?)\s+V\s+(.+)$/,
      /(.+?)\s+-\s+(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match && match[1] && match[2]) {
        const teamA = match[1].trim();
        const teamB = match[2].trim();
        
        if (teamA.length >= 2 && teamB.length >= 2 && teamA !== teamB) {
          return { teamA, teamB };
        }
      }
    }
  } catch (error) {
    console.log(`Error parsing teams from "${teamsText}": ${error.message}`);
  }
  
  return null;
}

function parseChannelsFromHTML(fixtureHTML) {
  const channels = [];
  
  // UK TV Channel mappings
  const channelMappings = {
    'BBC One': 'BBC One',
    'BBC Two': 'BBC Two', 
    'BBC Three': 'BBC Three',
    'BBC Four': 'BBC Four',
    'BBC iPlayer': 'BBC iPlayer',
    'ITV1': 'ITV1',
    'ITV2': 'ITV2', 
    'ITV4': 'ITV4',
    'ITVX': 'ITVX',
    'Channel 4': 'Channel 4',
    'Sky Sports Premier League': 'Sky Sports Premier League',
    'Sky Sports Football': 'Sky Sports Football',
    'Sky Sports Main Event': 'Sky Sports Main Event',
    'TNT Sports': 'TNT Sports',
    'TNT Sports 1': 'TNT Sports 1',
    'TNT Sports 2': 'TNT Sports 2',
    'TNT Sports 3': 'TNT Sports 3',
    'Premier Sports 1': 'Premier Sports 1',
    'Premier Sports 2': 'Premier Sports 2',
    'Amazon Prime Video': 'Amazon Prime Video',
    'Discovery+': 'Discovery+'
  };
  
  try {
    const channelRegex = /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g;
    let match;
    
    while ((match = channelRegex.exec(fixtureHTML)) !== null) {
      const channelText = cleanHTML(match[1].trim());
      const mappedChannel = channelMappings[channelText] || channelText;
      
      if (mappedChannel && mappedChannel !== 'Check TV Guide' && !channels.includes(mappedChannel)) {
        channels.push(mappedChannel);
      }
    }
    
  } catch (error) {
    console.log(`Error parsing channels: ${error.message}`);
  }
  
  return channels;
}

function cleanHTML(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function getOrdinalSuffix(day) {
  const j = day % 10;
  const k = day % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

// Generate demo matches for fallback
function generateDemoMatches() {
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  
  // Generate times that make sense for today
  const times = ['15:00', '17:30', '20:00'];
  
  const demoMatches = [
    {
      id: `netlify_demo_${Date.now()}_1`,
      time: times[0],
      teamA: "Manchester City",
      teamB: "Arsenal", 
      competition: "Premier League",
      channel: "Sky Sports Premier League, Sky Sports Main Event",
      channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
      status: "upcoming",
      createdAt: new Date().toISOString(),
      matchDate: today,
      apiSource: 'netlify-demo',
      venue: 'Etihad Stadium'
    },
    {
      id: `netlify_demo_${Date.now()}_2`,
      time: times[1],
      teamA: "Liverpool",
      teamB: "Chelsea",
      competition: "Premier League", 
      channel: "BBC One, BBC iPlayer",
      channels: ["BBC One", "BBC iPlayer"],
      status: "upcoming",
      createdAt: new Date().toISOString(),
      matchDate: today,
      apiSource: 'netlify-demo',
      venue: 'Anfield'
    },
    {
      id: `netlify_demo_${Date.now()}_3`,
      time: times[2],
      teamA: "Real Madrid",
      teamB: "Barcelona",
      competition: "La Liga",
      channel: "Premier Sports 1",
      channels: ["Premier Sports 1"],
      status: "upcoming",
      createdAt: new Date().toISOString(),
      matchDate: today,
      apiSource: 'netlify-demo',
      venue: 'Santiago Bernabéu'
    }
  ];

  console.log(`Generated ${demoMatches.length} demo matches for fallback`);
  return demoMatches;
}
