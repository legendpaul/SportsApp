const https = require('https');
// const { URL } = require('url'); // Not strictly needed for this implementation

// --- Google Scraping Utilities (adapted from googleUFCScraper.js) ---

/**
 * Performs a Google search and returns HTML content.
 * Ensures hl=en and gl=uk for UK-localized results.
 * @param {string} query - Search query
 * @returns {Promise<string>} HTML content
 */
function performGoogleSearch(query) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    // Force English language (hl=en) and UK region (gl=uk)
    const searchPath = `/search?q=${encodedQuery}&hl=en&gl=uk&ie=UTF-8`;

    const options = {
      hostname: 'www.google.com',
      path: searchPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
        // 'Accept-Encoding': 'gzip, deflate', // Let Netlify/Node handle this
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    console.log(`[GoogleSearch] Requesting: https://${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      // let stream = res; // Simpler handling without explicit gzip if Node's http handles it

      // if (res.headers['content-encoding'] === 'gzip') {
      //   console.log('[GoogleSearch] Response is gzipped. Inflating...');
      //   stream = require('zlib').createGunzip();
      //   res.pipe(stream);
      // }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`[GoogleSearch] Response ended. Status: ${res.statusCode}, Length: ${data.length}`);
        if (res.statusCode === 200) {
          // Log the beginning of the HTML content for debugging
          console.log("--- START OF GOOGLE HTML LOG ---");
          console.log(data.substring(0, 15000)); // Log the first 15000 characters
          console.log("--- END OF GOOGLE HTML LOG ---");
          resolve(data);
        } else {
          // Also log partial data on error if any was received
          if (data && data.length > 0) {
            console.log("--- START OF GOOGLE HTML LOG (ERROR RESPONSE) ---");
            console.log(data.substring(0, 15000));
            console.log("--- END OF GOOGLE HTML LOG (ERROR RESPONSE) ---");
          }
          reject(new Error(`Google search failed with status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[GoogleSearch] Request error: ${error.message}`, error);
      reject(new Error(`Google request error: ${error.message}`));
    });

    req.setTimeout(15000, () => { // 15 seconds timeout
      req.destroy();
      console.error('[GoogleSearch] Request timed out.');
      reject(new Error('Google search timeout'));
    });

    req.end();
  });
}

/**
 * Parses a time string (e.g., "8:00 PM") into 24-hour format object.
 * @param {string} timeStr - The time string.
 * @returns {object|null} Parsed time { hours, minutes, formatted_24h } or null.
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  try {
    const timeMatch = timeStr.match(/(\d{1,2})[:.]?(\d{2})\s?(PM|AM|pm|am)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (isNaN(hours) || isNaN(minutes)) return null;

      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) { // Midnight case
        hours = 0;
      }
      return {
        hours: hours,
        minutes: minutes,
        formatted_24h: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      };
    }
  } catch (error) {
    console.error(`[ParseTime] Error parsing time string "${timeStr}": ${error.message}`);
  }
  return null;
}

const monthMap = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

function getOrdinalSuffix(day) {
    const j = day % 10, k = day % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
}


/**
 * Attempts to determine if a given month (0-11) in a given year is likely BST (UTC+1) or GMT (UTC+0) for the UK.
 * This is a heuristic. BST typically starts last Sunday of March and ends last Sunday of October.
 * @param {number} year - Full year
 * @param {number} monthIndex - 0-11 (Jan-Dec)
 * @param {number} dayOfMonth - 1-31
 * @returns {number} UTC offset: 0 for GMT, 1 for BST.
 */
function getUKTimezoneOffset(year, monthIndex, dayOfMonth) {
    // BST rules: Starts last Sunday of March, ends last Sunday of October.
    if (monthIndex < 2 || monthIndex > 9) return 0; // Jan, Feb, Nov, Dec are GMT

    if (monthIndex > 2 && monthIndex < 9) return 1; // Apr, May, Jun, Jul, Aug, Sep are BST

    // March: BST from last Sunday.
    if (monthIndex === 2) {
        const lastSundayOfMarch = new Date(year, monthIndex + 1, 0); // Last day of March
        lastSundayOfMarch.setDate(lastSundayOfMarch.getDate() - lastSundayOfMarch.getDay()); // Roll back to Sunday
        return dayOfMonth >= lastSundayOfMarch.getDate() ? 1 : 0;
    }
    // October: BST until last Sunday.
    if (monthIndex === 9) {
        const lastSundayOfOctober = new Date(year, monthIndex + 1, 0); // Last day of Oct
        lastSundayOfOctober.setDate(lastSundayOfOctober.getDate() - lastSundayOfOctober.getDay()); // Roll back to Sunday
        return dayOfMonth < lastSundayOfOctober.getDate() ? 1 : 0;
    }
    return 0; // Should not happen
}


/**
 * Parses UFC event data from Google search results HTML.
 * @param {string} html - The HTML content of the Google search results page.
 * @returns {Array<object>} An array of parsed UFC event objects.
 */
function parseUFCEventsFromGoogleHTML(html) {
  const events = [];
  console.log('[ParseHTML] Starting to parse UFC events from Google HTML.');

  // This is highly dependent on Google's current HTML structure, which can change.
  // Looking for common patterns for event blocks.
  // Example structure (simplified): A block containing title, date, time, venue.
  // This needs to be adapted based on actual Google SERP for "UFC schedule UK time" etc.
  // For now, let's assume a simplified structure or a known Knowledge Panel structure.

  // Regex to find a potential main event card / knowledge panel
  // This is a placeholder and needs to be very specific to Google's output
  // Let's try to find a common pattern for an event: "UFC Fight Night: [Fighter1] vs [Fighter2]" or "UFC [Number]: ..."
  // And then look for date/time information near it.

  // Simplified: Look for a pattern that might indicate an event block.
  // This will be VERY fragile.
  // Example: Find "UFC Fight Night" or "UFC \d+" then look around it.
  const eventTitleRegex = /(UFC\s*\d{3,}|UFC\s*Fight\s*Night:[^<]+)/gi;
  let eventBlockMatch;
  let searchIndex = 0;

  // Limiting to find just one or two events to start.
  while((eventBlockMatch = eventTitleRegex.exec(html)) !== null && events.length < 2) {
      const eventTitle = eventBlockMatch[1].trim();
      console.log(`[ParseHTML] Potential event title found: "${eventTitle}" at index ${eventBlockMatch.index}`);

      // Define a reasonable snippet of HTML around this title to search for details
      const searchSnippetStart = Math.max(0, eventBlockMatch.index - 500);
      const searchSnippetEnd = Math.min(html.length, eventBlockMatch.index + eventTitle.length + 1500); // Increased search area
      const snippet = html.substring(searchSnippetStart, searchSnippetEnd);

      let parsedDate = null;
      let parsedTimeUK = null; // e.g., { hours, minutes, formatted_24h }
      let dayOfWeekShort = null; // "Sat", "Sun"

      // 1. Extract Date (e.g., "Sat, 22 Jun", "Saturday, June 22", "Jun 22")
      // Regex patterns for dates - prioritize more specific ones
      const datePatterns = [
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+([A-Za-z]+)\s+(\d{1,2})/i, // "Sat, Jun 22" or "Saturday, June 22"
          /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i, // "June 22, 2025"
          /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i, // "22 June 2025"
      ];

      let year = new Date().getFullYear(); // Assume current year unless specified
      let month = -1;
      let day = -1;

      for (const pattern of datePatterns) {
          const dateMatch = snippet.match(pattern);
          if (dateMatch) {
              console.log(`[ParseHTML] Date pattern matched: ${dateMatch[0]}`);
              if (dateMatch.length === 4 && monthMap[dateMatch[2].toLowerCase()]) { // "Sat, Jun 22" or "June 22, 2025" (if year present)
                  dayOfWeekShort = dateMatch[1].substring(0,3);
                  month = monthMap[dateMatch[2].toLowerCase()];
                  day = parseInt(dateMatch[3], 10);
                  if (dateMatch[4] && dateMatch[2].match(/^\d{4}$/)) year = parseInt(dateMatch[2],10); // if "June 2025, 22" (unlikely)
                  else if (dateMatch[4]) year = parseInt(dateMatch[4],10); // "June 22, 2025"
              } else if (dateMatch.length === 4 && monthMap[dateMatch[1].toLowerCase()]) { // "June 22, 2025"
                  month = monthMap[dateMatch[1].toLowerCase()];
                  day = parseInt(dateMatch[2], 10);
                  year = parseInt(dateMatch[3], 10);
              } else if (dateMatch.length === 4 && monthMap[dateMatch[2].toLowerCase()]) { // "22 June 2025"
                  day = parseInt(dateMatch[1], 10);
                  month = monthMap[dateMatch[2].toLowerCase()];
                  year = parseInt(dateMatch[3], 10);
              }
              if (day !== -1 && month !== -1) {
                  parsedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  console.log(`[ParseHTML] Parsed date: ${parsedDate} (Day: ${dayOfWeekShort || 'N/A'})`);
                  break;
              }
          }
      }
      if (!parsedDate) {
          console.log("[ParseHTML] Could not parse specific date for event. Skipping.");
          continue;
      }

      // 2. Extract UK Time (e.g., "8:00 PM UK", "Main event: 9:00 PM", "Prelims 6pm BST")
      // Prioritize "UK", "BST", "GMT"
      const timePatternsUK = [
          /(Main\s*Card|Event).*?(\d{1,2}[:.]\d{2}\s*(?:PM|AM))\s*(UK|BST|GMT)?/i, // "Main Card 8:00 PM UK"
          /(\d{1,2}[:.]\d{2}\s*(?:PM|AM))\s*(UK|BST|GMT)/i, // "8:00 PM UK"
          /(Prelims|Undercard).*?(\d{1,2}[:.]\d{2}\s*(?:PM|AM))\s*(UK|BST|GMT)?/i, // "Prelims 6:00 PM BST"
      ];

      let mainCardTimeStr = null;
      let prelimTimeStr = null;
      let isBST = false; // Default to GMT (UTC+0) unless BST is specified or inferred for summer

      for (const pattern of timePatternsUK) {
          const timeMatch = snippet.match(pattern);
          if (timeMatch) {
              console.log(`[ParseHTML] UK Time pattern matched: ${timeMatch[0]}`);
              const timePortion = timeMatch[2];
              const zone = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
              if (zone === 'BST') isBST = true;

              if (timeMatch[0].toLowerCase().includes('main')) {
                  mainCardTimeStr = timePortion;
              } else if (timeMatch[0].toLowerCase().includes('prelim')) {
                  prelimTimeStr = timePortion;
              } else if (!mainCardTimeStr) { // General UK time if no specific card mentioned yet
                  mainCardTimeStr = timePortion;
              }
          }
      }

      // Fallback if no explicit "UK/BST/GMT" found, look for general times if we are sure it's a UK SERP
      if (!mainCardTimeStr) {
          const generalTimeMatch = snippet.match(/Main\s*Event\D*(\d{1,2}:\d{2}\s*pm)/i);
          if(generalTimeMatch && generalTimeMatch[1]) mainCardTimeStr = generalTimeMatch[1];
      }
      if (!prelimTimeStr) {
          const generalPrelimMatch = snippet.match(/Prelims\D*(\d{1,2}:\d{2}\s*pm)/i);
          if(generalPrelimMatch && generalPrelimMatch[1]) prelimTimeStr = generalPrelimMatch[1];
      }


      if (!mainCardTimeStr) {
          console.log("[ParseHTML] Could not find main card UK time. Skipping event.");
          continue;
      }

      parsedTimeUK = parseTimeString(mainCardTimeStr);
      let parsedPrelimTimeUK = prelimTimeStr ? parseTimeString(prelimTimeStr) : null;

      if (!parsedTimeUK) {
          console.log("[ParseHTML] Failed to parse main card time string. Skipping event.");
          continue;
      }

      // Determine UTC offset based on date and BST flag
      const ukOffsetHours = isBST ? 1 : getUKTimezoneOffset(year, month, day);

      // Create Date object for main card in UTC
      const mainCardDateUTC = new Date(Date.UTC(year, month, day, parsedTimeUK.hours, parsedTimeUK.minutes, 0));
      mainCardDateUTC.setUTCHours(mainCardDateUTC.getUTCHours() - ukOffsetHours); // Adjust from UK local to UTC

      let prelimDateUTC = null;
      if (parsedPrelimTimeUK) {
          prelimDateUTC = new Date(Date.UTC(year, month, day, parsedPrelimTimeUK.hours, parsedPrelimTimeUK.minutes, 0));
          prelimDateUTC.setUTCHours(prelimDateUTC.getUTCHours() - ukOffsetHours);
      }

      // Format for display "Sat 20:00"
      const displayTimeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' };
      // Re-create a local UK date object to format it correctly for UK display string
      const tempMainEventDateForDisplay = new Date(year, month, day, parsedTimeUK.hours, parsedTimeUK.minutes);
      const ukMainCardTimeStr = tempMainEventDateForDisplay.toLocaleTimeString('en-GB', displayTimeOpts);

      let ukPrelimTimeStr = parsedPrelimTimeUK ?
          new Date(year, month, day, parsedPrelimTimeUK.hours, parsedPrelimTimeUK.minutes).toLocaleTimeString('en-GB', displayTimeOpts) :
          "TBD";


      // Placeholder for other details
      let venue = "Venue TBD";
      const venueMatch = snippet.match(/(?:Location|Venue):\s*([^<]+)/i);
      if (venueMatch && venueMatch[1]) venue = venueMatch[1].trim();

      const broadcast = "TNT Sports"; // Default

      events.push({
        id: `google_${parsedDate}_${eventTitle.replace(/\s+/g, '_').substring(0,20)}`,
        title: eventTitle,
        date: parsedDate,
        time: parsedTimeUK.formatted_24h, // Original parsed UK time
        ukDateTime: mainCardDateUTC.toISOString(),
        ukMainCardTime: ukMainCardTimeStr,
        ukPrelimTime: prelimDateUTC ? prelimDateUTC.toISOString() : ukPrelimTimeStr, // Store ISO if available, else formatted string
        location: venue,
        venue: venue,
        status: 'upcoming',
        description: `Upcoming UFC event: ${eventTitle}`,
        poster: null,
        createdAt: new Date().toISOString(),
        apiSource: 'google.com',
        mainCard: [], // Add fight card parsing later if possible
        prelimCard: [],
        earlyPrelimCard: [],
        ufcNumber: eventTitle.match(/UFC\s*(\d+)/i) ? eventTitle.match(/UFC\s*(\d+)/i)[1] : null,
        broadcast: broadcast,
        ticketInfo: `${eventTitle} tickets`
      });
  }

  if (events.length === 0) {
      console.log('[ParseHTML] No UFC events could be reliably parsed from Google HTML.');
  }
  return events;
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

  console.log('🚀 UFC Event Scraping from Google (UK Time Focus) - START');
  // More specific queries might yield better, more structured results.
  const queriesToTry = [
      "upcoming UFC events UK time",
      "UFC schedule UK",
      // "what channel is ufc on tonight uk" // This might be too specific if not event day
  ];

  let htmlContent = null;
  let ufcEvents = [];
  let queryUsed = "";

  for (const query of queriesToTry) {
      try {
          console.log(`[Handler] Attempting Google search with query: "${query}"`);
          queryUsed = query;
          htmlContent = await performGoogleSearch(query);

          if (htmlContent && htmlContent.length > 1000) { // Basic check for valid HTML
              console.log(`[Handler] Received HTML (${htmlContent.length} chars). Parsing...`);
              ufcEvents = parseUFCEventsFromGoogleHTML(htmlContent);
              if (ufcEvents.length > 0) {
                  console.log(`[Handler] Successfully parsed ${ufcEvents.length} events from query: "${query}"`);
                  break; // Stop if events are found
              } else {
                console.log(`[Handler] Query "${query}" parsed 0 events. Trying next query.`);
              }
          } else {
              console.log(`[Handler] Insufficient HTML content from query: "${query}". Length: ${htmlContent ? htmlContent.length : 0}`);
          }
      } catch (error) {
          console.error(`[Handler] Error during processing query "${query}": ${error.message}`, error.stack);
          // Continue to next query if one fails
      }
  }

  if (ufcEvents.length > 0) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        events: ufcEvents,
        totalFound: ufcEvents.length,
        fetchTime: new Date().toISOString(),
        source: 'google.com',
        query: queryUsed,
        note: `UFC data scraped from Google. Prioritizes UK times. Found ${ufcEvents.length} event(s).`
      })
    };
  } else {
    console.log('[Handler] No UFC events found after trying all Google queries.');
    return {
      statusCode: 200, // Still success, but no data
      headers,
      body: JSON.stringify({
        success: false,
        events: [],
        totalFound: 0,
        fetchTime: new Date().toISOString(),
        source: 'google.com',
        query: queryUsed,
        error: 'No UFC events found or parsed successfully from Google search results.',
        note: 'Could not retrieve UFC event data from Google.'
      })
    };
  }
};

// --- Deprecated/Old Functions (Commented Out) ---
/*
function fetchFromTheSportsDB() { ... }
function parseTheSportsDBResponse(apiResponse) { ... }
function processUFCEventWithRealTime(event) { ... }
function convertRealTimeToUK(mainCardUTCDate) { ... }
function getRealCurrentUFCEvents() { ... }
// Other helpers like buildLocation, mapStatus, etc., if they were only for TheSportsDB.
// parseMainCardFromAPI, parsePrelimCardFromAPI might be removed if Google data is different.
*/
