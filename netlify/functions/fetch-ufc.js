const https = require('https');

// --- Helper Functions ---

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

/**
 * Attempts to determine if a given month (0-11) in a given year is likely BST (UTC+1) or GMT (UTC+0) for the UK.
 * @param {number} year - Full year
 * @param {number} monthIndex - 0-11 (Jan-Dec)
 * @param {number} dayOfMonth - 1-31
 * @returns {number} UTC offset: 0 for GMT, 1 for BST (hours to subtract from local UK to get UTC).
 */
function getUKTimezoneOffset(year, monthIndex, dayOfMonth) {
    if (monthIndex < 2 || monthIndex > 9) return 0; // Jan, Feb, Nov, Dec are GMT
    if (monthIndex > 2 && monthIndex < 9) return 1; // Apr, May, Jun, Jul, Aug, Sep are BST
    if (monthIndex === 2) {
        const lastSundayOfMarch = new Date(Date.UTC(year, monthIndex + 1, 0));
        lastSundayOfMarch.setUTCDate(lastSundayOfMarch.getUTCDate() - lastSundayOfMarch.getUTCDay());
        return dayOfMonth >= lastSundayOfMarch.getUTCDate() ? 1 : 0;
    }
    if (monthIndex === 9) {
        const lastSundayOfOctober = new Date(Date.UTC(year, monthIndex + 1, 0));
        lastSundayOfOctober.setUTCDate(lastSundayOfOctober.getUTCDate() - lastSundayOfOctober.getUTCDay());
        return dayOfMonth < lastSundayOfOctober.getUTCDate() ? 1 : 0;
    }
    return 0;
}

/**
 * Parses events from Google Custom Search API JSON response.
 * @param {object} apiResponseJson - The parsed JSON object from the API.
 * @returns {Array<object>} An array of parsed UFC event objects.
 */
function parseEventsFromGoogleAPI(apiResponseJson) {
  const events = [];
  console.log('[API Parse] Starting to parse events from Google Custom Search API response.');

  if (!apiResponseJson.items || apiResponseJson.items.length === 0) {
    console.log('[API Parse] No items found in API response.');
    return events;
  }

  apiResponseJson.items.forEach((item, index) => {
    try {
      console.log(`[API Parse] Processing item ${index + 1}: "${item.title}"`);
      let eventTitle = item.title;
      let eventStartDateISO = null;
      let venue = "Venue TBD";
      let mainCardTimeStr = "TBD";
      let prelimTimeStr = "TBD";

      if (item.pagemap) {
        if (item.pagemap.metatags && item.pagemap.metatags[0] && item.pagemap.metatags[0]['og:title']) {
          eventTitle = item.pagemap.metatags[0]['og:title'];
        }

        const sportEvent = item.pagemap.sportsEvent || item.pagemap.event;
        if (sportEvent && sportEvent[0]) {
          if (sportEvent[0].startDate || sportEvent[0].startdate) { // Google uses both casings
            eventStartDateISO = sportEvent[0].startDate || sportEvent[0].startdate;
            console.log(`[API Parse] Found structured start date: ${eventStartDateISO}`);
          }
          if (sportEvent[0].location) {
            venue = typeof sportEvent[0].location === 'string' ? sportEvent[0].location : (sportEvent[0].location.name || "Venue TBD");
             console.log(`[API Parse] Found structured venue: ${venue}`);
          }
        }
      }

      // Clean up title (remove " - UFC" or similar)
      eventTitle = eventTitle.replace(/\s-\sUFC$/i, '').replace(/UFC\s*:\s*/i, '');


      if (!eventStartDateISO) {
        // TODO: Attempt to parse date/time from item.snippet or item.title as a fallback
        // This would require more complex regex and potentially use getUKTimezoneOffset
        console.log(`[API Parse] No structured start date for "${eventTitle}". Skipping for now.`);
        return; // Continue to next item
      }

      const mainCardUTCDate = new Date(eventStartDateISO);
      if (isNaN(mainCardUTCDate.getTime())) {
        console.log(`[API Parse] Invalid date parsed from structured data for "${eventTitle}": ${eventStartDateISO}`);
        return;
      }

      const displayTimeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' };
      mainCardTimeStr = mainCardUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

      const prelimUTCDate = new Date(mainCardUTCDate.getTime() - (2 * 60 * 60 * 1000)); // Assume 2 hours before
      prelimTimeStr = prelimUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

      const parsedDate = mainCardUTCDate.toISOString().split('T')[0];
      const originalTime = `${String(mainCardUTCDate.getUTCHours()).padStart(2,'0')}:${String(mainCardUTCDate.getUTCMinutes()).padStart(2,'0')}`;


      const eventObject = {
        id: `gcse_${item.cacheId || new Date().getTime() + index}`,
        title: eventTitle,
        date: parsedDate, // YYYY-MM-DD from UTC date
        time: originalTime, // Original UTC time HH:MM
        ukDateTime: mainCardUTCDate.toISOString(), // Full ISO string in UTC
        ukMainCardTime: mainCardTimeStr, // Formatted UK display time e.g. "Sat 02:00"
        ukPrelimTime: prelimTimeStr,     // Formatted UK display time e.g. "Sat 00:00"
        location: venue,
        venue: venue,
        status: 'upcoming',
        description: item.snippet || `Upcoming UFC event: ${eventTitle}`,
        poster: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null,
        createdAt: new Date().toISOString(),
        apiSource: 'google_custom_search_api',
        mainCard: [], // API might not provide detailed fight cards for general searches
        prelimCard: [],
        earlyPrelimCard: [],
        ufcNumber: eventTitle.match(/UFC\s*(\d+)/i) ? eventTitle.match(/UFC\s*(\d+)/i)[1] : null,
        broadcast: "TNT Sports", // Default, or could try to parse from snippet
        ticketInfo: `Tickets for ${eventTitle}`
      };
      events.push(eventObject);
      console.log(`[API Parse] Successfully parsed event: "${eventTitle}" for ${parsedDate} at ${mainCardTimeStr} (UK)`);

    } catch (e) {
      console.error(`[API Parse] Error processing item ${index}: ${e.message}`, item);
    }
  });

  // Sort events by date
  events.sort((a, b) => new Date(a.ukDateTime) - new Date(b.ukDateTime));

  console.log(`[API Parse] Finished parsing. Found ${events.length} valid events.`);
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

  console.log('🌟 UFC Event Fetching via Google Custom Search API - START');

  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.error('[Handler] Missing GOOGLE_API_KEY or SEARCH_ENGINE_ID environment variables.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server configuration error: API key or Search Engine ID missing.',
        note: 'API credentials not set on the server.'
      })
    };
  }

  const query = "upcoming UFC events UK time"; // Main query
  const numResults = 5; // Fetch a few results to find relevant events
  const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${numResults}`;

  let ufcEvents = [];
  let responsePayload = {};
  const isDebugMode = event.queryStringParameters && event.queryStringParameters.debug_google_html === 'true';


  try {
    console.log(`[Handler] Requesting Google Custom Search API: ${apiUrl.replace(apiKey, "REDACTED_API_KEY")}`);

    const apiResponsePromise = new Promise((resolve, reject) => {
      const req = https.get(apiUrl, { headers: { 'Accept': 'application/json' } }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
          console.log(`[Handler] API Response Status: ${res.statusCode}`);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(rawData);
          } else {
            reject(new Error(`API request failed with status ${res.statusCode}. Response: ${rawData}`));
          }
        });
      });
      req.on('error', (e) => {
        console.error('[Handler] API request error:', e);
        reject(new Error(`API request error: ${e.message}`));
      });
      req.end();
    });

    const rawApiResponse = await apiResponsePromise;
    const apiResponseJson = JSON.parse(rawApiResponse);

    if (isDebugMode) {
        console.log('[Handler] Raw Google Custom Search API JSON Response:');
        // Log a summary or specific parts to avoid overly verbose logs if the response is huge
        const summaryToLog = {
            searchInformation: apiResponseJson.searchInformation,
            itemsCount: apiResponseJson.items ? apiResponseJson.items.length : 0,
            firstItemTitle: apiResponseJson.items && apiResponseJson.items.length > 0 ? apiResponseJson.items[0].title : null
        };
        console.log(JSON.stringify(summaryToLog, null, 2));
        // We don't have the full HTML like before, but we can log the raw JSON items for debug purposes
        // if they are requested via a different debug param or if this is considered the "HTML" for this mode.
        // For now, the responsePayload.debugInfo will hold a snippet of the JSON.
    }

    // Add detailed logging for the raw items array
    console.log('[Handler] Raw Google API Response Items for query - START:');
    if (apiResponseJson.items && apiResponseJson.items.length > 0) {
      const itemsToLog = apiResponseJson.items.slice(0, 5); // Log up to 5 items
      console.log(JSON.stringify(itemsToLog, null, 2));
    } else {
      console.log('[Handler] No items found in Google API Response.');
    }
    console.log('[Handler] Raw Google API Response Items for query - END:');

    ufcEvents = parseEventsFromGoogleAPI(apiResponseJson);

    responsePayload = {
      success: true,
      events: ufcEvents,
      totalFound: ufcEvents.length,
      fetchTime: new Date().toISOString(),
      source: 'google_custom_search_api',
      query: query,
      note: ufcEvents.length > 0 ? `UFC data from Google Custom Search API. Found ${ufcEvents.length} event(s).` : 'No upcoming UFC events found via Google API.'
    };

    if (isDebugMode) {
        responsePayload.debugInfo = {
            googleApiJsonItems: apiResponseJson.items ? JSON.stringify(apiResponseJson.items.slice(0,3), null, 2) : "No items in API response.", // Log first 3 items
            apiResponseSummary: JSON.stringify({ searchInformation: apiResponseJson.searchInformation, queries: apiResponseJson.queries }, null, 2)
        };
    }

  } catch (error) {
    console.error('[Handler] Error processing UFC events via Google API:', error.message, error.stack);
    responsePayload = {
      success: false,
      events: [],
      totalFound: 0,
      fetchTime: new Date().toISOString(),
      source: 'google_custom_search_api',
      query: query,
      error: `Failed to fetch or parse data from Google Custom Search API: ${error.message}`,
      note: 'Could not retrieve UFC event data.'
    };
    if (isDebugMode) {
        responsePayload.debugInfo = {
            errorMessage: error.message,
            errorStack: error.stack,
            googleApiUrl: apiUrl.replace(apiKey, "REDACTED_API_KEY")
        };
    }
  }

  return {
    statusCode: 200, // Return 200 even for app-level errors, success flag indicates outcome
    headers,
    body: JSON.stringify(responsePayload)
  };
};

// --- Deprecated/Old Functions (Commented Out) ---
/*
function performGoogleSearch(query, maxRedirects = 5) { ... }
function makeRequestRecursive(...) { ... }
function parseUFCEventsFromGoogleHTML(html) { ... }

function fetchFromTheSportsDB() { ... }
function parseTheSportsDBResponse(apiResponse) { ... }
function processUFCEventWithRealTime(event) { ... }
function convertRealTimeToUK(mainCardUTCDate) { ... }
function getRealCurrentUFCEvents() { ... }
*/
