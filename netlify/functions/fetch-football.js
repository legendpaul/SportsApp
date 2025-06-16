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
    
    // Try multiple fetch strategies for better reliability
    try {
      htmlContent = await fetchWebsiteWithRetry('www.live-footballontv.com', '/');
      fetchMethod = 'direct';
      console.log(`Successfully fetched via direct method: ${htmlContent.length} characters`);
    } catch (directError) {
      console.log('Direct fetch failed:', directError.message);
      
      // Try alternative approach with different headers
      try {
        htmlContent = await fetchWithUserAgentRotation('www.live-footballontv.com', '/');
        fetchMethod = 'user-agent-rotation';
        console.log(`Successfully fetched via user agent rotation: ${htmlContent.length} characters`);
      } catch (rotationError) {
        console.log('User agent rotation failed:', rotationError.message);
        
        // Try with different hostname variations
        try {
          htmlContent = await fetchWebsiteWithRetry('live-footballontv.com', '/');
          fetchMethod = 'alternative-hostname';
          console.log(`Successfully fetched via alternative hostname: ${htmlContent.length} characters`);
        } catch (altError) {
          console.log('All fetch methods failed:', altError.message);
          throw new Error(`All data fetching methods failed. Direct: ${directError.message}, Rotation: ${rotationError.message}, Alt: ${altError.message}`);
        }
      }
    }
    
    if (!htmlContent || htmlContent.length < 1000) {
      throw new Error(`Insufficient content received: ${htmlContent ? htmlContent.length : 0} characters`);
    }

    console.log(`Processing HTML content: ${htmlContent.length} characters via ${fetchMethod}`);
    
    const matches = parseMatches(htmlContent);
    
    // Filter for today's matches
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(match => match.matchDate === today);
    
    console.log(`Found ${matches.length} total matches, ${todayMatches.length} for today`);
    
    // Return actual results, even if empty
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
        fetchMethod: fetchMethod,
        note: todayMatches.length === 0 ? 'No matches found for today' : `Found ${todayMatches.length} matches for today`
      })
    };

  } catch (error) {
    console.error('Error fetching football data:', error);
    
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
        note: 'Failed to fetch live data'
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
        'Accept-Encoding': 'identity', // Don't use compression to avoid issues
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
      console.log('Response headers:', JSON.stringify(res.headers, null, 2));
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Following redirect to: ${res.headers.location}`);
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
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${data.substring(0, 200)}...`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Request failed: ${error.message}`);
      reject(new Error(`Request Error: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      console.log('Request timed out after 30 seconds');
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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
        'DNT': '1',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate'
      }
    };

    console.log(`Alternative fetch to https://${hostname}${path} with UA: ${randomUA.substring(0, 50)}...`);

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`Alternative response status: ${res.statusCode} ${res.statusMessage}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Alternative redirect to: ${res.headers.location}`);
        const url = new URL(res.headers.location, `https://${hostname}`);
        fetchWithUserAgentRotation(url.hostname, url.pathname + url.search)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Alternative response completed. Content length: ${data.length} characters`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Alternative HTTP ${res.statusCode}: ${res.statusMessage} - ${data.substring(0, 200)}...`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Alternative request failed: ${error.message}`);
      reject(new Error(`Alternative Request Error: ${error.message}`));
    });

    req.setTimeout(25000, () => {
      req.destroy();
      console.log('Alternative request timed out after 25 seconds');
      reject(new Error('Alternative request timeout'));
    });

    req.end();
  });
}

// Function to parse matches from HTML
function parseMatches(htmlContent) {
  console.log('Starting to parse HTML content for matches...');
  console.log(`HTML Content length: ${htmlContent.length} characters`);
  
  // Save HTML content preview for debugging
  const preview = htmlContent.substring(0, 2000);
  console.log('HTML Content preview:', preview);
  
  const matches = [];
  
  try {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    console.log(`Today's date: ${todayFormatted}`);
    
    // Look for today's date section in HTML - Dynamic date patterns
    const todayPatterns = [
      `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
      `${today.toLocaleDateString('en-US', { weekday: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-US', { month: 'long' })} ${today.getFullYear()}`,
      `${today.getDate()}${getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
      `${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getDate()}${getOrdinalSuffix(today.getDate())}, ${today.getFullYear()}`,
      // Common date patterns for June 16, 2025
      `Sunday ${today.getDate()}${getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
      `Sunday, ${today.getDate()}${getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
      `${today.getDate()}${getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
      `June ${today.getDate()}${getOrdinalSuffix(today.getDate())}, ${today.getFullYear()}`
    ];
    
    console.log('Looking for today\'s date patterns:', todayPatterns);
    
    // Find today's date section
    let todaySection = null;
    let sectionFound = false;
    
    for (const pattern of todayPatterns) {
      const patternIndex = htmlContent.indexOf(pattern);
      if (patternIndex !== -1) {
        console.log(`Found pattern "${pattern}" at index ${patternIndex}`);
        todaySection = pattern;
        sectionFound = true;
        
        // Extract content from this date section
        const fixtureStartIndex = htmlContent.indexOf('<div class="fixture"', patternIndex);
        if (fixtureStartIndex !== -1) {
          // Find the next date section or end of content
          const nextDayIndex = htmlContent.indexOf('class="fixture-date"', patternIndex + pattern.length);
          const endIndex = nextDayIndex !== -1 ? nextDayIndex : htmlContent.length;
          
          const todayFixturesSection = htmlContent.substring(fixtureStartIndex, endIndex);
          console.log(`Today's fixtures section length: ${todayFixturesSection.length}`);
          console.log(`Today's fixtures section preview:`, todayFixturesSection.substring(0, 500));
          
          const sectionMatches = parseFixturesFromHTML(todayFixturesSection, todayFormatted);
          matches.push(...sectionMatches);
        }
        break;
      }
    }
    
    if (!sectionFound) {
      console.log('Could not find today\'s date section, parsing all fixtures and filtering by patterns');
      
      // Look for ANY fixture divs in the content
      const fixtureRegex = /<div[^>]*class="[^"]*fixture[^"]*"[^>]*>/gi;
      const fixtureMatches = htmlContent.match(fixtureRegex);
      console.log(`Found ${fixtureMatches ? fixtureMatches.length : 0} fixture divs in HTML`);
      
      // Parse all fixtures and filter by today's date logic
      const allFixtures = parseAllFixturesFromHTML(htmlContent);
      console.log(`parseAllFixturesFromHTML returned ${allFixtures.length} matches`);
      
      // Set today's date for all matches found
      const todayMatches = allFixtures.map(match => ({
        ...match,
        matchDate: todayFormatted
      }));
      matches.push(...todayMatches);
    }
    
    console.log(`Parsing completed: ${matches.length} matches extracted`);
    
    // Log each match found for debugging
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}: ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition}) [${match.channels.join(', ')}]`);
    });
    
  } catch (error) {
    console.log(`Error parsing matches: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
  }
  
  return matches;
}

function parseFixturesFromHTML(htmlSection, matchDate) {
  const matches = [];
  
  try {
    console.log(`parseFixturesFromHTML called with section length: ${htmlSection.length}`);
    
    // Multiple regex patterns to catch different fixture formats
    const fixturePatterns = [
      /<div class="fixture"[^>]*>(.*?)<\/div>(?=<div class="fixture"|<div class="advertfixtures"|<div class="anchor"|<\/div>|$)/gs,
      /<div[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/div>/gs
    ];
    
    for (let patternIndex = 0; patternIndex < fixturePatterns.length; patternIndex++) {
      const fixtureRegex = fixturePatterns[patternIndex];
      fixtureRegex.lastIndex = 0; // Reset regex
      
      let match;
      let matchCount = 0;
      
      while ((match = fixtureRegex.exec(htmlSection)) !== null && matchCount < 20) {
        matchCount++;
        console.log(`Pattern ${patternIndex + 1} - Processing fixture ${matchCount}:`, match[1].substring(0, 200));
        
        const fixtureHTML = match[1];
        const parsedMatch = parseIndividualFixture(fixtureHTML, matchDate);
        
        if (parsedMatch) {
          console.log(`Successfully parsed match: ${parsedMatch.teamA} vs ${parsedMatch.teamB}`);
          matches.push(parsedMatch);
        } else {
          console.log(`Failed to parse fixture ${matchCount}`);
        }
      }
      
      console.log(`Pattern ${patternIndex + 1} found ${matchCount} fixture divs, parsed ${matches.length} matches so far`);
      
      if (matches.length > 0) {
        break; // Found matches, no need to try other patterns
      }
    }
    
  } catch (error) {
    console.log(`Error parsing fixtures section: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
  }
  
  return matches;
}

function parseAllFixturesFromHTML(htmlContent) {
  const matches = [];
  
  try {
    console.log(`parseAllFixturesFromHTML called with content length: ${htmlContent.length}`);
    
    // Try multiple fixture regex patterns
    const patterns = [
      /<div class="fixture"[^>]*>(.*?)<\/div>(?=<div class="fixture"|<div class="advertfixtures"|<div class="anchor"|$)/gs,
      /<div[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/div>/gs,
      /<article[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/article>/gs
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      console.log(`Trying pattern ${i + 1}...`);
      const regex = patterns[i];
      let match;
      let matchCount = 0;
      
      // Reset regex
      regex.lastIndex = 0;
      
      while ((match = regex.exec(htmlContent)) !== null && matchCount < 50) {
        matchCount++;
        console.log(`Pattern ${i + 1} - Match ${matchCount}:`, match[1].substring(0, 100));
        
        const fixtureHTML = match[1];
        const today = new Date().toISOString().split('T')[0];
        const parsedMatch = parseIndividualFixture(fixtureHTML, today);
        
        if (parsedMatch) {
          console.log(`Successfully parsed: ${parsedMatch.teamA} vs ${parsedMatch.teamB}`);
          matches.push(parsedMatch);
        }
      }
      
      console.log(`Pattern ${i + 1} found ${matchCount} fixtures, parsed ${matches.length} matches so far`);
      
      if (matches.length > 0) {
        break; // Found matches, no need to try other patterns
      }
    }
    
  } catch (error) {
    console.log(`Error parsing all fixtures: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
  }
  
  return matches;
}

function parseIndividualFixture(fixtureHTML, matchDate) {
  try {
    console.log(`parseIndividualFixture called with HTML:`, fixtureHTML.substring(0, 300));
    
    // Try multiple patterns for time extraction
    const timePatterns = [
      /<div class="fixture__time"[^>]*>([^<]+)<\/div>/,
      /<span class="time"[^>]*>([^<]+)<\/span>/,
      /<div[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/div>/,
      /\b(\d{1,2}:\d{2})\b/,
      /\b(\d{1,2}\.\d{2})\b/
    ];
    
    let time = null;
    for (const pattern of timePatterns) {
      const timeMatch = fixtureHTML.match(pattern);
      if (timeMatch && timeMatch[1]) {
        time = timeMatch[1].trim();
        console.log(`Found time with pattern: ${time}`);
        break;
      }
    }
    
    if (!time || time === 'TBC' || time === 'FT' || time === 'HT') {
      console.log(`No valid time found in fixture (found: ${time})`);
      return null;
    }
    
    // Try multiple patterns for teams extraction
    const teamPatterns = [
      /<div class="fixture__teams"[^>]*>([^<]+)<\/div>/,
      /<span class="teams"[^>]*>([^<]+)<\/span>/,
      /<div[^>]*class="[^"]*teams[^"]*"[^>]*>([^<]+)<\/div>/,
      /<h[2-6][^>]*>([^<]*\s+(?:v|vs|V)\s+[^<]*)<\/h[2-6]>/,
      /([A-Za-z\s&'\-\.]+)\s+(?:v|vs|V)\s+([A-Za-z\s&'\-\.]+)/
    ];
    
    let teams = null;
    for (const pattern of teamPatterns) {
      const teamsMatch = fixtureHTML.match(pattern);
      if (teamsMatch && teamsMatch[1]) {
        const teamsText = teamsMatch[1].trim();
        console.log(`Found teams text: ${teamsText}`);
        teams = parseTeamsFromText(teamsText);
        if (teams) {
          console.log(`Successfully parsed teams: ${teams.teamA} vs ${teams.teamB}`);
          break;
        }
      }
    }
    
    if (!teams) {
      console.log(`No valid teams found in fixture`);
      return null;
    }
    
    // Try multiple patterns for competition
    const competitionPatterns = [
      /<div class="fixture__competition"[^>]*>([^<]+)<\/div>/,
      /<span class="competition"[^>]*>([^<]+)<\/span>/,
      /<div[^>]*class="[^"]*competition[^"]*"[^>]*>([^<]+)<\/div>/
    ];
    
    let competition = 'Football';
    for (const pattern of competitionPatterns) {
      const competitionMatch = fixtureHTML.match(pattern);
      if (competitionMatch && competitionMatch[1]) {
        competition = cleanHTML(competitionMatch[1].trim());
        console.log(`Found competition: ${competition}`);
        break;
      }
    }
    
    // Extract channels
    const channels = parseChannelsFromHTML(fixtureHTML);
    console.log(`Found channels:`, channels);
    
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
    
    console.log(`Successfully created match object: ${matchObj.teamA} vs ${matchObj.teamB} at ${matchObj.time}`);
    
    return matchObj;
    
  } catch (error) {
    console.log(`Error parsing individual fixture: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    return null;
  }
}

function parseTeamsFromText(teamsText) {
  try {
    const cleanText = teamsText.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').trim();
    
    const patterns = [
      /^(.+?)\s+v\s+(.+)$/i,
      /^(.+?)\s+vs\s+(.+)$/i,
      /^(.+?)\s+V\s+(.+)$/,
      /(.+?)\s+-\s+(.+)/,
      /(.+?)\s+@\s+(.+)/ // Sometimes uses @ instead of vs
    ];
    
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match && match[1] && match[2]) {
        let teamA = match[1].trim();
        let teamB = match[2].trim();
        
        // Clean up team names
        teamA = teamA.replace(/^\W+|\W+$/g, ''); // Remove leading/trailing non-word chars
        teamB = teamB.replace(/^\W+|\W+$/g, '');
        
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
  
  // UK TV Channel mappings - comprehensive list
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
    'Channel 5': 'Channel 5',
    'Sky Sports Premier League': 'Sky Sports Premier League',
    'Sky Sports Football': 'Sky Sports Football',
    'Sky Sports Main Event': 'Sky Sports Main Event',
    'Sky Sports Action': 'Sky Sports Action',
    'TNT Sports': 'TNT Sports',
    'TNT Sports 1': 'TNT Sports 1',
    'TNT Sports 2': 'TNT Sports 2',
    'TNT Sports 3': 'TNT Sports 3',
    'Premier Sports 1': 'Premier Sports 1',
    'Premier Sports 2': 'Premier Sports 2',
    'Amazon Prime Video': 'Amazon Prime Video',
    'Discovery+': 'Discovery+',
    'Eurosport 1': 'Eurosport 1',
    'Eurosport 2': 'Eurosport 2'
  };
  
  try {
    // Multiple patterns to catch different channel formats
    const channelPatterns = [
      /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g,
      /<div[^>]*class="[^"]*channel[^"]*"[^>]*>([^<]+)<\/div>/g,
      /<span[^>]*class="[^"]*channel[^"]*"[^>]*>([^<]+)<\/span>/g
    ];
    
    for (const pattern of channelPatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(fixtureHTML)) !== null) {
        const channelText = cleanHTML(match[1].trim());
        const mappedChannel = channelMappings[channelText] || channelText;
        
        if (mappedChannel && 
            mappedChannel !== 'Check TV Guide' && 
            !channels.includes(mappedChannel) &&
            mappedChannel.length > 1) {
          channels.push(mappedChannel);
        }
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
    .replace(/\s+/g, ' ')
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
