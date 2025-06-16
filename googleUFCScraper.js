const https = require('https');
const { URL } = require('url');

class GoogleUFCScraper {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.baseUrl = 'www.google.com';
  }

  /**
   * Search Google for UFC event information
   * @param {string} eventName - UFC event name (e.g., "UFC Hill vs Rountree")
   * @returns {Promise<object>} UFC event data with accurate start times
   */
  async searchUFCEvent(eventName) {
    try {
      console.log(`🔍 Searching Google for: ${eventName}`);
      
      // Search queries to try
      const searchQueries = [
        `${eventName} start time UK fight card`,
        `${eventName} prelims main card time`,
        `${eventName} schedule UK broadcast`,
        `UFC ${eventName} when does it start`
      ];
      
      for (const query of searchQueries) {
        try {
          const searchResults = await this.performGoogleSearch(query);
          const ufcData = this.parseUFCData(searchResults, eventName);
          
          if (ufcData && ufcData.hasValidTimes) {
            console.log(`✅ Found UFC data for: ${eventName}`);
            return ufcData;
          }
        } catch (searchError) {
          console.log(`⚠️ Search failed for "${query}": ${searchError.message}`);
          continue;
        }
      }
      
      console.log(`❌ No UFC data found for: ${eventName}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Error searching for UFC event: ${error.message}`);
      return null;
    }
  }

  /**
   * Perform Google search and return HTML content
   * @param {string} query - Search query
   * @returns {Promise<string>} HTML content
   */
  async performGoogleSearch(query) {
    return new Promise((resolve, reject) => {
      const encodedQuery = encodeURIComponent(query);
      const searchPath = `/search?q=${encodedQuery}&hl=en&gl=uk`;
      
      const options = {
        hostname: this.baseUrl,
        path: searchPath,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        // Handle gzip encoding
        const stream = res.headers['content-encoding'] === 'gzip' 
          ? require('zlib').createGunzip() 
          : res;
        
        if (res.headers['content-encoding'] === 'gzip') {
          res.pipe(stream);
        } else {
          stream = res;
        }
        
        stream.on('data', (chunk) => {
          data += chunk;
        });
        
        stream.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Google search failed: ${res.statusCode}`));
          }
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Google request error: ${error.message}`));
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Google search timeout'));
      });

      req.end();
    });
  }

  /**
   * Parse UFC data from Google search results
   * @param {string} html - Google search results HTML
   * @param {string} eventName - UFC event name
   * @returns {object} Parsed UFC data
   */
  parseUFCData(html, eventName) {
    try {
      const ufcData = {
        eventName,
        hasValidTimes: false,
        startTimes: {},
        fightCard: [],
        venue: null,
        date: null,
        broadcastInfo: null
      };

      // Extract fight card information
      ufcData.fightCard = this.extractFightCard(html);
      
      // Extract start times
      ufcData.startTimes = this.extractStartTimes(html);
      
      // Extract venue and date
      ufcData.venue = this.extractVenue(html);
      ufcData.date = this.extractDate(html);
      
      // Extract broadcast information
      ufcData.broadcastInfo = this.extractBroadcastInfo(html);
      
      // Validate if we found useful data
      ufcData.hasValidTimes = this.validateUFCData(ufcData);
      
      return ufcData;
      
    } catch (error) {
      console.error(`Error parsing UFC data: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract fight card from Google results
   * @param {string} html - HTML content
   * @returns {array} Fight card array
   */
  extractFightCard(html) {
    const fights = [];
    
    try {
      // Look for fight card patterns in Google results
      const fightPatterns = [
        /([A-Za-z\s]+)\s+vs?\.?\s+([A-Za-z\s]+)/g,
        /([A-Za-z\s]+)\s+v\s+([A-Za-z\s]+)/g,
        /([A-Za-z\s]+)\s+-\s+([A-Za-z\s]+)/g
      ];
      
      for (const pattern of fightPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && fights.length < 10) {
          const fighter1 = match[1].trim();
          const fighter2 = match[2].trim();
          
          // Filter out obvious non-fighter matches
          if (this.isValidFighterName(fighter1) && this.isValidFighterName(fighter2)) {
            fights.push({
              fighter1,
              fighter2,
              weightClass: this.extractWeightClass(match[0])
            });
          }
        }
      }
      
    } catch (error) {
      console.error(`Error extracting fight card: ${error.message}`);
    }
    
    return fights;
  }

  /**
   * Extract start times from Google results
   * @param {string} html - HTML content
   * @returns {object} Start times object
   */
  extractStartTimes(html) {
    const times = {
      earlyPrelims: null,
      prelims: null,
      mainCard: null,
      ukTime: null,
      etTime: null
    };
    
    try {
      // Time patterns to look for
      const timePatterns = [
        // UK time patterns
        /(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?\s+(?:UK|GMT|BST)/gi,
        /(\d{1,2}):?(\d{2})\s+(?:UK|GMT|BST)/gi,
        
        // General time patterns with context
        /(?:main\s+card|main-card).*?(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?/gi,
        /(?:prelim|preliminary).*?(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?/gi,
        /(?:early\s+prelim).*?(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?/gi,
        
        // Time ranges
        /(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?\s?-\s?(\d{1,2}):?(\d{2})\s?(?:PM|AM|pm|am)?/gi
      ];
      
      for (const pattern of timePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const timeStr = match[0];
          const context = html.substring(Math.max(0, match.index - 50), match.index + 50).toLowerCase();
          
          // Determine which part of the card this time refers to
          if (context.includes('main') && context.includes('card')) {
            times.mainCard = this.parseTimeString(timeStr);
          } else if (context.includes('prelim') && !context.includes('early')) {
            times.prelims = this.parseTimeString(timeStr);
          } else if (context.includes('early')) {
            times.earlyPrelims = this.parseTimeString(timeStr);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error extracting start times: ${error.message}`);
    }
    
    return times;
  }

  /**
   * Extract venue information
   * @param {string} html - HTML content
   * @returns {string} Venue name
   */
  extractVenue(html) {
    try {
      const venuePatterns = [
        /(?:venue|location|arena).*?([A-Za-z\s]+(?:Arena|Center|Centre|Stadium|APEX))/gi,
        /(T-Mobile Arena|UFC APEX|Madison Square Garden|O2 Arena)/gi
      ];
      
      for (const pattern of venuePatterns) {
        const match = pattern.exec(html);
        if (match) {
          return match[1] || match[0];
        }
      }
    } catch (error) {
      console.error(`Error extracting venue: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Extract event date
   * @param {string} html - HTML content
   * @returns {string} Event date
   */
  extractDate(html) {
    try {
      const datePatterns = [
        /(\w+day,\s+\w+\s+\d{1,2},\s+\d{4})/gi,
        /(\d{1,2}\/\d{1,2}\/\d{4})/gi,
        /(\d{4}-\d{2}-\d{2})/gi
      ];
      
      for (const pattern of datePatterns) {
        const match = pattern.exec(html);
        if (match) {
          return match[0];
        }
      }
    } catch (error) {
      console.error(`Error extracting date: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Extract broadcast information
   * @param {string} html - HTML content
   * @returns {string} Broadcast channel
   */
  extractBroadcastInfo(html) {
    try {
      const broadcastPatterns = [
        /(TNT Sports|ESPN|ABC|Sky Sports|BBC)/gi,
        /(Box Office|Pay-per-view|PPV)/gi
      ];
      
      for (const pattern of broadcastPatterns) {
        const match = pattern.exec(html);
        if (match) {
          return match[0];
        }
      }
    } catch (error) {
      console.error(`Error extracting broadcast info: ${error.message}`);
    }
    
    return 'TNT Sports'; // Default UK broadcaster
  }

  /**
   * Validate if UFC data contains useful information
   * @param {object} ufcData - UFC data object
   * @returns {boolean} Whether data is valid
   */
  validateUFCData(ufcData) {
    return (
      ufcData.startTimes.mainCard || 
      ufcData.startTimes.prelims || 
      ufcData.fightCard.length > 0 ||
      ufcData.date ||
      ufcData.venue
    );
  }

  /**
   * Check if a name looks like a valid fighter name
   * @param {string} name - Name to check
   * @returns {boolean} Whether it's a valid fighter name
   */
  isValidFighterName(name) {
    if (!name || name.length < 3 || name.length > 30) return false;
    
    // Filter out common non-fighter terms
    const invalidTerms = [
      'UFC', 'fight', 'card', 'main', 'event', 'prelim', 'time', 'start',
      'watch', 'live', 'stream', 'tv', 'channel', 'schedule', 'results'
    ];
    
    return !invalidTerms.some(term => 
      name.toLowerCase().includes(term.toLowerCase())
    );
  }

  /**
   * Extract weight class from fight text
   * @param {string} fightText - Fight text
   * @returns {string} Weight class
   */
  extractWeightClass(fightText) {
    const weightClasses = [
      'Heavyweight', 'Light Heavyweight', 'Middleweight', 'Welterweight',
      'Lightweight', 'Featherweight', 'Bantamweight', 'Flyweight',
      "Women's Bantamweight", "Women's Flyweight", "Women's Strawweight"
    ];
    
    for (const weightClass of weightClasses) {
      if (fightText.toLowerCase().includes(weightClass.toLowerCase())) {
        return weightClass;
      }
    }
    
    return 'TBD';
  }

  /**
   * Parse time string into structured format
   * @param {string} timeStr - Time string
   * @returns {object} Parsed time object
   */
  parseTimeString(timeStr) {
    try {
      const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})\s?(PM|AM|pm|am)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] || '00';
        const ampm = timeMatch[3];
        
        // Convert to 24-hour format
        if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        return {
          hours,
          minutes,
          formatted: `${String(hours).padStart(2, '0')}:${minutes}`
        };
      }
    } catch (error) {
      console.error(`Error parsing time string: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Test the Google scraper with a known UFC event
   */
  async testScraper() {
    console.log('🧪 Testing Google UFC scraper...');
    
    const testEvents = [
      'UFC Hill vs Rountree',
      'UFC Blanchfield vs Barber',
      'UFC 315'
    ];
    
    for (const event of testEvents) {
      console.log(`\n🔍 Testing: ${event}`);
      const result = await this.searchUFCEvent(event);
      
      if (result && result.hasValidTimes) {
        console.log('✅ Success! Found:');
        console.log(`   📅 Date: ${result.date || 'Not found'}`);
        console.log(`   🏟️ Venue: ${result.venue || 'Not found'}`);
        console.log(`   📺 Broadcast: ${result.broadcastInfo || 'Not found'}`);
        console.log(`   ⏰ Times:`);
        if (result.startTimes.earlyPrelims) {
          console.log(`      Early Prelims: ${result.startTimes.earlyPrelims.formatted}`);
        }
        if (result.startTimes.prelims) {
          console.log(`      Prelims: ${result.startTimes.prelims.formatted}`);
        }
        if (result.startTimes.mainCard) {
          console.log(`      Main Card: ${result.startTimes.mainCard.formatted}`);
        }
        console.log(`   🥊 Fights found: ${result.fightCard.length}`);
      } else {
        console.log('❌ No data found');
      }
    }
  }
}

module.exports = GoogleUFCScraper;

// Test if run directly
if (require.main === module) {
  const scraper = new GoogleUFCScraper();
  scraper.testScraper().then(() => {
    console.log('\n🏁 Google UFC scraper test completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Scraper test failed:', error);
    process.exit(1);
  });
}
