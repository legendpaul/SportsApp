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
 * Gets the UTC offset for a given timezone abbreviation.
 * Note: This is a simplified version and doesn't fully account for DST changes for all zones.
 */
function getTimezoneOffsetUTC(tzAbbreviation, eventDate) {
  if (!tzAbbreviation) return null;
  const tz = tzAbbreviation.toUpperCase();
  const month = eventDate ? eventDate.getUTCMonth() : new Date().getUTCMonth(); // 0-11
  const isLikelyDST = month >= 2 && month <= 9; // Approx March to October

  switch (tz) {
    case 'PDT': return -7;
    case 'PST': return isLikelyDST ? -7 : -8;
    case 'EDT': return -4;
    case 'EST': return isLikelyDST ? -4 : -5;
    case 'CDT': return -5;
    case 'CST': return isLikelyDST ? -5 : -6;
    case 'MDT': return -6;
    case 'MST': return isLikelyDST ? -6 : -7;
    case 'GMT': return 0;
    case 'BST': return 1;
    case 'Z': case 'UTC': return 0;
    default:
      // Use this.debugLog if available (inside class), else console.warn
      (typeof this !== 'undefined' && this.debugLog ? this.debugLog : console.warn)('timezone-parser', `Unknown timezone abbreviation: ${tzAbbreviation}`);
      return null;
  }
}


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

// --- Detailed Snippet Parsing (Local Version) ---
function parseDetailedInfoFromSnippet_Local(snippet, eventObject, eventYear, eventMonth, eventDay, debugLog) {
  debugLog('parser-ufc-detail', `Attempting to parse snippet for event: ${eventObject.title}`);

  const lines = snippet.split(/\n|<br\/?>|\|/);
  let currentCardType = null;
  let cardTimeFound = { main: false, prelims: false, early: false };

  const fighterVsPattern = /([A-Za-zÀ-ÿ\s\.'-]+)\s*(?:vs\.?|v)\s*([A-Za-zÀ-ÿ\s\.'-]+)(?:\s*\(([^)]+)\))?/i;
  const timePattern = /(\d{1,2}(?::\d{2})?(?:\s*(?:AM|PM))?)\s*([A-Z]{2,4})?/i; // Updated regex

  lines.forEach(line => {
    line = line.replace(/&nbsp;/g, ' ').trim();
    if (!line) return;
    debugLog('parser-ufc-detail', `Processing line: "${line}"`);

    if (/main card/i.test(line)) currentCardType = 'main';
    else if (/preliminary card|prelims/i.test(line) && !/early/i.test(line)) currentCardType = 'prelims';
    else if (/early prelims|early preliminary/i.test(line)) currentCardType = 'early';

    const timeMatch = line.match(timePattern);
    if (timeMatch) {
      const timeStr = timeMatch[1];
      const zone = timeMatch[2];
      const parsedTime = parseTimeString(timeStr);

      if (parsedTime) {
        let eventSpecificUTCOffset = null;
        const eventDateForTZ = new Date(Date.UTC(eventYear, eventMonth, eventDay));

        if (zone) {
          eventSpecificUTCOffset = getTimezoneOffsetUTC(zone, eventDateForTZ);
        }

        if (eventSpecificUTCOffset === null && (zone === 'UK' || !zone)) {
           eventSpecificUTCOffset = getUKTimezoneOffset(eventYear, eventMonth, eventDay);
           debugLog('parser-ufc-detail', `Timezone for "${timeStr}" is UK-contextual or undefined, using UK offset: ${eventSpecificUTCOffset}`);
        } else if (eventSpecificUTCOffset === null && zone) {
            debugLog('parser-ufc-detail', `WARN: Timezone "${zone}" for time "${timeStr}" unrecognized and not UK. Assuming 0 offset.`);
            eventSpecificUTCOffset = 0;
        }

        const cardUTCDate = new Date(Date.UTC(eventYear, eventMonth, eventDay, parsedTime.hours, parsedTime.minutes, 0));
        cardUTCDate.setUTCHours(cardUTCDate.getUTCHours() - eventSpecificUTCOffset);
        const formattedUKTime = cardUTCDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' });
        debugLog('parser-ufc-detail', `Parsed time: ${timeStr}, Zone: ${zone}, Offset: ${eventSpecificUTCOffset}, UTC: ${cardUTCDate.toISOString()}, UKDisp: ${formattedUKTime}`);

        if (currentCardType === 'main' && !cardTimeFound.main) {
          eventObject.mainCardUTCDate = cardUTCDate;
          eventObject.ukMainCardTimeStr = formattedUKTime;
          if (!eventObject.ukDateTime || cardUTCDate < new Date(eventObject.ukDateTime)) {
             eventObject.ukDateTime = cardUTCDate.toISOString();
             eventObject.time = `${String(cardUTCDate.getUTCHours()).padStart(2,'0')}:${String(cardUTCDate.getUTCMinutes()).padStart(2,'0')}`;
          }
          cardTimeFound.main = true;
          debugLog('parser-ufc-detail', `Found Main Card time: ${formattedUKTime}`);
        } else if (currentCardType === 'prelims' && !cardTimeFound.prelims) {
          eventObject.prelimUTCDate = cardUTCDate;
          eventObject.ukPrelimTimeStr = formattedUKTime;
          cardTimeFound.prelims = true;
          debugLog('parser-ufc-detail', `Found Prelims time: ${formattedUKTime}`);
        } else if (currentCardType === 'early' && !cardTimeFound.early) {
          eventObject.earlyPrelimUTCDate = cardUTCDate;
          eventObject.ukEarlyPrelimTimeStr = formattedUKTime;
          cardTimeFound.early = true;
          debugLog('parser-ufc-detail', `Found Early Prelims time: ${formattedUKTime}`);
        }
      }
    }

    const fightMatch = line.match(fighterVsPattern);
    if (fightMatch) {
      const fight = {
        fighter1: fightMatch[1].trim(),
        fighter2: fightMatch[2].trim(),
        weightClass: fightMatch[3] ? fightMatch[3].trim() : 'TBD',
        title: ''
      };
      if (fight.fighter1.length < 3 || fight.fighter2.length < 3 || fight.fighter1.toLowerCase() === "main" || fight.fighter2.toLowerCase() === "event") return;

      if (currentCardType === 'main') {
        if (eventObject.mainCard.length === 0 && /main event/i.test(line) && eventObject.title.includes(fight.fighter1) && eventObject.title.includes(fight.fighter2)) {
            fight.title = 'Main Event';
        }
        eventObject.mainCard.push(fight);
        debugLog('parser-ufc-detail', `Added to Main Card: ${fight.fighter1} vs ${fight.fighter2}`);
      } else if (currentCardType === 'prelims') {
        eventObject.prelimCard.push(fight);
        debugLog('parser-ufc-detail', `Added to Prelims: ${fight.fighter1} vs ${fight.fighter2}`);
      } else if (currentCardType === 'early') {
        eventObject.earlyPrelimCard.push(fight);
        debugLog('parser-ufc-detail', `Added to Early Prelims: ${fight.fighter1} vs ${fight.fighter2}`);
      }
    }
  });

  if (eventObject.mainCardUTCDate) {
    if (!cardTimeFound.prelims && !eventObject.prelimUTCDate) {
      eventObject.prelimUTCDate = new Date(eventObject.mainCardUTCDate.getTime() - (2 * 60 * 60 * 1000));
      eventObject.ukPrelimTimeStr = eventObject.prelimUTCDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' });
      debugLog('parser-ufc-detail', `Derived Prelims time: ${eventObject.ukPrelimTimeStr}`);
    }
    if (!cardTimeFound.early && !eventObject.earlyPrelimUTCDate && eventObject.prelimUTCDate) {
      eventObject.earlyPrelimUTCDate = new Date(eventObject.prelimUTCDate.getTime() - (90 * 60 * 1000));
      eventObject.ukEarlyPrelimTimeStr = eventObject.earlyPrelimUTCDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' });
      debugLog('parser-ufc-detail', `Derived Early Prelims time: ${eventObject.ukEarlyPrelimTimeStr}`);
    }
  }

   let earliestDate = eventObject.mainCardUTCDate;
   if (eventObject.prelimUTCDate && eventObject.prelimUTCDate < earliestDate) earliestDate = eventObject.prelimUTCDate;
   if (eventObject.earlyPrelimUTCDate && eventObject.earlyPrelimUTCDate < earliestDate) earliestDate = eventObject.earlyPrelimUTCDate;

   if (earliestDate) {
       const localEarliestDate = new Date(earliestDate.toLocaleString("en-US", {timeZone: "Europe/London"}));
       eventObject.date = `${localEarliestDate.getFullYear()}-${String(localEarliestDate.getMonth() + 1).padStart(2, '0')}-${String(localEarliestDate.getDate()).padStart(2, '0')}`;
       eventObject.time = `${String(earliestDate.getUTCHours()).padStart(2,'0')}:${String(earliestDate.getUTCMinutes()).padStart(2,'0')}`;
       eventObject.ukDateTime = earliestDate.toISOString();
       debugLog('parser-ufc-detail', `Updated event main date/time to earliest: ${eventObject.date} ${eventObject.time} UTC, UKDateTime: ${eventObject.ukDateTime}`);
   }
}
// --- END Detailed Snippet Parsing (Local Version) ---


// --- END Helper Functions ---


class UFCFetcher {
  constructor(debugLogCallback = null) {
    this.debugLog = debugLogCallback || ((category, message, data) => {
       console.log(`[${category.toUpperCase()}] ${message}`, data || '');
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

    const query = "next UFC event main card prelims early prelims UK time"; // Refined query
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
          const mainCardTimeRegex = /(?:main\s*(?:card|event)\s*at\s*)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*([A-Z]{2,4})?|(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*([A-Z]{2,4})?\s*(?:main\s*(?:card|event))/i;
          const mainCardMatch = combinedText.match(mainCardTimeRegex);
          let parsedTimeFromSnippet = null;

          if (mainCardMatch) {
            const timeStr = mainCardMatch[1] || mainCardMatch[3];
            const zone = mainCardMatch[2] || mainCardMatch[4];
            this.debugLog('parser-ufc', `Snippet Main Card Time Match: Time="${timeStr}", Zone="${zone}"`);
            parsedTimeFromSnippet = parseTimeString(timeStr);

            if (parsedTimeFromSnippet) {
              let year, month, day;
              const eventDateForTZ = structuredDateSource ? new Date(structuredDateSource) : new Date();

              if (structuredDateSource) {
                year = structuredDateSource.getUTCFullYear();
                month = structuredDateSource.getUTCMonth();
                day = structuredDateSource.getUTCDate();
                this.debugLog('parser-ufc', `Using date from structured source: Y=${year}, M=${month}, D=${day}`);
              } else {
                const dateMatchSnippet = combinedText.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
                if(dateMatchSnippet && monthMap[dateMatchSnippet[1].toLowerCase()] !== undefined) {
                    year = dateMatchSnippet[3] ? parseInt(dateMatchSnippet[3],10) : new Date().getFullYear();
                    month = monthMap[dateMatchSnippet[1].toLowerCase()];
                    day = parseInt(dateMatchSnippet[2], 10);
                    eventDateForTZ.setUTCFullYear(year, month, day);
                    this.debugLog('parser-ufc', `Extracted date from snippet: Y=${year}, M=${month}, D=${day}`);
                } else {
                    this.debugLog('parser-ufc', `No reliable date found in snippet for time "${timeStr}". Skipping this time match.`);
                    parsedTimeFromSnippet = null;
                }
              }

              if (parsedTimeFromSnippet) {
                let actualUTCOffset = null;
                if (zone) {
                  actualUTCOffset = getTimezoneOffsetUTC(zone, eventDateForTZ);
                }
                if (actualUTCOffset === null && (zone === 'UK' || !zone)) {
                  actualUTCOffset = getUKTimezoneOffset(year, month, day);
                  this.debugLog('parser-ufc', `Main card time is UK-contextual or zone undefined. UK offset: ${actualUTCOffset}`);
                } else if (actualUTCOffset === null && zone) {
                  this.debugLog('parser-ufc', `WARN: Main card timezone "${zone}" unrecognized and not UK. Assuming 0 offset.`);
                  actualUTCOffset = 0;
                }
                this.debugLog('parser-ufc', `Determined UTC offset for main card time: ${actualUTCOffset}`);
                mainCardUTCDate = new Date(Date.UTC(year, month, day, parsedTimeFromSnippet.hours, parsedTimeFromSnippet.minutes, 0));
                mainCardUTCDate.setUTCHours(mainCardUTCDate.getUTCHours() - actualUTCOffset);
                this.debugLog('parser-ufc', `Main card UTC from snippet: ${mainCardUTCDate.toISOString()}`);
              }
            } else {
              this.debugLog('parser-ufc', `Could not parse time from snippet match: "${timeStr}"`);
            }
          } else {
            this.debugLog('parser-ufc', `No specific main card time in snippet for "${eventTitle}".`);
          }
        }

        // Combined text for detailed parsing
        const combinedText = `${item.title}. ${item.snippet}`;

        let baseDateForDetails;
        if (mainCardUTCDate) {
            baseDateForDetails = mainCardUTCDate;
        } else if (structuredDateSource) {
            baseDateForDetails = structuredDateSource;
            this.debugLog('parser-ufc', `Using structuredDateSource (${baseDateForDetails.toISOString()}) as date base for details. Time to be found from snippet.`);
        } else {
            this.debugLog('parser-ufc', `No reliable base date for "${eventTitle}". Attempting to find date in snippet.`);
            const dateMatchSnippetForBase = combinedText.match(/([A-Za-z]+)\s+(\d{1,2})/i);
            if (dateMatchSnippetForBase && monthMap[dateMatchSnippetForBase[1].toLowerCase()] !== undefined) {
                const currentYear = new Date().getFullYear();
                const monthIdx = monthMap[dateMatchSnippetForBase[1].toLowerCase()];
                const dayNum = parseInt(dateMatchSnippetForBase[2], 10);
                baseDateForDetails = new Date(Date.UTC(currentYear, monthIdx, dayNum, 0, 0, 0));
                this.debugLog('parser-ufc', `Extracted base date from snippet for detailed parsing: ${baseDateForDetails.toISOString()}`);
            } else {
                this.debugLog('parser-ufc', `CRITICAL: No base date could be determined for "${eventTitle}". Skipping.`);
                return;
            }
        }
        
        const eventYear = baseDateForDetails.getUTCFullYear();
        const eventMonth = baseDateForDetails.getUTCMonth();
        const eventDay = baseDateForDetails.getUTCDate();

        const eventObject = {
          id: `gcse_${item.cacheId || new Date().getTime() + index}`,
          title: eventTitle,
          date: null, time: null, ukDateTime: null,
          ukMainCardTimeStr: null, ukPrelimTimeStr: null, ukEarlyPrelimTimeStr: null,
          location: venue, venue: venue, status: 'upcoming',
          description: item.snippet || `Upcoming UFC event: ${eventTitle}`,
          poster: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null,
          createdAt: new Date().toISOString(),
          apiSource: 'google_custom_search_api',
          mainCard: [], prelimCard: [], earlyPrelimCard: [],
          ufcNumber: eventTitle.match(/UFC\s*(\d+[A-Z]?)/i)?.[1] || (eventTitle.toLowerCase().includes("ufc fight night") ? eventTitle : null) || eventTitle.match(/UFC\s*on\s*(ESPN|ABC)/i)?.[0] || null,
          broadcast: "TNT Sports", ticketInfo: `Tickets for ${eventTitle}`,
          mainCardUTCDate: mainCardUTCDate,
          prelimUTCDate: null, earlyPrelimUTCDate: null,
        };

        if (mainCardUTCDate) {
            eventObject.prelimUTCDate = new Date(mainCardUTCDate.getTime() - (2 * 60 * 60 * 1000));
            const displayTimeOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' };
            eventObject.ukMainCardTimeStr = mainCardUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);
            if(eventObject.prelimUTCDate) {
                eventObject.ukPrelimTimeStr = eventObject.prelimUTCDate.toLocaleTimeString('en-GB', displayTimeOpts);
            }
        }

        parseDetailedInfoFromSnippet_Local(combinedText, eventObject, eventYear, eventMonth, eventDay, this.debugLog);

        if (!eventObject.ukDateTime && baseDateForDetails) {
            eventObject.ukDateTime = baseDateForDetails.toISOString();
            eventObject.time = `${String(baseDateForDetails.getUTCHours()).padStart(2,'0')}:${String(baseDateForDetails.getUTCMinutes()).padStart(2,'0')}`;
            this.debugLog('parser-ufc', `Fallback: No specific times found, using base date ${eventObject.ukDateTime}`);
        }

        if (eventObject.ukDateTime) {
            const finalEventDate = new Date(eventObject.ukDateTime);
            const localFinalEventDate = new Date(finalEventDate.toLocaleString("en-US", {timeZone: "Europe/London"}));
            eventObject.date = `${localFinalEventDate.getFullYear()}-${String(localFinalEventDate.getMonth() + 1).padStart(2, '0')}-${String(localFinalEventDate.getDate()).padStart(2, '0')}`;
        } else {
            this.debugLog('parser-ufc', `CRITICAL: Could not determine ukDateTime for "${eventTitle}". Skipping.`);
            return;
        }

        const finalDisplayOpts = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', weekday: 'short' };
        if (eventObject.mainCardUTCDate && !eventObject.ukMainCardTimeStr) {
            eventObject.ukMainCardTimeStr = eventObject.mainCardUTCDate.toLocaleTimeString('en-GB', finalDisplayOpts);
        }
        if (eventObject.prelimUTCDate && !eventObject.ukPrelimTimeStr) {
            eventObject.ukPrelimTimeStr = eventObject.prelimUTCDate.toLocaleTimeString('en-GB', finalDisplayOpts);
        }
        if (eventObject.earlyPrelimUTCDate && !eventObject.ukEarlyPrelimTimeStr) {
            eventObject.ukEarlyPrelimTimeStr = eventObject.earlyPrelimUTCDate.toLocaleTimeString('en-GB', finalDisplayOpts);
        }

        events.push(eventObject);
        this.debugLog('parser-ufc', `Successfully processed event: "${eventObject.title}" for UK date ${eventObject.date}. Main: ${eventObject.ukMainCardTimeStr || 'N/A'}, Prelim: ${eventObject.ukPrelimTimeStr || 'N/A'}, Early: ${eventObject.ukEarlyPrelimTimeStr || 'N/A'}`);

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
