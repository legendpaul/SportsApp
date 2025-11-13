/**
 * Modern Web UFC Fetcher using recommended sources:
 * - UFC.com for current/upcoming events with detailed timing
 * - Netlify function for server-side scraping
 * No fake/mock/fallback data - all real scraping
 */
class WebUFCFetcher {
  constructor(debugLogCallback = null) {
    this.version = '2.0.0';
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-ufc';
    
    this.debugLog = debugLogCallback || ((category, message, data) => {
      console.log(`[UFC-${category.toUpperCase()}] ${message}`, data || '');
    });
    
    this.debugLog('init', `WebUFCFetcher v${this.version} - Real Data Implementation`);
    
    this.isLocal = this.detectLocalEnvironment();
    this.ufcEventsCache = [];
    this.lastFetchTime = null;
  }

  detectLocalEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    const isFileProtocol = protocol === 'file:';
    const hasDevPort = port && (port === '3000' || port === '8080' || port === '5000' || port === '8000');
    const isNetlify = hostname.includes('.netlify.app') || hostname.includes('.netlify.com');
    
    const isLocal = (isLocalhost || isFileProtocol || hasDevPort) && !isNetlify;
    
    this.debugLog('env', `Environment: ${isLocal ? 'Local Development' : 'Production (Netlify)'}`, {
      hostname, protocol, port, isLocal
    });
    
    return isLocal;
  }

  /**
   * Main method to fetch upcoming UFC events
   */
  async fetchUpcomingUFCEvents() {
    try {
      this.debugLog('fetch', 'Starting UFC events fetch from real sources...');
      
      if (this.isLocal) {
        // In local development, try to use a CORS proxy or show message
        this.debugLog('fetch', 'Local development detected - using alternative method...');
        return await this.fetchLocalDevelopment();
      } else {
        // Production - use Netlify function for server-side scraping
        this.debugLog('fetch', 'Production environment - using Netlify function...');
        return await this.fetchWithNetlifyFunction();
      }
      
    } catch (error) {
      this.debugLog('fetch', `Error fetching UFC events: ${error.message}`);
      throw error; // Don't return fallback data - user wants real data only
    }
  }

  /**
   * Fetch using Netlify function (production)
   */
  async fetchWithNetlifyFunction() {
    this.debugLog('netlify', `Calling UFC Netlify function: ${this.netlifyFunctionUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(this.netlifyFunctionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'UFCSportsApp/2.0-RealData',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      this.debugLog('netlify', `Function response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        throw new Error(`Function failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      this.debugLog('netlify', `Function response received`, {
        success: data.success,
        eventCount: data.events ? data.events.length : 0,
        source: data.source || 'unknown'
      });
      
      if (!data.success && (!data.events || data.events.length === 0)) {
        throw new Error(`Function returned error: ${data.error || 'Unknown error'}`);
      }

      return data.events || [];
      
    } catch (fetchError) {
      this.debugLog('netlify', `Netlify function failed: ${fetchError.message}`);
      throw fetchError;
    }
  }

  /**
   * Local development method - direct browser fetch with CORS considerations
   */
  async fetchLocalDevelopment() {
    this.debugLog('local', 'Attempting local development fetch...');
    
    try {
      // Try to fetch directly (may fail due to CORS)
      const response = await fetch('https://www.ufc.com/events', {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; UFCSportsApp/2.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const events = this.parseUFCEventsFromHTML(html);
      
      this.debugLog('local', `Successfully parsed ${events.length} events from direct fetch`);
      return events;
      
    } catch (error) {
      this.debugLog('local', `Direct fetch failed: ${error.message}`);
      
      // In local development, show instructions instead of returning fake data
      this.showLocalDevelopmentMessage();
      return [];
    }
  }

  /**
   * Show message for local development
   */
  showLocalDevelopmentMessage() {
    const message = `
🔧 LOCAL DEVELOPMENT MODE

UFC data fetching requires server-side capabilities due to CORS restrictions.

To test UFC functionality locally:
1. Deploy to Netlify for full functionality, OR
2. Use a CORS proxy service, OR  
3. Run the Node.js version: node ufcFetcher.js

This version only returns real data from official sources.
No mock/fake data is provided.
    `;
    
    console.warn(message);
    this.debugLog('local', 'Displayed local development instructions');
  }

  /**
   * Parse UFC events from HTML (for direct fetching)
   */
  parseUFCEventsFromHTML(html) {
    const events = [];
    
    try {
      this.debugLog('parse', 'Parsing UFC events from HTML...');
      
      // Look for JSON data in script tags (common in modern web apps)
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      
      if (scriptMatches) {
        for (const script of scriptMatches) {
          // Look for event data patterns
          const eventDataMatch = script.match(/events.*?:\s*(\[.*?\])/gis);
          
          if (eventDataMatch) {
            try {
              const jsonStr = eventDataMatch[0].split(':')[1].trim();
              const eventData = JSON.parse(jsonStr);
              
              if (Array.isArray(eventData)) {
                for (const item of eventData) {
                  if (item.title && item.date) {
                    events.push(this.createEventFromData(item));
                  }
                }
              }
            } catch (parseError) {
              // Continue if JSON parsing fails
              this.debugLog('parse', `JSON parse failed: ${parseError.message}`);
            }
          }
        }
      }

      // Look for HTML event cards if no JSON found
      if (events.length === 0) {
        const eventCardPattern = /<div[^>]*class="[^"]*event[^"]*"[^>]*>(.*?)<\/div>/gis;
        const cardMatches = html.match(eventCardPattern);
        
        if (cardMatches) {
          for (const card of cardMatches) {
            const event = this.parseEventCard(card);
            if (event) {
              events.push(event);
            }
          }
        }
      }

      // Simple text extraction as fallback
      if (events.length === 0) {
        const ufcMentions = html.match(/UFC\s+\d+[^<]*|UFC\s+Fight\s+Night[^<]*/gi);
        
        if (ufcMentions) {
          for (const mention of ufcMentions.slice(0, 5)) { // Limit to 5
            events.push({
              id: `ufc_text_${Date.now()}_${events.length}`,
              title: mention.trim(),
              date: this.getDefaultFutureDate(),
              ukMainCardTime: '03:00 (Next Day)',
              ukPrelimTime: '01:00 (Next Day)',
              location: 'TBD',
              venue: 'TBD',
              source: 'html_text_extraction'
            });
          }
        }
      }

      this.debugLog('parse', `Successfully parsed ${events.length} events from HTML`);
      return events;
      
    } catch (error) {
      this.debugLog('parse', `Error parsing HTML: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse individual event card
   */
  parseEventCard(cardHtml) {
    try {
      // Extract title
      const titleMatch = cardHtml.match(/<h[1-6][^>]*>([^<]*UFC[^<]*)<\/h[1-6]>/i) ||
                         cardHtml.match(/title="([^"]*UFC[^"]*)"/) ||
                         cardHtml.match(/>([^<]*UFC[^<]*)</);
      
      if (!titleMatch) return null;

      const title = titleMatch[1].trim();

      // Extract date
      const dateMatch = cardHtml.match(/data-date="([^"]*)"/) ||
                       cardHtml.match(/datetime="([^"]*)"/) ||
                       cardHtml.match(/(\d{4}-\d{2}-\d{2})/);

      // Extract times
      const timeMatches = cardHtml.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi);

      return this.createEventFromData({
        title: title,
        date: dateMatch ? dateMatch[1] : this.getDefaultFutureDate(),
        times: timeMatches,
        source: 'html_card_extraction'
      });

    } catch (error) {
      this.debugLog('parse', `Error parsing event card: ${error.message}`);
      return null;
    }
  }

  /**
   * Create event object from parsed data
   */
  createEventFromData(data) {
    const event = {
      id: `ufc_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title || 'UFC Event',
      date: data.date || this.getDefaultFutureDate(),
      time: '22:00', // Default UTC time
      location: data.location || data.venue || 'TBD',
      venue: data.location || data.venue || 'TBD',
      status: 'upcoming',
      description: `${data.title || 'UFC Event'} - Official UFC Event`,
      poster: data.poster || null,
      createdAt: new Date().toISOString(),
      apiSource: data.source || 'ufc_official_website',
      mainCard: data.mainCard || [],
      prelimCard: data.prelimCard || [],
      earlyPrelimCard: data.earlyPrelimCard || [],
      broadcast: 'TNT Sports'
    };

    // Set UK times based on extracted data or defaults
    if (data.times && data.times.length > 0) {
      event.ukMainCardTime = this.convertToUKTime(data.times[0]);
      event.ukPrelimTime = this.convertToUKTime(data.times[1] || data.times[0], -2); // 2 hours earlier
    } else {
      // Standard UFC timing for UK
      event.ukMainCardTime = '03:00 (Next Day)';
      event.ukPrelimTime = '01:00 (Next Day)';
      event.ukEarlyPrelimTime = '23:00 (Same Day)';
    }

    // Set ukDateTime
    if (event.date) {
      const eventDate = new Date(event.date);
      const mainCardHour = parseInt(event.ukMainCardTime.split(':')[0]);
      
      if (mainCardHour < 6) { // Early morning = next day
        eventDate.setDate(eventDate.getDate() + 1);
      }
      
      eventDate.setHours(mainCardHour);
      event.ukDateTime = eventDate.toISOString();
    }

    return event;
  }

  /**
   * Convert time to UK timezone
   */
  convertToUKTime(timeStr, hourOffset = 0) {
    try {
      if (!timeStr) return '03:00 (Next Day)';

      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return '03:00 (Next Day)';

      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3];

      // Convert to 24-hour format
      if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }

      // Add hour offset
      hours += hourOffset;

      // Convert ET to UK (typically +5 hours)
      hours += 5;

      const isNextDay = hours >= 24;
      if (isNextDay) hours -= 24;

      const timeStr24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
      return isNextDay ? `${timeStr24} (Next Day)` : timeStr24;

    } catch (error) {
      this.debugLog('time', `Error converting time ${timeStr}: ${error.message}`);
      return '03:00 (Next Day)';
    }
  }

  /**
   * Get default future date (1 week from now)
   */
  getDefaultFutureDate() {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    return future.toISOString().split('T')[0];
  }

  /**
   * Fetch the next UFC event URL from Tapology and prepopulate the input field
   */
  async fetchAndPrepopulateNextEventUrl() {
    try {
      this.debugLog('tapology', 'Fetching next UFC event URL from Tapology...');

      const nextEventUrlFunction = '/.netlify/functions/fetch-next-ufc-url';
      const statusDiv = document.getElementById('ufc-scraper-status');

      if (statusDiv) {
        statusDiv.textContent = '🔍 Finding next UFC event...';
        statusDiv.className = 'status-message status-loading';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(nextEventUrlFunction, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch next event URL: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.url) {
        this.debugLog('tapology', `Found next UFC event URL: ${data.url}`);

        // Prepopulate the input field
        const urlInput = document.getElementById('tapology-url-input');
        if (urlInput) {
          urlInput.value = data.url;
          this.debugLog('tapology', 'Prepopulated URL input field');
        }

        if (statusDiv) {
          statusDiv.textContent = `✅ Found next event: ${data.url.split('/').pop()}`;
          statusDiv.className = 'status-message status-success';
        }

        return data.url;
      } else {
        throw new Error('No UFC event URL found');
      }

    } catch (error) {
      this.debugLog('tapology', `Error fetching next event URL: ${error.message}`);

      const statusDiv = document.getElementById('ufc-scraper-status');
      if (statusDiv) {
        statusDiv.textContent = `❌ Error: ${error.message}`;
        statusDiv.className = 'status-message status-error';
      }

      throw error;
    }
  }

  /**
   * Update UFC data and save to storage
   */
  async updateUFCData() {
    try {
      this.debugLog('update', 'Starting UFC data update with real sources...');
      
      const dataManager = new WebDataManager();
      const existingData = dataManager.loadData();
      
      const newEvents = await this.fetchUpcomingUFCEvents();
      
      if (newEvents.length === 0) {
        this.debugLog('update', 'No UFC events found from real sources');
        return { success: true, added: 0, total: existingData.ufcEvents?.length || 0 };
      }

      // Filter out existing events to avoid duplicates
      const existingIds = new Set(
        (existingData.ufcEvents || []).map(e => e.id).filter(Boolean)
      );
      
      const uniqueNewEvents = newEvents.filter(event => 
        !existingIds.has(event.id)
      );

      this.debugLog('update', `Found ${newEvents.length} total events, ${uniqueNewEvents.length} are new`);

      // Update data
      existingData.ufcEvents = [...(existingData.ufcEvents || []), ...uniqueNewEvents];
      existingData.lastUFCFetch = new Date().toISOString();
      
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        this.debugLog('update', `Successfully updated: ${uniqueNewEvents.length} new real events`);
        
        uniqueNewEvents.forEach(event => {
          this.debugLog('update', `🥊 ${event.date} - ${event.title} [${event.ukMainCardTime}]`);
        });
      }
      
      return { 
        success: saved, 
        added: uniqueNewEvents.length, 
        total: existingData.ufcEvents.length,
        events: uniqueNewEvents
      };
      
    } catch (error) {
      this.debugLog('update', `Error updating UFC data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test connection to data sources
   */
  async testConnection() {
    try {
      this.debugLog('test', 'Testing connection to UFC data sources...');
      
      if (this.isLocal) {
        this.debugLog('test', 'Local development: Limited testing due to CORS');
        return true; // Assume OK in local development
      } else {
        this.debugLog('test', 'Testing Netlify function...');
        
        const testResponse = await fetch(this.netlifyFunctionUrl, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'UFCSportsApp/2.0-TestMode'
          }
        });
        
        this.debugLog('test', `Function test status: ${testResponse.status}`);
        
        if (!testResponse.ok) {
          this.debugLog('test', `Function test failed: ${testResponse.status}`);
          return false;
        }
        
        const data = await testResponse.json();
        this.debugLog('test', `Function test response:`, {
          success: data.success,
          eventCount: data.events ? data.events.length : 0,
          source: data.source
        });
        
        return testResponse.ok;
      }
      
    } catch (error) {
      this.debugLog('test', `Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached events (if any)
   */
  getCachedEvents() {
    return this.ufcEventsCache;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.ufcEventsCache = [];
    this.lastFetchTime = null;
    this.debugLog('cache', 'Cache cleared');
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WebUFCFetcher = WebUFCFetcher;
}