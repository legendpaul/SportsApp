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

function shouldExcludeMatch(teamA, teamB, competition) {
  // List of keywords to exclude (case insensitive)
  const excludeKeywords = ['women', 'u17', 'u 17', 'u18', 'u 18', 'u19', 'u 19', 'u20', 'u 20'];
  
  // Combine all text to check
  const textToCheck = `${teamA} ${teamB} ${competition}`.toLowerCase();
  
  // Check if any exclude keyword is present
  for (const keyword of excludeKeywords) {
    if (textToCheck.includes(keyword)) {
      console.log(`[DATA] Excluding match: "${teamA} vs ${teamB}" (${competition}) - contains "${keyword}"`);
      return true;
    }
  }
  
  return false;
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

    // Filter out women's and youth matches
    if (shouldExcludeMatch(teams.teamA, teams.teamB, competition)) {
      return null;
    }

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
    const MAX_FIXTURES_TO_PARSE_FALLBACK = 100; // Cap for fallback scenario
    let fixturesProcessedCount = 0;
    console.log(`[DATA] Starting to parse all fixtures from HTML content (fallback mode, cap: ${MAX_FIXTURES_TO_PARSE_FALLBACK})...`);

    try {
        const dateSectionRegex = /<div class="fixture-date"[^>]*>([^<]+)<\/div>/g;
        let dateSectionMatch;

        while ((dateSectionMatch = dateSectionRegex.exec(htmlContent)) !== null) {
            if (fixturesProcessedCount >= MAX_FIXTURES_TO_PARSE_FALLBACK) {
                console.log(`[DATA] Fallback parsing cap (${MAX_FIXTURES_TO_PARSE_FALLBACK}) reached. Stopping further processing of all fixtures.`);
                break;
            }

            const dateHeaderText = dateSectionMatch[1].trim();
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

            const matchDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log(`[DATA] Parsed date as: ${matchDate}`);

            const currentSectionContentStart = dateSectionMatch.index + dateSectionMatch[0].length;

            // Find the start of the *next* date header to define the end of the current date's fixtures
            // Use indexOf for this search to avoid interfering with the main dateSectionRegex's lastIndex
            const nextDateHeaderGlobalIndex = htmlContent.indexOf('<div class="fixture-date"', currentSectionContentStart);
            const currentSectionContentEnd = (nextDateHeaderGlobalIndex !== -1) ? nextDateHeaderGlobalIndex : htmlContent.length;

            const fixturesHTMLForDate = htmlContent.substring(currentSectionContentStart, currentSectionContentEnd);

            const dateMatches = parseFixturesFromHTML(fixturesHTMLForDate, matchDate);

            for (const match of dateMatches) {
                if (fixturesProcessedCount >= MAX_FIXTURES_TO_PARSE_FALLBACK) {
                    console.log(`[DATA] Fallback parsing cap (${MAX_FIXTURES_TO_PARSE_FALLBACK}) reached during match addition. Halting.`);
                    break;
                }
                matches.push(match);
                fixturesProcessedCount++;
            }

            if (dateMatches.length > 0) {
                 console.log(`[DATA] Found and processed ${dateMatches.length} matches for ${matchDate}. Total processed so far: ${fixturesProcessedCount}`);
            }
            // The main dateSectionRegex.lastIndex is automatically handled by the .exec() in the while loop condition.
            // No need to manually adjust dateSectionRegex.lastIndex here.
            if (fixturesProcessedCount >= MAX_FIXTURES_TO_PARSE_FALLBACK) break; // Check cap before next iteration of outer while loop
        }

        // Fallback for content without any date sections, or if initial date sections yield no matches and still under cap
        if (matches.length === 0 && fixturesProcessedCount < MAX_FIXTURES_TO_PARSE_FALLBACK && htmlContent.indexOf('<div class="fixture-date"') === -1) {
             console.log("[DATA] No date sections found in HTML, or no matches from date sections and still under cap. Attempting to parse all raw fixture divs from page (up to cap).");
             const today = new Date().toISOString().split('T')[0]; // Default date if no context
             const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
             let rawMatch;
             let rawFixturesParsedThisPass = 0;
             while ((rawMatch = fixtureRegex.exec(htmlContent)) !== null) {
                 if (fixturesProcessedCount >= MAX_FIXTURES_TO_PARSE_FALLBACK) {
                     console.log(`[DATA] Fallback parsing cap (${MAX_FIXTURES_TO_PARSE_FALLBACK}) reached during raw fixture parsing.`);
                     break;
                 }
                 const fixtureHTML = rawMatch[1];
                 const parsedMatch = parseIndividualFixture(fixtureHTML, today);
                 if (parsedMatch) {
                     matches.push(parsedMatch);
                     fixturesProcessedCount++;
                     rawFixturesParsedThisPass++;
                 }
             }
             if (rawFixturesParsedThisPass > 0) {
                console.log(`[DATA] Parsed ${rawFixturesParsedThisPass} raw fixtures (total processed: ${fixturesProcessedCount}). Assigned today's date as fallback.`);
             }
        }

    } catch (error) {
        console.log(`[DATA] Error parsing all fixtures by date (fallback mode): ${error.message}`);
    }
    console.log(`[DATA] Total matches parsed in fallback mode: ${matches.length} (Processed fixture count: ${fixturesProcessedCount})`);
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

    console.log(`[HANDLER] HTML content received (${htmlContent.length} chars). Attempting optimized parse for today...`);

    const today = new Date();
    const todayDateStringYMD = today.toISOString().split('T')[0]; // YYYY-MM-DD for matchDate property

    // Generate date string pattern: e.g., "Sunday 1st July 2024"
    const dayOfMonth = today.getDate();
    const todayDatePattern = `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`;
    console.log(`[HANDLER] Generated today's date pattern: "${todayDatePattern}"`);

    let parsedMatches = [];
    let totalParsedOnPage = 0; // To count all matches if we do a full parse

    const todaySectionHeaderIndex = htmlContent.indexOf(todayDatePattern);

    if (todaySectionHeaderIndex !== -1) {
      console.log(`[HANDLER] Found today's date section header: "${todayDatePattern}" at index ${todaySectionHeaderIndex}.`);

      // Determine start of fixtures for today
      // Look for the first <div class="fixture"> after today's date header
      const fixtureSearchStartIndex = todaySectionHeaderIndex + todayDatePattern.length;
      const firstFixtureIndexInTodaySection = htmlContent.indexOf('<div class="fixture">', fixtureSearchStartIndex);

      if (firstFixtureIndexInTodaySection !== -1) {
        // Determine end of today's section
        // It's before the next <div class="fixture-date" or end of content
        const nextDateHeaderPattern = '<div class="fixture-date"';
        const nextDateHeaderIndex = htmlContent.indexOf(nextDateHeaderPattern, fixtureSearchStartIndex);

        let todaySectionEndIndex;
        if (nextDateHeaderIndex !== -1) {
          todaySectionEndIndex = nextDateHeaderIndex;
          console.log(`[HANDLER] Next date header found at index ${nextDateHeaderIndex}. Today's section ends before it.`);
        } else {
          // If no next date header, parse till a reasonable end or end of file.
          // This might need refinement if the page has a lot of trailing content.
          // For now, let's assume it goes to the end of the file or a common footer.
          // A common way to limit this is to find the end of the main fixtures container if known.
          // For simplicity, using htmlContent.length, parseFixturesFromHTML will handle multiple fixtures.
          todaySectionEndIndex = htmlContent.length;
          console.log("[HANDLER] No next date header found, assuming today's section continues to end of content.");
        }

        const todayHTMLSnippet = htmlContent.substring(firstFixtureIndexInTodaySection, todaySectionEndIndex);
        console.log(`[HANDLER] Extracted HTML snippet for today (length: ${todayHTMLSnippet.length} chars). Parsing snippet...`);

        parsedMatches = parseFixturesFromHTML(todayHTMLSnippet, todayDateStringYMD);
        totalParsedOnPage = parsedMatches.length; // In this optimized path, totalParsed is just today's matches.

        console.log(`[HANDLER] Parsed ${parsedMatches.length} matches from today's snippet.`);

        // If snippet parsing yields no matches, it might be an empty day or parsing issue
        // Consider fallback if parsedMatches.length === 0 here? For now, trust the snippet.
      } else {
        console.log("[HANDLER] Today's date header found, but no fixtures (<div class=\"fixture\">) found immediately after it. Will attempt full parse.");
        // Fall through to full parse
      }
    } else {
      console.log("[HANDLER] Today's date section header not found. Attempting full parse of the page.");
      // Fall through to full parse
    }

    // Fallback: If today's section wasn't found, or if logic dictates a full parse (e.g., snippet parse failed)
    if (parsedMatches.length === 0 && todaySectionHeaderIndex === -1) { // Only do full parse if section not found at all
        console.log("[HANDLER] Fallback: Executing parseAllFixturesFromHTML for the entire page content.");
        const allFixturesOnPage = parseAllFixturesFromHTML(htmlContent);
        totalParsedOnPage = allFixturesOnPage.length;
        // Filter for today after full parse
        parsedMatches = allFixturesOnPage.filter(match => match.matchDate === todayDateStringYMD);
        console.log(`[HANDLER] Full parse yielded ${allFixturesOnPage.length} matches, ${parsedMatches.length} are for today.`);
    } else if (parsedMatches.length === 0 && todaySectionHeaderIndex !== -1) {
        console.log("[HANDLER] Today's section was found and snippet parsed, but resulted in 0 matches. Assuming it's an empty day or snippet was not conclusive. Not falling back to full parse to save resources.");
        // We already parsed the specific snippet and got 0, so we trust that for an empty day.
        // If we wanted to be more aggressive, we could trigger full parse here too.
    }


    console.log(`[HANDLER] Final processing: ${parsedMatches.length} matches for today (${todayDateStringYMD}).`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        matches: parsedMatches, // Matches for today
        totalFound: totalParsedOnPage, // Total matches found in the scope of parsing (snippet or full)
        todayCount: parsedMatches.length,    // Count for today
        fetchTime: new Date().toISOString(),
        source: 'live-footballontv.com',
        note: parsedMatches.length > 0 ? 'Live football data from live-footballontv.com' : 'No live matches found today on live-footballontv.com'
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
