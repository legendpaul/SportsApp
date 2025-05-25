const https = require('https');
const fs = require('fs');
const path = require('path');

class UFCFetcher {
  constructor() {
    // TheSportsDB API - Free tier: 20 requests per hour
    this.baseUrl = 'www.thesportsdb.com';
    this.apiPath = '/api/v1/json/3';
    
    // MMA League ID for UFC in TheSportsDB
    this.ufcLeagueId = '4443';
    
    // Map TheSportsDB event statuses to our system
    this.statusMap = {
      'Not Started': 'upcoming',
      'Match Finished': 'finished',
      'Live': 'live',
      'Postponed': 'postponed',
      'Cancelled': 'cancelled'
    };
  }

  async fetchUpcomingUFCEvents() {
    try {
      console.log('🥊 Fetching upcoming UFC events from TheSportsDB...');
      
      // Get next 15 events for UFC
      const events = await this.makeApiRequest(`/eventsnextleague.php?id=${this.ufcLeagueId}`);
      
      if (!events || !events.events) {
        console.log('⚠️ No UFC events found from API');
        return [];
      }

      console.log(`📊 Found ${events.events.length} upcoming UFC events`);
      
      const processedEvents = this.processUFCEvents(events.events);
      return processedEvents;
      
    } catch (error) {
      console.error('❌ Error fetching UFC events:', error.message);
      return [];
    }
  }

  async fetchRecentUFCEvents() {
    try {
      console.log('🥊 Fetching recent UFC events...');
      
      // Get last 15 events for UFC
      const events = await this.makeApiRequest(`/eventspastleague.php?id=${this.ufcLeagueId}`);
      
      if (!events || !events.events) {
        console.log('⚠️ No recent UFC events found');
        return [];
      }

      // Only get events from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const recentEvents = events.events.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= thirtyDaysAgo;
      });

      console.log(`📊 Found ${recentEvents.length} recent UFC events`);
      
      const processedEvents = this.processUFCEvents(recentEvents);
      return processedEvents;
      
    } catch (error) {
      console.error('❌ Error fetching recent UFC events:', error.message);
      return [];
    }
  }

  makeApiRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: this.apiPath + endpoint,
        method: 'GET',
        headers: {
          'User-Agent': 'SportsApp/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(jsonData);
            } else {
              reject(new Error(`API Error: ${res.statusCode} - ${data}`));
            }
          } catch (e) {
            reject(new Error(`JSON Parse Error: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request Error: ${error.message}`));
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  processUFCEvents(apiEvents) {
    const processedEvents = [];

    apiEvents.forEach(event => {
      try {
        // Enhanced Log: Check for missing critical info (title or date)
        if (!event.strEvent || !event.dateEvent) {
            console.warn(`⚠️ Missing critical info (title or date) for UFC event ${event.idEvent || '(no ID)'}. Raw event data:`, event);
            // Allowing to proceed to see if other parts can be processed or fail gracefully.
        }

        const initialDateString = (event.dateEvent || '') + 'T' + (event.strTime || '00:00:00'); // Guard against null dateEvent
        const eventDateAsUtc = new Date(initialDateString + 'Z'); // Ensure parsed as UTC

        let londonDateTimeIsoString = null; // Default to null

        if (isNaN(eventDateAsUtc.getTime())) {
            console.error(`Invalid UTC date for event ${event.idEvent || '(no ID)'}: ${initialDateString}. Raw event data:`, event);
        } else {
            const options = {
                timeZone: "Europe/London",
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false // Use 24-hour format
            };
            // Using 'sv-SE' locale for YYYY-MM-DD format parts, then reconstruct.
            // 'en-GB' would give DD/MM/YYYY. 'sv-SE' gives YYYY-MM-DD.
            const formatter = new Intl.DateTimeFormat('sv-SE', options); 
            const parts = formatter.formatToParts(eventDateAsUtc);
            
            const dateParts = {};
            for (const part of parts) {
                if (part.type !== 'literal') { // Filter out literal parts like '/', '-', ' ', ':' etc.
                     dateParts[part.type] = part.value;
                }
            }
            
            // Handle cases where hour might be '24' for midnight in some locales (e.g., 'Europe/London' at DST changeover or midnight)
            if (dateParts.hour === '24') {
                dateParts.hour = '00';
            }

            if (dateParts.year && dateParts.month && dateParts.day && dateParts.hour && dateParts.minute && dateParts.second) {
                // Constructing the ISO string to represent London wall-clock time, tagged as 'Z'
                // This format (YYYY-MM-DDTHH:mm:ss.sssZ) is what toISOString() produces.
                londonDateTimeIsoString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.000Z`;
            } else {
                console.error(`Failed to construct London time string for event ${event.idEvent || '(no ID)'}. Collected parts: ${JSON.stringify(dateParts)} from eventDateAsUtc: ${eventDateAsUtc.toISOString()}. Raw event data:`, event);
                // Keep londonDateTimeIsoString as null if parts are missing
            }
        }

        // Enhanced Log: Check if ukDateTime (londonDateTimeIsoString) is null
        if (!londonDateTimeIsoString) {
            console.warn(`⚠️ ukDateTime is null for event ${event.idEvent || '(no ID)'}, indicating date processing issue. Raw event data:`, event);
        }
        
        // Enhanced Log: Check for missing description before card parsing
        if (!event.strDescriptionEN) {
            console.warn(`⚠️ Missing strDescriptionEN for UFC event ${event.idEvent || '(no ID)'}, card parsing will use defaults. Raw event data:`, event);
        }

        const processedEvent = {
          id: `ufc_${event.idEvent || 'unknown_' + (Date.now() + Math.random()).toString(36)}`, // Robust ID
          title: event.strEvent || 'UFC Event', // Fallback if strEvent was initially missing but processing continued
          date: event.dateEvent, // Keep original date string
          time: event.strTime || 'TBD', // Keep original time string
          ukDateTime: londonDateTimeIsoString, // This will be the ISO string representing London wall clock time, but marked as Z(ulu)
          location: this.buildLocation(event),
          venue: event.strVenue || 'TBD',
          status: this.mapStatus(event.strStatus),
          description: event.strDescriptionEN || '',
          poster: event.strPoster || event.strThumb || null,
          createdAt: new Date().toISOString(),
          apiSource: 'thesportsdb.com',
          apiEventId: event.idEvent,
          
          // Parse main card and prelims from description or use defaults
          mainCard: this.parseMainCard(event), // parseMainCard and parsePrelimCard are basic, logging for strDescriptionEN covers this for now
          prelimCard: this.parsePrelimCard(event),
          
          // Additional UFC-specific data
          ufcNumber: this.extractUFCNumber(event.strEvent),
          broadcast: this.determineBroadcast(event),
          ticketInfo: event.strFilename || null
        };

        processedEvents.push(processedEvent);
        
      } catch (error) {
        console.error(`Error processing UFC event ${event.idEvent || '(no ID)'}:`, error.message, event);
      }
    });

    return processedEvents.sort((a, b) => {
        if (a.ukDateTime === null && b.ukDateTime === null) return 0;
        if (a.ukDateTime === null) return 1; 
        if (b.ukDateTime === null) return -1;
        return new Date(a.ukDateTime) - new Date(b.ukDateTime);
    });
  }

  buildLocation(event) {
    const parts = [];
    if (event.strVenue) parts.push(event.strVenue);
    if (event.strCity) parts.push(event.strCity);
    if (event.strCountry) parts.push(event.strCountry);
    return parts.join(', ') || 'TBD';
  }

  mapStatus(apiStatus) {
    return this.statusMap[apiStatus] || 'upcoming';
  }

  extractUFCNumber(eventTitle) {
    if (!eventTitle) return null; // Guard against null eventTitle
    const match = eventTitle.match(/UFC\s+(\d+)/i);
    return match ? match[1] : null;
  }

  determineBroadcast(event) {
    // Determine UK broadcast channel based on event details
    const title = (event.strEvent || '').toLowerCase();
    
    if (title.includes('ppv') || title.includes('pay-per-view')) {
      return 'TNT Sports Box Office';
    } else if (title.includes('fight night') || title.includes('on espn')) {
      return 'TNT Sports';
    } else {
      return 'TNT Sports'; // Default UK broadcaster for UFC
    }
  }

  parseMainCard(event) {
    // Try to parse fight card from description
    // This is basic parsing - TheSportsDB doesn't always have detailed fight cards
    const description = event.strDescriptionEN || '';
    
    if (description.includes('vs') || description.includes('V')) {
      // Try to extract main event
      const lines = description.split('\n').filter(line => 
        line.includes('vs') || line.includes('V')
      );
      
      if (lines.length > 0) {
        return lines.slice(0, 5).map(line => {
          const fighters = line.split(/vs|V/i);
          if (fighters.length >= 2) {
            return {
              fighter1: fighters[0].trim(),
              fighter2: fighters[1].trim(),
              weightClass: this.extractWeightClass(line),
              title: line.toLowerCase().includes('title') ? 'Title Fight' : ''
            };
          }
          return null;
        }).filter(Boolean);
      }
    }
    
    // Fallback to generic main event
    const eventTitle = event.strEvent || ''; // Guard against null strEvent
    return [{
      fighter1: 'Main Event',
      fighter2: 'TBD',
      weightClass: 'TBD',
      title: eventTitle.toLowerCase().includes('title') ? 'Title Fight' : ''
    }];
  }

  parsePrelimCard(event) {
    // Basic prelim card parsing
    return [
      { fighter1: 'Prelim Fight 1', fighter2: 'TBD', weightClass: 'TBD' },
      { fighter1: 'Prelim Fight 2', fighter2: 'TBD', weightClass: 'TBD' },
      { fighter1: 'Prelim Fight 3', fighter2: 'TBD', weightClass: 'TBD' }
    ];
  }

  extractWeightClass(fightLine) {
    const weightClasses = [
      'Heavyweight', 'Light Heavyweight', 'Middleweight', 'Welterweight',
      'Lightweight', 'Featherweight', 'Bantamweight', 'Flyweight',
      'Women\'s Bantamweight', 'Women\'s Flyweight', 'Women\'s Strawweight'
    ];
    
    for (const weightClass of weightClasses) {
      if (fightLine.toLowerCase().includes(weightClass.toLowerCase())) {
        return weightClass;
      }
    }
    return 'TBD';
  }

  async updateUFCData() {
    try {
      console.log('🔄 Starting UFC data update...');
      
      // Load existing data
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const existingData = dataManager.loadData();
      
      // Fetch both upcoming and recent events
      const [upcomingEvents, recentEvents] = await Promise.all([
        this.fetchUpcomingUFCEvents(),
        this.fetchRecentUFCEvents()
      ]);
      
      // Combine and deduplicate events
      const allEvents = [...recentEvents, ...upcomingEvents];
      const uniqueEvents = this.deduplicateEvents(allEvents);
      
      if (uniqueEvents.length === 0) {
        console.log('⚠️ No UFC events found');
        return { success: true, added: 0, total: existingData.ufcEvents?.length || 0 };
      }

      // Filter out events that already exist (avoid duplicates)
      const existingIds = new Set(
        (existingData.ufcEvents || []).map(e => e.apiEventId).filter(Boolean)
      );
      const newEvents = uniqueEvents.filter(event => !existingIds.has(event.apiEventId));

      console.log(`📊 Found ${uniqueEvents.length} total UFC events, ${newEvents.length} are new`);

      // Update UFC events in existing data
      const existingNonApiEvents = (existingData.ufcEvents || []).filter(e => !e.apiEventId);
      existingData.ufcEvents = [...existingNonApiEvents, ...uniqueEvents];
      
      // Update last fetch timestamp
      existingData.lastUFCFetch = new Date().toISOString();
      
      // Save updated data
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        console.log(`✅ Successfully updated UFC data: ${newEvents.length} new events`);
        console.log(`📊 Total UFC events now: ${existingData.ufcEvents.length}`);
        
        // Log the new events added
        newEvents.forEach(event => {
          console.log(`  🥊 ${event.date} - ${event.title} (${event.location})`);
        });
      }
      
      return { 
        success: saved, 
        added: newEvents.length, 
        total: existingData.ufcEvents.length,
        events: newEvents
      };
      
    } catch (error) {
      console.error('❌ Error updating UFC data:', error.message);
      return { success: false, error: error.message };
    }
  }

  deduplicateEvents(events) {
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.apiEventId || event.id}_${event.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Method to test API connection
  async testConnection() {
    try {
      console.log('🔍 Testing TheSportsDB API connection...');
      const result = await this.makeApiRequest('/eventsnextleague.php?id=4443');
      console.log('✅ UFC API connection successful!');
      return true;
    } catch (error) {
      console.error('❌ UFC API connection failed:', error.message);
      return false;
    }
  }
}

// If script is run directly, perform update
if (require.main === module) {
  const fetcher = new UFCFetcher();
  
  fetcher.updateUFCData().then(result => {
    if (result.success) {
      console.log(`🎉 UFC update completed: ${result.added} new events added`);
      process.exit(0);
    } else {
      console.error('💥 UFC update failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = UFCFetcher;
