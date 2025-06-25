require('dotenv').config(); // For local execution to load .env variables
const https = require('https');
// const GoogleUFCScraper = require('./googleUFCScraper'); // No longer needed
// const { getOrdinalSuffix } = require('./utils'); // Might not be needed

// --- Helper Functions (copied from netlify/functions/fetch-ufc.js for consistency) ---
/**
 * Parses a time string (e.g., "8:00 PM") into 24-hour format object.
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
    // In ufcFetcher.js, this.debugLog might not be available if used as a static/standalone func
    // console.error(`[ParseTime] Error parsing time string "${timeStr}": ${error.message}`);
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
// --- END Helper Functions ---


class UFCFetcher {
  constructor(debugLogCallback = null) {
    this.debugLog = debugLogCallback || ((category, message, data) => {
      // console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    });

    // this.googleScraper = new GoogleUFCScraper(); // Removed
    this.dataManager = null; // Assuming this might be set externally if needed for saving
    this.isLocal = this.detectLocalEnvironment();
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-ufc';

    this.ufcEventsCache = [];
    this.lastUFCEventsFetchTime = null;
  }

  detectLocalEnvironment() {
    // Simplified check for local Node.js execution vs. potential browser context
    return typeof window === 'undefined';
  }

  /**
   * Main method to get upcoming UFC events using Google Custom Search API.
   */
  async fetchUpcomingUFCEvents() {
    this.debugLog('api-ufc', 'Fetching upcoming UFC events via Google Custom Search API...');

    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      this.debugLog('api-ufc', 'ERROR: Missing GOOGLE_API_KEY or SEARCH_ENGINE_ID environment variables.');
      console.error('ERROR: Missing GOOGLE_API_KEY or SEARCH_ENGINE_ID environment variables.');
      return []; // Or throw an error
    }

    const query = "upcoming UFC events UK time";
    const numResults = 5; // Fetch a few results
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${numResults}`;

    try {
      this.debugLog('api-ufc', `Requesting Google Custom Search API: ${apiUrl.replace(apiKey, "REDACTED_API_KEY")}`);

      const apiResponsePromise = new Promise((resolve, reject) => {
        const req = https.get(apiUrl, { headers: { 'Accept': 'application/json' } }, (res) => {
          let rawData = '';
          res.on('data', (chunk) => rawData += chunk);
          res.on('end', () => {
            this.debugLog('api-ufc', `API Response Status: ${res.statusCode}`);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(rawData);
            } else {
              this.debugLog('api-ufc', `API request failed. Status: ${res.statusCode}. Response: ${rawData.substring(0,500)}`);
              reject(new Error(`API request failed with status ${res.statusCode}.`));
            }
          });
        });
        req.on('error', (e) => {
          this.debugLog('api-ufc', 'API request error:', e.message);
          reject(new Error(`API request error: ${e.message}`));
        });
        req.end();
      });

      const rawApiResponse = await apiResponsePromise;
      const apiResponseJson = JSON.parse(rawApiResponse);

      this.debugLog('api-ufc', 'Raw API Response Summary:', {
        itemCount: apiResponseJson.items ? apiResponseJson.items.length : 0,
        firstItemTitle: apiResponseJson.items && apiResponseJson.items.length > 0 ? apiResponseJson.items[0].title : null
      });

      const events = this.parseEventsFromGoogleAPI_Local(apiResponseJson);
      this.ufcEventsCache = events;
      this.lastUFCEventsFetchTime = new Date().getTime();
      return events;

    } catch (error) {
      this.debugLog('api-ufc', `Error fetching or parsing UFC events from Google API: ${error.message}`);
      console.error(`[UFCFetcher] Error: ${error.message}`, error.stack);
      return []; // Return empty array on error
    }
  }

  /**
   * Parses events from Google Custom Search API JSON response (local version).
   * @param {object} apiResponseJson - The parsed JSON object from the API.
   * @returns {Array<object>} An array of parsed UFC event objects.
   */
  parseEventsFromGoogleAPI_Local(apiResponseJson) {
    const events = [];
    this.debugLog('parser-ufc', 'Parsing Google API response for UFC events...');

    if (!apiResponseJson.items || apiResponseJson.items.length === 0) {
      this.debugLog('parser-ufc', 'No items found in API response.');
      return events;
    }

    apiResponseJson.items.forEach((item, index) => {
      try {
        this.debugLog('parser-ufc', `Processing item ${index + 1}: "${item.title}"`);
        let eventTitle = item.title;
        let eventStartDateISO = null;
        let venue = "Venue TBD";
        let mainCardTimeStr = "TBD";
        let prelimTimeStr = "TBD"; // Default

        if (item.pagemap) {
          if (item.pagemap.metatags && item.pagemap.metatags[0] && item.pagemap.metatags[0]['og:title']) {
            eventTitle = item.pagemap.metatags[0]['og:title'];
          }

          // Corrected to use item.pagemap.SportsEvent (capital S) first
          const sportEvent = item.pagemap.SportsEvent || item.pagemap.event;
          if (sportEvent && sportEvent[0]) {
            eventStartDateISO = sportEvent[0].startDate || sportEvent[0].startdate;
            if(eventStartDateISO) this.debugLog('parser-ufc', `Found structured start date from SportsEvent/event: ${eventStartDateISO}`);

            if (sportEvent[0].location) {
              venue = typeof sportEvent[0].location === 'string'
                ? sportEvent[0].location
                : (sportEvent[0].location.name || "Venue TBD");
              if(venue !== "Venue TBD") this.debugLog('parser-ufc', `Found structured venue from SportsEvent/event: ${venue}`);
            }
          }
        }

        eventTitle = eventTitle.replace(/\s-\sUFC$/i, '').replace(/UFC\s*:\s*/i, '').replace(/\s*\|\s*[^|]+$/,'').trim();

        let mainCardUTCDate = null;
        let needsSnippetTimeSearch = true;
        let structuredDateSource = null;

        if (eventStartDateISO) {
          const tempStructuredUTCDate = new Date(eventStartDateISO);
          if (!isNaN(tempStructuredUTCDate.getTime())) {
            const ukHour = parseInt(tempStructuredUTCDate.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }), 10);
            const TOO_EARLY_UK_HOUR = 15;

            if (ukHour < TOO_EARLY_UK_HOUR) {
              this.debugLog('parser-ufc', `Structured date ${eventStartDateISO} (UK Hour: ${ukHour}) is too early. Searching snippets.`);
              structuredDateSource = tempStructuredUTCDate;
            } else {
              mainCardUTCDate = tempStructuredUTCDate;
              needsSnippetTimeSearch = false;
              this.debugLog('parser-ufc', `Using structured date for main card: ${mainCardUTCDate.toISOString()}`);
            }
          } else {
            this.debugLog('parser-ufc', `Invalid date from structured data: ${eventStartDateISO}`);
          }
        }

        if (needsSnippetTimeSearch) {
          this.debugLog('parser-ufc', `Needs snippet time search for "${eventTitle}".`);
          const combinedText = `${item.title}. ${item.snippet}`;
          const mainCardTimeRegex = /(?:(main\s*(?:card|event))\s*at\s*)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(UK|GMT|BST)?|(?:(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(UK|GMT|BST)?\s*(main\s*(?:card|event)))/i;
          const mainCardMatch = combinedText.match(mainCardTimeRegex);
          let parsedTimeFromSnippet = null;

          if (mainCardMatch) {
            const timeStr = mainCardMatch[2] || mainCardMatch[4];
            const zone = mainCardMatch[3] || mainCardMatch[5];
            this.debugLog('parser-ufc', `Snippet Main Card Time Match: Time="${timeStr}", Zone="${zone}"`);
            parsedTimeFromSnippet = parseTimeString(timeStr);

            if (parsedTimeFromSnippet) {
              let year, month, day; // 0-indexed month
              if (structuredDateSource) {
                year = structuredDateSource.getUTCFullYear();
                month = structuredDateSource.getUTCMonth();
                day = structuredDateSource.getUTCDate();
                this.debugLog('parser-ufc', `Using date from structured source: Y=${year}, M=${month}, D=${day}`);
              } else {
                // Basic date extraction from snippet (less reliable)
                const dateMatchSnippet = combinedText.match(/([A-Za-z]+)\s+(\d{1,2})/i); // e.g. "June 22"
                if(dateMatchSnippet && monthMap[dateMatchSnippet[1].toLowerCase()] !== undefined) {
                    year = new Date().getFullYear();
                    month = monthMap[dateMatchSnippet[1].toLowerCase()];
                    day = parseInt(dateMatchSnippet[2], 10);
                    this.debugLog('parser-ufc', `Extracted date from snippet: Y=${year}, M=${month}, D=${day}`);
                } else {
                    this.debugLog('parser-ufc', `Could not find reliable date for snippet time for "${eventTitle}". Skipping.`);
                    return;
                }
              }

              const ukOffset = (zone && zone.toUpperCase() === 'BST') ? 1 : getUKTimezoneOffset(year, month, day);
              this.debugLog('parser-ufc', `UK offset for snippet time: ${ukOffset} (1=BST, 0=GMT)`);

              mainCardUTCDate = new Date(Date.UTC(year, month, day, parsedTimeFromSnippet.hours, parsedTimeFromSnippet.minutes, 0));
              mainCardUTCDate.setUTCHours(mainCardUTCDate.getUTCHours() - ukOffset);
              this.debugLog('parser-ufc', `Main card UTC from snippet: ${mainCardUTCDate.toISOString()}`);
            } else {
              this.debugLog('parser-ufc', `Could not parse time from snippet match: "${timeStr}"`);
            }
          } else {
            this.debugLog('parser-ufc', `No specific main card time in snippet for "${eventTitle}".`);
          }
        }

        if (!mainCardUTCDate) {
          this.debugLog('parser-ufc', `No definitive main card UTC time for "${eventTitle}". Skipping.`);
          return;
        }
        
        const displayTimeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short', hour12: false };
        mainCardTimeStr = mainCardUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

        const prelimUTCDate = new Date(mainCardUTCDate.getTime() - (2 * 60 * 60 * 1000));
        prelimTimeStr = prelimUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

        const localMainCardDate = new Date(mainCardUTCDate.toLocaleString("en-US", {timeZone: "Europe/London"}));
        const parsedDate = `${localMainCardDate.getFullYear()}-${String(localMainCardDate.getMonth() + 1).padStart(2, '0')}-${String(localMainCardDate.getDate()).padStart(2, '0')}`;

        const originalTime = `${String(mainCardUTCDate.getUTCHours()).padStart(2,'0')}:${String(mainCardUTCDate.getUTCMinutes()).padStart(2,'0')}`;

        const eventObject = {
          id: `gcse_${item.cacheId || new Date().getTime() + index}`,
          title: eventTitle,
          date: parsedDate,
          time: originalTime,
          ukDateTime: mainCardUTCDate.toISOString(),
          ukMainCardTime: mainCardTimeStr,
          ukPrelimTime: prelimTimeStr,
          location: venue,
          venue: venue,
          status: 'upcoming',
          description: item.snippet || `Upcoming UFC event: ${eventTitle}`,
          poster: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null,
          createdAt: new Date().toISOString(),
          apiSource: 'google_custom_search_api',
          mainCard: [],
          prelimCard: [],
          earlyPrelimCard: [],
          ufcNumber: eventTitle.match(/UFC\s*(\d+)/i)?.[1] || null,
          broadcast: "TNT Sports",
          ticketInfo: `Tickets for ${eventTitle}`
        };
        events.push(eventObject);
        this.debugLog('parser-ufc', `Successfully processed event: "${eventTitle}" for UK date ${parsedDate} at ${mainCardTimeStr} (UK time)`);

      } catch (e) {
        this.debugLog('parser-ufc', `Error processing item ${index} ("${item.title}"): ${e.message}`, e.stack);
      }
    });
    
    events.sort((a, b) => new Date(a.ukDateTime) - new Date(b.ukDateTime));
    this.debugLog('parser-ufc', `Finished parsing. Found ${events.length} valid events.`);
    return events;
  }

  /**
   * Updates UFC data, intended to be called by dataManager or similar.
   * This will now use the new API-based fetch method.
   */
  async updateUFCData() {
    this.debugLog('api-ufc', 'updateUFCData called. Fetching new events...');
    const newEvents = await this.fetchUpcomingUFCEvents();
    
    if (newEvents && newEvents.length > 0) {
      // Here, you would typically merge with existing data if this class managed persistence.
      // For now, it just updates the cache.
      this.debugLog('api-ufc', `Fetched ${newEvents.length} new UFC events.`);
      return { success: true, added: newEvents.length, events: newEvents };
    } else if (newEvents) { // newEvents is an empty array
      this.debugLog('api-ufc', 'No new UFC events found.');
      return { success: true, added: 0, events: [] };
    } else { // fetch failed, newEvents is undefined or null
      this.debugLog('api-ufc', 'Failed to fetch UFC events.');
      return { success: false, added: 0, error: "Failed to fetch UFC events" };
    }
  }

  // Test connection method (optional, can be simple for API)
  async testConnection() {
    try {
      const events = await this.fetchUpcomingUFCEvents();
      return events && events.length >= 0; // True if API call succeeded (even if 0 events)
    } catch {
      return false;
    }
  }
}

// --- Deprecated/Old Functions (Commented Out or To Be Removed) ---
/*
  async enhanceEventWithGoogleData(event) { ... }
  async tryApiRequest(date) { ... } // TheSportsDB
  processUFCEvents(apiResponse, date) { ... } // TheSportsDB
  getCurrentUFCEvents() { ... } // Hardcoded fallback
  getGoogleEnhancedEvents() { ... } // Old scraper logic
  calculateUKDateTime(eventDate, eventTimeET) { ... } // Old time conversion
*/


// Test execution (if run directly via node ufcFetcher.js)
if (require.main === module) {
  (async () => {
    console.log('🥊 Testing UFCFetcher with Google Custom Search API...');
    
    // Simple console log for debug messages from the class
    const logger = (category, message, data) => {
        console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    };
    const fetcher = new UFCFetcher(logger);

    try {
      const ufcEvents = await fetcher.fetchUpcomingUFCEvents();

      if (ufcEvents && ufcEvents.length > 0) {
        console.log('\n✅ Successfully fetched UFC Events:');
        ufcEvents.forEach(event => {
          console.log(`--------------------------------------------------`);
          console.log(`  Title: ${event.title} (UFC ${event.ufcNumber || 'N/A'})`);
          console.log(`  Date: ${event.date}, Original Time (UTC): ${event.time}`);
          console.log(`  UK DateTime (ISO): ${event.ukDateTime}`);
          console.log(`  UK Main Card: ${event.ukMainCardTime}`);
          console.log(`  UK Prelims: ${event.ukPrelimTime}`);
          console.log(`  Venue: ${event.venue}`);
          console.log(`  Source: ${event.apiSource}`);
          console.log(`  Poster: ${event.poster}`);
        });
        console.log(`--------------------------------------------------`);
        console.log(`\nTotal events fetched: ${ufcEvents.length}`);
      } else if (ufcEvents) {
        console.log('🟡 No upcoming UFC events found by the API at this time.');
      } else {
        console.log('❌ Failed to fetch UFC events. ufcEvents is undefined or null.');
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  })();
}

module.exports = UFCFetcher;
