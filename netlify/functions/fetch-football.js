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
    
    const htmlContent = await fetchWebsite('www.live-footballontv.com', '/');
    
    if (!htmlContent) {
      throw new Error('No content received from website');
    }

    console.log(`Received HTML content: ${htmlContent.length} characters`);
    
    const matches = parseMatches(htmlContent);
    
    // Filter for today's matches
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(match => match.matchDate === today);
    
    console.log(`Found ${matches.length} total matches, ${todayMatches.length} for today`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: todayMatches,
        totalFound: matches.length,
        todayCount: todayMatches.length,
        fetchTime: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching football data:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fetchTime: new Date().toISOString()
      })
    };
  }
};

// Function to fetch website content
function fetchWebsite(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    console.log(`Making request to https://${hostname}${path}`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`Response status: ${res.statusCode} ${res.statusMessage}`);
      
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

    req.setTimeout(15000, () => {
      req.destroy();
      console.log('Request timed out after 15 seconds');
      reject(new Error('Request timeout'));
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
    
    // Look for today's date section in HTML
    const todayPatterns = [
      `Sunday ${today.getDate()}${getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
      `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`
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
