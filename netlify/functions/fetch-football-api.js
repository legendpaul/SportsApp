const https = require('https');

// UK TV Channel mappings and names
const channelMappings = {
  'BBC One': 'BBC One',
  'BBC Two': 'BBC Two',
  'BBC Three': 'BBC Three',
  'BBC Four': 'BBC Four',
  'BBC One Wales': 'BBC One Wales',
  'BBC One Scotland': 'BBC One Scotland',
  'BBC One NI': 'BBC One NI',
  'BBC Two Wales': 'BBC Two Wales',
  'BBC Scotland': 'BBC Scotland',
  'BBC Two NI': 'BBC Two NI',
  'BBC iPlayer': 'BBC iPlayer',
  'BBC Sport Website': 'BBC Sport Website',
  'BBC Red Button': 'BBC Red Button',
  'ITV1': 'ITV1',
  'ITV2': 'ITV2',
  'ITV3': 'ITV3',
  'ITV4': 'ITV4',
  'ITVX': 'ITVX',
  'STV': 'STV',
  'STV Player': 'STV Player',
  'Channel 4': 'Channel 4',
  'Channel 4 Online': 'Channel 4 Online',
  'Channel 4 Sport YouTube': 'Channel 4 Sport YouTube',
  '4seven': '4seven',
  'Sky Sports Premier League': 'Sky Sports Premier League',
  'Sky Sports Football': 'Sky Sports Football',
  'Sky Sports': 'Sky Sports',
  'Sky Sports Main Event': 'Sky Sports Main Event',
  'TNT Sports': 'TNT Sports',
  'TNT Sports 1': 'TNT Sports 1',
  'TNT Sports 2': 'TNT Sports 2',
  'TNT Sports 3': 'TNT Sports 3',
  'BT Sport': 'BT Sport', // Keep BT Sport for older entries if any, map to TNT
  'Premier Sports': 'Premier Sports',
  'Premier Sports 1': 'Premier Sports 1',
  'Premier Sports 2': 'Premier Sports 2',
  'S4C': 'S4C',
  'S4C Online': 'S4C Online',
  'Amazon Prime Video': 'Amazon Prime Video',
  'Discovery+': 'Discovery+',
  'DAZN': 'DAZN',
  'ESPN': 'ESPN',
  'ESPN+': 'ESPN+',
  'Eurosport': 'Eurosport',
  '5': 'Channel 5',
  '5Action': '5Action',
  'UEFA.tv': 'UEFA.tv',
  'FIFA+': 'FIFA+',
  'LOITV': 'LOITV',
  'NWSL+': 'NWSL+',
  'Apple TV': 'Apple TV',
  'Youth Football Arena': 'Youth Football Arena'
};

// --- Helper Functions (adapted from matchFetcher.js) ---

function makeWebRequest(baseUrl, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseUrl,
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
        'Accept-Encoding': 'identity', // To simplify, request uncompressed content
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    console.log(`[REQUESTS] Making request to https://${baseUrl}${endpoint}`);

    const req = https.request(options, (res) => {
      let data = '';
      console.log(`[REQUESTS] Response status: ${res.statusCode} ${res.statusMessage}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`[REQUESTS] Response completed. Content length: ${data.length} characters`);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Website Error: ${res.statusCode} - ${data.substring(0, 200)}...`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`[REQUESTS] Request failed: ${error.message}`);
      reject(new Error(`Request Error: ${error.message}`));
    });

    req.setTimeout(20000, () => { // Increased timeout to 20s
      req.destroy();
      console.log('[REQUESTS] Request timed out after 20 seconds');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function getOrdinalSuffix(day) {
  const j = day % 10;
  const k = day % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
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
        if (teamA.length >= 1 && teamB.length >= 1 && teamA !== teamB) { // Relaxed length to 1
          return { teamA, teamB };
        }
      }
    }
    console.log(`[DATA] Could not parse teams from: "${teamsText}"`);
  } catch (error) {
    console.log(`[DATA] Error parsing teams from "${teamsText}": ${error.message}`);
  }
  return null;
}

function parseChannelsFromHTML(fixtureHTML) {
  const channels = [];
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
    console.log(`[DATA] Error parsing channels: ${error.message}`);
  }
  return channels;
}

function parseIndividualFixture(fixtureHTML, matchDate) {
  try {
    const timeMatch = fixtureHTML.match(/<div class="fixture__time">([^<]+)<\/div>/);
    if (!timeMatch) return null;
    const time = timeMatch[1].trim();
    if (time === 'TBC' || time === 'Postponed' || time === 'Cancelled') return null;

    const teamsMatch = fixtureHTML.match(/<div class="fixture__teams">([^<]+)<\/div>/);
    if (!teamsMatch) return null;
    const teamsText = teamsMatch[1].trim();
    const teams = parseTeamsFromText(teamsText);
    if (!teams) return null;

    const competitionMatch = fixtureHTML.match(/<div class="fixture__competition">([^<]+)<\/div>/);
    const competition = competitionMatch ? cleanHTML(competitionMatch[1].trim()) : 'Football';

    const channels = parseChannelsFromHTML(fixtureHTML);

    const matchObj = {
      id: `lfo_${matchDate}_${teams.teamA.replace(/\s+/g, '')}_${teams.teamB.replace(/\s+/g, '')}_${time.replace(':','')}`,
      time: time,
      teamA: teams.teamA,
      teamB: teams.teamB,
      competition: competition,
      channel: channels.length > 0 ? channels.join(', ') : 'Check TV Guide',
      channels: channels.length > 0 ? channels : ['Check TV Guide'],
      status: 'upcoming', // Default status
      createdAt: new Date().toISOString(),
      matchDate: matchDate, // YYYY-MM-DD format
      apiSource: 'live-footballontv.com',
      venue: '' // Venue is not typically available on this site
    };
    // console.log(`[DATA] Parsed match: ${teams.teamA} vs ${teams.teamB} at ${time}`);
    return matchObj;
  } catch (error) {
    console.log(`[DATA] Error parsing individual fixture: ${error.message}`, fixtureHTML);
    return null;
  }
}

function parseFixturesFromHTML(htmlSection, specificMatchDate) {
    const matches = [];
    try {
        const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
        let match;
        while ((match = fixtureRegex.exec(htmlSection)) !== null) {
            const fixtureHTML = match[1];
            const parsedMatch = parseIndividualFixture(fixtureHTML, specificMatchDate);
            if (parsedMatch) {
                matches.push(parsedMatch);
            }
        }
    } catch (error) {
        console.log(`[DATA] Error parsing fixtures section for ${specificMatchDate}: ${error.message}`);
    }
    return matches;
}

function parseAllFixturesFromHTML(htmlContent) {
    const matches = [];
    console.log('[DATA] Starting to parse all fixtures from HTML content...');
    try {
        // Regex to find date sections. Example: <div class="fixture-date">Saturday 1st July 2023</div>
        const dateSectionRegex = /<div class="fixture-date"[^>]*>([^<]+)<\/div>/g;
        let dateSectionMatch;
        let lastIndex = 0;

        while ((dateSectionMatch = dateSectionRegex.exec(htmlContent)) !== null) {
            const dateHeaderText = dateSectionMatch[1].trim(); // e.g., "Saturday 1st July 2023"
            console.log(`[DATA] Found date header: ${dateHeaderText}`);

            // Attempt to parse this date string into YYYY-MM-DD
            // This is tricky due to format "Saturday 1st July 2023"
            // A robust solution would use a date parsing library or more complex regex
            const dateParts = dateHeaderText.match(/(\d+)(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/);
            if (!dateParts) {
                console.log(`[DATA] Could not parse date from header: ${dateHeaderText}`);
                continue;
            }
            const day = dateParts[1];
            const monthName = dateParts[2];
            const year = dateParts[3];

            // Convert month name to month number
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const month = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());

            if (month === -1) {
                console.log(`[DATA] Invalid month name: ${monthName}`);
                continue;
            }

            // Format to YYYY-MM-DD
            const matchDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log(`[DATA] Parsed date as: ${matchDate}`);

            // Define the section of HTML for this date
            const currentSectionStart = dateSectionMatch.index + dateSectionMatch[0].length;
            let nextDateSectionMatch = dateSectionRegex.exec(htmlContent); // find next date
            dateSectionRegex.lastIndex = dateSectionMatch.index + dateSectionMatch[0].length; // Reset search for next iteration from current

            const currentSectionEnd = nextDateSectionMatch ? nextDateSectionMatch.index : htmlContent.length;

            const fixturesHTMLForDate = htmlContent.substring(currentSectionStart, currentSectionEnd);

            const dateMatches = parseFixturesFromHTML(fixturesHTMLForDate, matchDate);
            if(dateMatches.length > 0){
                console.log(`[DATA] Found ${dateMatches.length} matches for ${matchDate}`);
                matches.push(...dateMatches);
            }
            lastIndex = currentSectionEnd;
             if (nextDateSectionMatch) { // reset lastIndex for the regex if we jumped ahead
                dateSectionRegex.lastIndex = nextDateSectionMatch.lastIndex;
            } else {
                break; // No more date sections
            }
        }
        if (matches.length === 0) {
             console.log("[DATA] No date sections found, trying to parse all fixtures without date context.");
             // Fallback if no date sections are found, parse all and assign today's date
             const today = new Date().toISOString().split('T')[0];
             const allRawFixturesHtml = htmlContent.match(/<div class="fixture">(.*?)<\/div>/gs) || [];
             allRawFixturesHtml.forEach(fixtureHTML => {
                 const parsedMatch = parseIndividualFixture(fixtureHTML, today);
                 if (parsedMatch) matches.push(parsedMatch);
             });
        }


    } catch (error) {
        console.log(`[DATA] Error parsing all fixtures by date: ${error.message}`);
    }
    console.log(`[DATA] Total matches parsed: ${matches.length}`);
    return matches;
}


// --- Netlify Function Handler ---
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('[HANDLER] Fetching football data from live-footballontv.com...');
  const siteBaseUrl = 'www.live-footballontv.com';
  const endpoint = '/'; // Fetch the main page

  try {
    const htmlContent = await makeWebRequest(siteBaseUrl, endpoint);
    if (!htmlContent) {
      throw new Error('No HTML content received from live-footballontv.com');
    }

    console.log(`[HANDLER] HTML content received (${htmlContent.length} chars). Parsing matches...`);
    // const allParsedMatches = parseMatches(htmlContent); // This function was the old entry point
    const allParsedMatches = parseAllFixturesFromHTML(htmlContent);


    const todayDateString = new Date().toISOString().split('T')[0];
    console.log(`[HANDLER] Filtering for today's matches: ${todayDateString}`);

    const todayMatches = allParsedMatches.filter(match => match.matchDate === todayDateString);

    console.log(`[HANDLER] Found ${allParsedMatches.length} total matches, ${todayMatches.length} for today.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: todayMatches, // Return only today's matches
        totalFound: allParsedMatches.length, // Total parsed from page
        todayCount: todayMatches.length,    // Count for today
        fetchTime: new Date().toISOString(),
        source: 'live-footballontv.com',
        note: todayMatches.length > 0 ? 'Live football data from live-footballontv.com' : 'No live matches found today on live-footballontv.com'
      })
    };

  } catch (error) {
    console.error('[HANDLER] Error in fetch-football-api handler:', error.message, error.stack);
    return {
      statusCode: 200, // Return 200 but with success: false as per original error structure
      headers,
      body: JSON.stringify({
        success: false,
        matches: [],
        totalFound: 0,
        todayCount: 0,
        fetchTime: new Date().toISOString(),
        source: 'live-footballontv.com',
        error: error.message,
        note: 'Failed to fetch or parse data from live-footballontv.com'
      })
    };
  }
};
