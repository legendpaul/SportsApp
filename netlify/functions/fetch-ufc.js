const https = require('https');

/**
 * Netlify Function: Direct UFC.com Scraper (No Google API)
 * Scrapes UFC.com directly for upcoming events with UK times
 */

// Helper function to fetch HTML from UFC.com
function fetchHTML(hostname, path) {
  return new Promise((resolve, reject) => {
    console.log(`[UFC-HTTP] Fetching: https://${hostname}${path}`);
    
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[UFC-HTTP] Successfully fetched ${data.length} characters`);
          resolve(data);
        } else {
          console.log(`[UFC-HTTP] HTTP Error: ${res.statusCode}`);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`[UFC-HTTP] Request error: ${error.message}`);
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Helper function to clean HTML text
function cleanText(text) {
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

// Parse UFC events from HTML
function parseUFCEventsFromHTML(html) {
  console.log('[UFC-PARSE] Parsing UFC events from HTML...');
  const events = [];
  
  try {
    // Look for common UFC.com event patterns
    const eventPatterns = [
      // Pattern 1: Event cards with data attributes
      /<div[^>]*class="[^"]*event[^"]*"[^>]*data-event-id="([^"]*)"[^>]*>(.*?)<\/div>/gis,
      
      // Pattern 2: Article elements
      /<article[^>]*class="[^"]*event[^"]*"[^>]*>(.*?)<\/article>/gis,
      
      // Pattern 3: Card containers
      /<div[^>]*class="[^"]*card[^"]*"[^>]*>(.*?)<\/div>/gis
    ];

    let foundEvents = [];
    
    for (const pattern of eventPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`[UFC-PARSE] Found ${matches.length} event matches with pattern`);
        foundEvents = matches;
        break;
      }
    }

    // Parse each matched event
    for (let i = 0; i < Math.min(foundEvents.length, 5); i++) { // Limit to 5 events
      const match = foundEvents[i];
      const eventHtml = match[1] || match[0];
      const event = parseIndividualEvent(eventHtml, i);
      
      if (event) {
        events.push(event);
      }
    }

    // If no structured events found, look for simple UFC mentions
    if (events.length === 0) {
      console.log('[UFC-PARSE] No structured events found, looking for UFC mentions...');
      events.push(...parseSimpleUFCMentions(html));
    }

    console.log(`[UFC-PARSE] Parsed ${events.length} events from UFC.com`);
    return events;
    
  } catch (error) {
    console.log(`[UFC-PARSE] Error parsing UFC events: ${error.message}`);
    return [];
  }
}

// Parse individual event from HTML
function parseIndividualEvent(eventHtml, index) {
  try {
    // Extract title
    const titlePatterns = [
      /<h[1-6][^>]*>([^<]*UFC[^<]*)<\/h[1-6]>/i,
      /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*UFC[^<]*)<\/div>/i,
      /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*UFC[^<]*)<\/span>/i,
      /title="([^"]*UFC[^"]*)"/ // fallback to title attribute
    ];
    
    let title = null;
    for (const pattern of titlePatterns) {
      const match = eventHtml.match(pattern);
      if (match) {
        title = cleanText(match[1]);
        break;
      }
    }
    
    if (!title) {
      // Create a generic title if none found
      title = `UFC Event ${index + 1}`;
    }

    // Extract date
    const datePatterns = [
      /data-date="([^"]*)"/, 
      /datetime="([^"]*)"/, 
      /(\d{4}-\d{2}-\d{2})/,
      /(\w+ \d{1,2}, \d{4})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2}, \d{4}/i
    ];
    
    let eventDate = null;
    for (const pattern of datePatterns) {
      const match = eventHtml.match(pattern);
      if (match) {
        eventDate = parseEventDate(match[1]);
        break;
      }
    }
    
    // Extract location/venue
    const locationPatterns = [
      /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]*)<\/span>/i,
      /<div[^>]*class="[^"]*venue[^"]*"[^>]*>([^<]*)<\/div>/i,
      /data-venue="([^"]*)"/
    ];
    
    let venue = 'TBD';
    for (const pattern of locationPatterns) {
      const match = eventHtml.match(pattern);
      if (match) {
        venue = cleanText(match[1]);
        break;
      }
    }

    // Create event object
    const event = {
      id: `ufc_netlify_${Date.now()}_${index}`,
      title: title,
      date: eventDate,
      venue: venue,
      rawHtml: eventHtml.substring(0, 500) // Keep sample for debugging
    };

    console.log(`[UFC-PARSE] Parsed event: ${title} on ${eventDate} at ${venue}`);
    return event;
    
  } catch (error) {
    console.log(`[UFC-PARSE] Error parsing individual event: ${error.message}`);
    return null;
  }
}

// Parse simple UFC mentions when structured data isn't available
function parseSimpleUFCMentions(html) {
  const events = [];
  
  try {
    // Look for UFC event titles in the text
    const ufcPattern = /UFC\s+(\d+|Fight Night|on ESPN|on ABC)[^.!?]*([^.!?]{0,100})/gi;
    const matches = [...html.matchAll(ufcPattern)];
    
    const uniqueTitles = new Set();
    
    for (let i = 0; i < Math.min(matches.length, 3); i++) { // Limit to 3
      const match = matches[i];
      const fullMatch = match[0].trim();
      
      if (fullMatch.length > 10 && !uniqueTitles.has(fullMatch)) {
        uniqueTitles.add(fullMatch);
        
        events.push({
          id: `ufc_netlify_simple_${Date.now()}_${i}`,
          title: fullMatch,
          date: null, // Will be set in processing
          venue: 'TBD',
          simple: true
        });
      }
    }
    
    console.log(`[UFC-PARSE] Found ${events.length} simple UFC mentions`);
    return events;
    
  } catch (error) {
    console.log(`[UFC-PARSE] Error parsing simple UFC mentions: ${error.message}`);
    return [];
  }
}

// Parse event date from various formats
function parseEventDate(dateStr) {
  try {
    // Handle different date formats
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr; // Already in YYYY-MM-DD format
    }
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Process UFC event to add proper timing and structure
function processUFCEvent(event, index) {
  try {
    console.log(`[UFC-PROCESS] Processing event: ${event.title}`);
    
    // Set default future date if none provided
    if (!event.date) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (index + 1)); // Stagger dates
      event.date = futureDate.toISOString().split('T')[0];
    }

    // Create proper event structure for the frontend
    const processedEvent = {
      id: event.id,
      title: event.title,
      date: event.date,
      time: '22:00', // Default UK time for early prelims
      ukDateTime: createUKDateTime(event.date, '22:00'),
      ukMainCardTimeStr: '03:00 (Sun)',
      ukPrelimTimeStr: '01:00 (Sun)', 
      ukEarlyPrelimTimeStr: '22:00 (Sat)',
      location: event.venue || 'TBD',
      venue: event.venue || 'TBD',
      status: 'upcoming',
      description: `${event.title} - Live from UFC.com Direct Scraping`,
      poster: null,
      createdAt: new Date().toISOString(),
      apiSource: 'ufc_official_website_netlify',
      
      // UFC-specific data - empty to avoid duplicate issues
      mainCard: [],
      prelimCard: [],
      earlyPrelimCard: [],
      
      // Extract UFC number if possible
      ufcNumber: extractUFCNumber(event.title),
      broadcast: 'TNT Sports',
      ticketInfo: `Tickets for ${event.title}`,
      
      // UTC dates for proper timing
      mainCardUTCDate: createUTCDate(event.date, '03:00'),
      prelimUTCDate: createUTCDate(event.date, '01:00'),
      earlyPrelimUTCDate: createUTCDate(event.date, '22:00', -1) // Previous day
    };

    console.log(`[UFC-PROCESS] Successfully processed: ${processedEvent.title}`);
    return processedEvent;
    
  } catch (error) {
    console.log(`[UFC-PROCESS] Error processing event ${event.title}: ${error.message}`);
    return null;
  }
}

// Extract UFC number from title
function extractUFCNumber(title) {
  const numberMatch = title.match(/UFC\s*(\d+)/i);
  if (numberMatch) {
    return numberMatch[1];
  }
  
  if (title.toLowerCase().includes('fight night')) {
    return null; // Fight Night events don't have numbers
  }
  
  return null;
}

// Create UK DateTime string
function createUKDateTime(date, time) {
  try {
    const eventDate = new Date(date);
    const [hours, minutes] = time.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return eventDate.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Create UTC Date object
function createUTCDate(date, time, dayOffset = 0) {
  try {
    const eventDate = new Date(date);
    eventDate.setDate(eventDate.getDate() + dayOffset);
    const [hours, minutes] = time.split(':');
    eventDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
    return eventDate;
  } catch (error) {
    return new Date();
  }
}

// Main Netlify Function Handler
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

  console.log('🥊 UFC Event Fetching via Direct UFC.com Scraping - START');

  try {
    // Fetch HTML from UFC.com events page
    const html = await fetchHTML('www.ufc.com', '/events');
    
    // Parse events from HTML
    const rawEvents = parseUFCEventsFromHTML(html);
    
    if (rawEvents.length === 0) {
      console.log('[UFC-NETLIFY] No events found from UFC.com');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          events: [],
          totalFound: 0,
          fetchTime: new Date().toISOString(),
          source: 'ufc_official_website_netlify',
          note: 'No upcoming UFC events found on UFC.com'
        })
      };
    }

    // Process each event to add proper structure
    const processedEvents = [];
    for (let i = 0; i < rawEvents.length; i++) {
      const processed = processUFCEvent(rawEvents[i], i);
      if (processed) {
        processedEvents.push(processed);
      }
    }

    console.log(`[UFC-NETLIFY] Successfully processed ${processedEvents.length} UFC events`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        events: processedEvents,
        totalFound: processedEvents.length,
        fetchTime: new Date().toISOString(),
        source: 'ufc_official_website_netlify',
        note: `UFC data from direct UFC.com scraping. Found ${processedEvents.length} event(s).`
      })
    };

  } catch (error) {
    console.error('[UFC-NETLIFY] Error fetching UFC events:', error.message, error.stack);
    
    return {
      statusCode: 200, // Return 200 but with error flag
      headers,
      body: JSON.stringify({
        success: false,
        events: [],
        totalFound: 0,
        fetchTime: new Date().toISOString(),
        source: 'ufc_official_website_netlify',
        error: `Failed to fetch UFC data: ${error.message}`,
        note: 'Could not retrieve UFC event data from UFC.com'
      })
    };
  }
};
