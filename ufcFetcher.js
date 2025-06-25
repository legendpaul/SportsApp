require('dotenv').config(); // For local execution to load .env variables
const https = require('https');
// const GoogleUFCScraper = require('./googleUFCScraper'); // No longer needed
// const { getOrdinalSuffix } = require('./utils'); // Might not be needed

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

        if (!eventStartDateISO) {
          this.debugLog('parser-ufc', `No structured start date for "${eventTitle}". Skipping.`);
          return;
        }

        const mainCardUTCDate = new Date(eventStartDateISO);
        if (isNaN(mainCardUTCDate.getTime())) {
          this.debugLog('parser-ufc', `Invalid date from structured data for "${eventTitle}": ${eventStartDateISO}`);
          return;
        }
        
        const displayTimeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short', hour12: false };
        mainCardTimeStr = mainCardUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

        const prelimUTCDate = new Date(mainCardUTCDate.getTime() - (2 * 60 * 60 * 1000)); // Assume 2 hours before
        prelimTimeStr = prelimUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);

        const parsedDate = mainCardUTCDate.toISOString().split('T')[0];
        // Time here is the main card UTC hour and minute for consistency with previous structure, though less critical now
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
        this.debugLog('parser-ufc', `Successfully parsed event: "${eventTitle}" for ${parsedDate} at ${mainCardTimeStr} (UK)`);

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
