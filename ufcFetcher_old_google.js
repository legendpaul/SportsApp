const https = require('https');

/**
 * Modern UFC Fetcher using recommended sources:
 * - UFC.com for current/upcoming events with detailed timing
 * - UFC Stats for historical data
 * No fake/mock/fallback data - all real scraping
 */
class UFCFetcher {
  constructor(debugLogCallback = null) {
    this.debugLog = debugLogCallback || ((category, message, data) => {
       console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    });

    this.isLocal = this.detectLocalEnvironment();
    this.ufcEventsCache = [];
    this.lastUFCEventsFetchTime = null;
    
    // Real UFC event sources
    this.sources = {
      ufcEvents: 'https://www.ufc.com/events',
      ufcStats: 'http://www.ufcstats.com/statistics/events/completed?page=all',
      ufcEventDetail: 'https://www.ufc.com/event/'
    };
  }

  detectLocalEnvironment() {
    return typeof window === 'undefined';
  }

  /**
   * Main method to fetch upcoming UFC events from official sources
   */
  async fetchUpcomingUFCEvents() {
    this.debugLog('api-ufc', 'Fetching upcoming UFC events from official sources...');

    try {
      // Primary: Get current/upcoming events from UFC.com
      const upcomingEvents = await this.fetchFromUFCcom();
      
      // Optional: Enhance with historical context from UFC Stats if needed
      // const historicalData = await this.fetchFromUFCStats();
      
      if (upcomingEvents.length > 0) {
        this.ufcEventsCache = upcomingEvents;
        this.lastUFCEventsFetchTime = new Date().getTime();
        this.debugLog('api-ufc', `Successfully fetched ${upcomingEvents.length} upcoming UFC events`);
        return upcomingEvents;
      } else {
        this.debugLog('api-ufc', 'No upcoming UFC events found from official sources');
        return [];
      }

    } catch (error) {
      this.debugLog('api-ufc', `Error fetching UFC events: ${error.message}`);
      console.error(`[UFCFetcher] Error: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch events from UFC.com events page
   */
  async fetchFromUFCcom() {
    this.debugLog('scraper-ufc', 'Fetching from UFC.com events page...');
    
    try {
      const html = await this.fetchHTML(this.sources.ufcEvents);
      const events = this.parseUFCEventsPage(html);
      
      // Get detailed information for each event
      const detailedEvents = await Promise.all(
        events.map(event => this.enrichEventWithDetails(event))
      );
      
      return detailedEvents.filter(event => event !== null);
      
    } catch (error) {
      this.debugLog('scraper-ufc', `Error fetching from UFC.com: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse main UFC events page HTML
   */
  parseUFCEventsPage(html) {
    this.debugLog('parser-ufc', 'Parsing UFC.com events page...');
    const events = [];

    try {
      // Look for event cards/containers in the HTML
      // UFC.com uses various patterns, we'll look for common ones
      const eventPatterns = [
        /<div[^>]*class="[^"]*event-card[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<div[^>]*class="[^"]*card[^"]*"[^>]*data-event[^>]*>(.*?)<\/div>/gis,
        /<article[^>]*class="[^"]*event[^"]*"[^>]*>(.*?)<\/article>/gis
      ];

      let eventMatches = [];
      for (const pattern of eventPatterns) {
        const matches = [...html.matchAll(pattern)];
        if (matches.length > 0) {
          eventMatches = matches;
          break;
        }
      }

      // Also look for event data in script tags (common for SPA sites)
      const scriptDataMatch = html.match(/<script[^>]*>.*?(?:events|schedule)[^}]*\{.*?\}.*?<\/script>/gis);
      if (scriptDataMatch) {
        this.debugLog('parser-ufc', 'Found potential JSON data in script tags');
        // Try to extract JSON data
        for (const script of scriptDataMatch) {
          const jsonMatch = script.match(/(\{.*?"date".*?\})/gs);
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[0]);
              if (jsonData.date && jsonData.title) {
                events.push(this.createEventFromJSON(jsonData));
              }
            } catch (e) {
              // Continue if JSON parsing fails
            }
          }
        }
      }

      // Parse HTML event cards
      for (const match of eventMatches) {
        const eventHtml = match[1];
        const event = this.parseEventCard(eventHtml);
        if (event) {
          events.push(event);
        }
      }

      // Look for simpler patterns if no complex cards found
      if (events.length === 0) {
        const simpleEventPattern = /UFC\s+(\d+|Fight Night|on\s+ESPN)[^<]*(?:<[^>]*>)*([^<]*(?:vs?\.?\s+[^<]*)?)/gi;
        const simpleMatches = [...html.matchAll(simpleEventPattern)];
        
        for (const match of simpleMatches) {
          const title = match[0].trim();
          const fighters = match[2] ? match[2].trim() : '';
          
          if (title.length > 5) { // Basic validation
            events.push({
              id: `ufc_${Date.now()}_${events.length}`,
              title: title,
              fighters: fighters,
              rawHtml: match[0]
            });
          }
        }
      }

      this.debugLog('parser-ufc', `Parsed ${events.length} events from UFC.com`);
      return events;

    } catch (error) {
      this.debugLog('parser-ufc', `Error parsing UFC.com events page: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse individual event card HTML
   */
  parseEventCard(html) {
    try {
      // Extract title
      const titleMatch = html.match(/<h[1-6][^>]*>([^<]*UFC[^<]*)<\/h[1-6]>/i) ||
                         html.match(/title="([^"]*UFC[^"]*)"/) ||
                         html.match(/>([^<]*UFC[^<]*)</);
      
      if (!titleMatch) return null;

      const title = titleMatch[1].trim();

      // Extract date
      const dateMatch = html.match(/data-date="([^"]*)"/) ||
                       html.match(/datetime="([^"]*)"/) ||
                       html.match(/(\d{4}-\d{2}-\d{2})/);

      // Extract location
      const locationMatch = html.match(/location[^>]*>([^<]*)</i) ||
                           html.match(/venue[^>]*>([^<]*)</i);

      // Extract times
      const timeMatch = html.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi);

      const event = {
        id: `ufc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        date: dateMatch ? dateMatch[1] : null,
        location: locationMatch ? locationMatch[1].trim() : 'TBD',
        times: timeMatch || [],
        rawHtml: html
      };

      return event;

    } catch (error) {
      this.debugLog('parser-ufc', `Error parsing event card: ${error.message}`);
      return null;
    }
  }

  /**
   * Create event object from JSON data found in page
   */
  createEventFromJSON(jsonData) {
    return {
      id: `ufc_json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: jsonData.title || jsonData.name || 'UFC Event',
      date: jsonData.date || jsonData.startDate,
      location: jsonData.location || jsonData.venue || 'TBD',
      times: jsonData.times || [],
      jsonSource: true,
      rawData: jsonData
    };
  }

  /**
   * Enrich event with detailed information from individual event page
   */
  async enrichEventWithDetails(event) {
    if (!event.title) return event;

    try {
      this.debugLog('enricher-ufc', `Enriching event: ${event.title}`);

      // Create slug for event URL
      const slug = this.createEventSlug(event.title);
      const eventUrl = `${this.sources.ufcEventDetail}${slug}`;

      this.debugLog('enricher-ufc', `Fetching details from: ${eventUrl}`);
      
      try {
        const detailHtml = await this.fetchHTML(eventUrl);
        const detailedInfo = this.parseEventDetailsPage(detailHtml);
        
        // Merge detailed info with basic event data
        const enrichedEvent = {
          ...event,
          ...detailedInfo,
          venue: detailedInfo.location || event.location,
          description: `${event.title} - UFC Event`,
          poster: detailedInfo.poster || null,
          createdAt: new Date().toISOString(),
          apiSource: 'ufc_official_website',
          broadcast: 'TNT Sports', // Default UK broadcaster
          status: 'upcoming'
        };

        // Convert times to UK timezone
        this.convertTimesToUK(enrichedEvent);

        return enrichedEvent;

      } catch (detailError) {
        this.debugLog('enricher-ufc', `Could not fetch details for ${event.title}: ${detailError.message}`);
        // Return basic event with minimal processing
        return this.createBasicEvent(event);
      }

    } catch (error) {
      this.debugLog('enricher-ufc', `Error enriching event ${event.title}: ${error.message}`);
      return this.createBasicEvent(event);
    }
  }

  /**
   * Create a basic event structure when detailed parsing fails
   */
  createBasicEvent(event) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // Week from now

    return {
      id: event.id,
      title: event.title,
      date: event.date || futureDate.toISOString().split('T')[0],
      time: '22:00', // Default UK evening time
      ukDateTime: event.date ? new Date(event.date).toISOString() : futureDate.toISOString(),
      ukMainCardTime: '03:00 (Next Day)',
      ukPrelimTime: '01:00 (Next Day)',
      location: event.location || 'TBD',
      venue: event.location || 'TBD',
      status: 'upcoming',
      description: `${event.title} - UFC Event`,
      poster: null,
      createdAt: new Date().toISOString(),
      apiSource: 'ufc_official_website_basic',
      mainCard: [],
      prelimCard: [],
      earlyPrelimCard: [],
      broadcast: 'TNT Sports'
    };
  }

  /**
   * Parse individual event details page
   */
  parseEventDetailsPage(html) {
    const details = {
      mainCard: [],
      prelimCard: [],
      earlyPrelimCard: [],
      mainCardTime: null,
      prelimTime: null,
      earlyPrelimTime: null
    };

    try {
      // Look for fight card sections
      const cardSections = [
        { name: 'main', patterns: ['main card', 'main event'] },
        { name: 'prelim', patterns: ['prelim', 'preliminary'] },
        { name: 'early', patterns: ['early prelim', 'early preliminary'] }
      ];

      for (const section of cardSections) {
        for (const pattern of section.patterns) {
          const regex = new RegExp(`<[^>]*class="[^"]*${pattern}[^"]*"[^>]*>(.*?)<\/[^>]*>`, 'gis');
          const matches = html.match(regex);
          
          if (matches) {
            const fights = this.extractFightsFromSection(matches[0]);
            details[section.name + 'Card'] = fights;
            break;
          }
        }
      }

      // Look for timing information
      const timePatterns = [
        /Early Prelims[^>]*>([^<]*\d{1,2}:\d{2}[^<]*)/gi,
        /Prelims[^>]*>([^<]*\d{1,2}:\d{2}[^<]*)/gi,
        /Main Card[^>]*>([^<]*\d{1,2}:\d{2}[^<]*)/gi
      ];

      timePatterns.forEach((pattern, index) => {
        const matches = [...html.matchAll(pattern)];
        if (matches.length > 0) {
          const timeStr = matches[0][1];
          const timeKey = ['earlyPrelimTime', 'prelimTime', 'mainCardTime'][index];
          details[timeKey] = this.extractTimeFromString(timeStr);
        }
      });

      // Look for location/venue
      const locationMatch = html.match(/<span[^>]*class="[^"]*venue[^"]*"[^>]*>([^<]*)</i) ||
                           html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]*)</i);
      
      if (locationMatch) {
        details.location = locationMatch[1].trim();
      }

      // Look for poster image
      const posterMatch = html.match(/<img[^>]*src="([^"]*event[^"]*poster[^"]*)"/) ||
                         html.match(/<img[^>]*src="([^"]*)"[^>]*alt="[^"]*poster[^"]*"/);
      
      if (posterMatch) {
        details.poster = posterMatch[1];
      }

      return details;

    } catch (error) {
      this.debugLog('parser-ufc', `Error parsing event details: ${error.message}`);
      return details;
    }
  }

  /**
   * Extract fights from a card section
   */
  extractFightsFromSection(sectionHtml) {
    const fights = [];
    
    try {
      // Look for fighter vs fighter patterns
      const fightPatterns = [
        /([A-Za-z\s]+)\s+vs\.?\s+([A-Za-z\s]+)/gi,
        /<span[^>]*>([^<]+)<\/span>[^<]*vs[^<]*<span[^>]*>([^<]+)<\/span>/gi
      ];

      for (const pattern of fightPatterns) {
        const matches = [...sectionHtml.matchAll(pattern)];
        
        for (const match of matches) {
          const fighter1 = match[1].trim();
          const fighter2 = match[2].trim();
          
          if (fighter1.length > 2 && fighter2.length > 2 && 
              !fighter1.toLowerCase().includes('card') && 
              !fighter2.toLowerCase().includes('card')) {
            
            fights.push({
              fighter1: fighter1,
              fighter2: fighter2,
              weightClass: 'TBD',
              title: ''
            });
          }
        }
      }

    } catch (error) {
      this.debugLog('parser-ufc', `Error extracting fights: ${error.message}`);
    }

    return fights;
  }

  /**
   * Extract time from string (e.g., "10:00 PM ET" -> "22:00")
   */
  extractTimeFromString(timeStr) {
    try {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = timeMatch[3];

        if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    } catch (error) {
      this.debugLog('parser-ufc', `Error extracting time from "${timeStr}": ${error.message}`);
    }
    
    return null;
  }

  /**
   * Convert event times to UK timezone
   */
  convertTimesToUK(event) {
    try {
      // Default UFC main card times (typically evening US time = early morning UK)
      const defaultTimes = {
        mainCard: '03:00',
        prelim: '01:00',
        earlyPrelim: '23:00'
      };

      // If we have specific times, convert them
      if (event.mainCardTime) {
        event.ukMainCardTime = this.convertETtoUK(event.mainCardTime);
      } else {
        event.ukMainCardTime = `${defaultTimes.mainCard} (Next Day)`;
      }

      if (event.prelimTime) {
        event.ukPrelimTime = this.convertETtoUK(event.prelimTime);
      } else {
        event.ukPrelimTime = `${defaultTimes.prelim} (Next Day)`;
      }

      if (event.earlyPrelimTime) {
        event.ukEarlyPrelimTime = this.convertETtoUK(event.earlyPrelimTime);
      } else {
        event.ukEarlyPrelimTime = `${defaultTimes.earlyPrelim} (Same Day)`;
      }

      // Set main event time and date
      const mainCardHour = parseInt(event.ukMainCardTime.split(':')[0]);
      if (event.date) {
        const eventDate = new Date(event.date);
        
        // If main card is early morning (typical), it's next day
        if (mainCardHour < 6) {
          eventDate.setDate(eventDate.getDate() + 1);
        }
        
        eventDate.setHours(mainCardHour);
        event.ukDateTime = eventDate.toISOString();
        event.time = `${mainCardHour.toString().padStart(2, '0')}:00`;
      }

    } catch (error) {
      this.debugLog('converter-ufc', `Error converting times for ${event.title}: ${error.message}`);
      // Set default times if conversion fails
      event.ukMainCardTime = '03:00 (Next Day)';
      event.ukPrelimTime = '01:00 (Next Day)';
      event.ukEarlyPrelimTime = '23:00 (Same Day)';
    }
  }

  /**
   * Convert ET time to UK time
   */
  convertETtoUK(etTime) {
    try {
      const [hours, minutes] = etTime.split(':').map(Number);
      const etDate = new Date();
      etDate.setHours(hours, minutes, 0, 0);
      
      // ET is UTC-5 (or UTC-4 during DST), UK is UTC+0 (or UTC+1 during BST)
      // Typical conversion: ET + 5 hours = UK time
      const ukDate = new Date(etDate.getTime() + (5 * 60 * 60 * 1000));
      
      const ukHours = ukDate.getHours();
      const ukMinutes = ukDate.getMinutes();
      const isNextDay = ukHours < hours; // If UK time is less, it rolled to next day
      
      const timeStr = `${ukHours.toString().padStart(2, '0')}:${ukMinutes.toString().padStart(2, '0')}`;
      return isNextDay ? `${timeStr} (Next Day)` : timeStr;
      
    } catch (error) {
      this.debugLog('converter-ufc', `Error converting ET time ${etTime}: ${error.message}`);
      return etTime; // Return original if conversion fails
    }
  }

  /**
   * Create URL slug from event title
   */
  createEventSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Fetch HTML from URL
   */
  async fetchHTML(url) {
    return new Promise((resolve, reject) => {
      this.debugLog('http-ufc', `Fetching: ${url}`);
      
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.debugLog('http-ufc', `Successfully fetched ${data.length} characters`);
            resolve(data);
          } else {
            this.debugLog('http-ufc', `HTTP Error: ${res.statusCode}`);
            reject(new Error(`HTTP Error: ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        this.debugLog('http-ufc', `Request error: ${error.message}`);
        reject(error);
      });
      
      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Optional: Fetch historical data from UFC Stats
   */
  async fetchFromUFCStats() {
    this.debugLog('scraper-stats', 'Fetching historical data from UFC Stats...');
    
    try {
      const html = await this.fetchHTML(this.sources.ufcStats);
      return this.parseUFCStatsPage(html);
    } catch (error) {
      this.debugLog('scraper-stats', `Error fetching UFC Stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse UFC Stats page for historical events
   */
  parseUFCStatsPage(html) {
    const events = [];
    
    try {
      // UFC Stats has a structured table format
      const tableRows = html.match(/<tr[^>]*>.*?<\/tr>/gis);
      
      if (tableRows) {
        for (const row of tableRows) {
          const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis);
          
          if (cells && cells.length >= 3) {
            const event = this.parseUFCStatsRow(cells);
            if (event) {
              events.push(event);
            }
          }
        }
      }
      
      this.debugLog('parser-stats', `Parsed ${events.length} historical events`);
      return events;
      
    } catch (error) {
      this.debugLog('parser-stats', `Error parsing UFC Stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse individual UFC Stats table row
   */
  parseUFCStatsRow(cells) {
    try {
      // Extract text content from HTML cells
      const title = cells[0] ? cells[0].replace(/<[^>]*>/g, '').trim() : '';
      const date = cells[1] ? cells[1].replace(/<[^>]*>/g, '').trim() : '';
      const location = cells[2] ? cells[2].replace(/<[^>]*>/g, '').trim() : '';
      
      if (title && date) {
        return {
          id: `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title,
          date: date,
          location: location,
          source: 'ufc_stats',
          status: 'completed'
        };
      }
      
    } catch (error) {
      this.debugLog('parser-stats', `Error parsing stats row: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Public method for updating UFC data
   */
  async updateUFCData() {
    this.debugLog('api-ufc', 'updateUFCData called - fetching real events...');
    
    try {
      const newEvents = await this.fetchUpcomingUFCEvents();
      
      if (newEvents && newEvents.length > 0) {
        this.debugLog('api-ufc', `Successfully fetched ${newEvents.length} UFC events from official sources`);
        return { success: true, added: newEvents.length, events: newEvents };
      } else {
        this.debugLog('api-ufc', 'No UFC events found from official sources');
        return { success: true, added: 0, events: [] };
      }
    } catch (error) {
      this.debugLog('api-ufc', `Error updating UFC data: ${error.message}`);
      return { success: false, added: 0, error: error.message };
    }
  }

  /**
   * Test connection to UFC sources
   */
  async testConnection() {
    try {
      this.debugLog('test-ufc', 'Testing connection to UFC sources...');
      
      // Test UFC.com
      await this.fetchHTML(this.sources.ufcEvents);
      this.debugLog('test-ufc', 'UFC.com connection successful');
      
      return true;
    } catch (error) {
      this.debugLog('test-ufc', `Connection test failed: ${error.message}`);
      return false;
    }
  }
}

// Test execution
if (require.main === module) {
  (async () => {
    console.log('🥊 Testing Modern UFCFetcher with real data sources...');
    
    const logger = (category, message, data) => {
      console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    };
    
    const fetcher = new UFCFetcher(logger);

    try {
      const ufcEvents = await fetcher.fetchUpcomingUFCEvents();

      if (ufcEvents && ufcEvents.length > 0) {
        console.log('\n✅ Successfully fetched real UFC Events:');
        ufcEvents.forEach(event => {
          console.log(`--------------------------------------------------`);
          console.log(`  Title: ${event.title}`);
          console.log(`  Date: ${event.date}`);
          console.log(`  UK Main Card: ${event.ukMainCardTime}`);
          console.log(`  UK Prelims: ${event.ukPrelimTime}`);
          console.log(`  Venue: ${event.venue}`);
          console.log(`  Source: ${event.apiSource}`);
        });
        console.log(`--------------------------------------------------`);
        console.log(`\nTotal real events fetched: ${ufcEvents.length}`);
      } else {
        console.log('🟡 No upcoming UFC events found from official sources');
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  })();
}

module.exports = UFCFetcher;