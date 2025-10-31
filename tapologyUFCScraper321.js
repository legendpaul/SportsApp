// UFC 321 Tapology Scraper - Integrated Version
// Based on the perfect extractUFC321.js implementation

const https = require('https');

class TapologyUFCScraper321 {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  /**
   * Scrape UFC event from Tapology URL
   * @param {string} eventUrl - The Tapology event URL
   * @returns {Promise<Object>} - Event data with fights
   */
  async scrapeEvent(eventUrl) {
    try {
      console.log(`\n🥊 UFC 321 Scraper: Fetching ${eventUrl}`);
      
      const html = await this.fetchUrl(eventUrl);
      console.log('✅ HTML received, parsing event...\n');
      
      // Extract event metadata
      const eventData = this.extractEventMetadata(html);
      
      // Find and extract cancelled fighters
      const cancelledFighters = this.extractCancelledFighters(html);
      
      // Extract active fighters (before cancelled section)
      const activeFights = this.extractActiveFights(html, cancelledFighters);
      
      // Organize fights into card sections
      const organizedCard = this.organizeFightCard(activeFights);
      
      console.log(`✅ Scraped: ${eventData.title}`);
      console.log(`   📅 ${eventData.date}`);
      console.log(`   📍 ${eventData.location}`);
      console.log(`   🥊 ${activeFights.length} Total Fights\n`);
      
      return {
        ...eventData,
        totalFights: activeFights.length,
        mainCard: organizedCard.mainCard,
        prelimCard: organizedCard.prelimCard,
        earlyPrelimCard: organizedCard.earlyPrelimCard,
        allFights: activeFights,
        scrapedAt: new Date().toISOString(),
        source: 'tapology',
        sourceUrl: eventUrl
      };
      
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw error;
    }
  }

  /**
   * Extract event metadata (title, date, location)
   */
  extractEventMetadata(html) {
    // Extract title
    const titleMatch = html.match(/<title>([^<|]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : 'UFC Event';
    
    // Extract date
    const dateMatch = html.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
    const date = dateMatch ? dateMatch[0] : 'TBD';
    
    // Extract location
    const locationMatch = html.match(/at\s+([^<]+?)\s+in\s+([^<\.]+)/i);
    const location = locationMatch 
      ? `${locationMatch[1].trim()}, ${locationMatch[2].trim()}` 
      : 'TBD';
    
    return { title, date, location };
  }

  /**
   * Extract cancelled fighters from the cancelled section
   */
  extractCancelledFighters(html) {
    const cancelledFighters = new Set();
    
    const cancelledSectionStart = html.indexOf("id='sectionCancelled'");
    
    if (cancelledSectionStart !== -1) {
      const cancelledSectionEnd = html.indexOf('<section', cancelledSectionStart + 1000);
      const cancelledHTML = html.substring(cancelledSectionStart, cancelledSectionEnd);
      
      const fighterRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-[^"]*"[^>]*>([^<]+)<\/a>/gi;
      let match;
      
      while ((match = fighterRegex.exec(cancelledHTML)) !== null) {
        const name = match[1].trim();
        cancelledFighters.add(name.toLowerCase());
      }
      
      if (cancelledFighters.size > 0) {
        console.log(`   Found ${cancelledFighters.size} cancelled fighters`);
      }
    }
    
    return cancelledFighters;
  }

  /**
   * Extract active fighters before the cancelled section
   */
  extractActiveFights(html, cancelledFighters) {
    const cancelledSectionStart = html.indexOf("id='sectionCancelled'");
    const activeSectionHTML = cancelledSectionStart !== -1 
      ? html.substring(0, cancelledSectionStart) 
      : html;
    
    // Extract all fighter links
    const fighterLinkRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const allFighters = [];
    let match;
    
    while ((match = fighterLinkRegex.exec(activeSectionHTML)) !== null) {
      const name = match[2].trim();
      allFighters.push(name);
    }
    
    console.log(`   Found ${allFighters.length} fighter mentions in active section`);
    
    // Deduplicate using last name
    const uniqueFighters = this.deduplicateFighters(allFighters);
    
    console.log(`   ${uniqueFighters.length} unique active fighters`);
    
    // Pair consecutive fighters into bouts
    const fights = [];
    for (let i = 0; i < uniqueFighters.length - 1; i += 2) {
      fights.push({
        fighter1: uniqueFighters[i],
        fighter2: uniqueFighters[i + 1],
        weightClass: '',
        result: null
      });
    }
    
    return fights;
  }

  /**
   * Deduplicate fighters by last name, keeping longer names
   */
  deduplicateFighters(fighters) {
    const uniqueFighters = [];
    const seenLastNames = new Map();
    
    for (const name of fighters) {
      const parts = name.split(/\s+/);
      const lastName = parts[parts.length - 1].toLowerCase().replace(/[.]/g, '');
      
      if (seenLastNames.has(lastName)) {
        const existingName = seenLastNames.get(lastName);
        if (name.length > existingName.length) {
          const idx = uniqueFighters.indexOf(existingName);
          if (idx !== -1) {
            uniqueFighters[idx] = name;
            seenLastNames.set(lastName, name);
          }
        }
        continue;
      }
      
      seenLastNames.set(lastName, name);
      uniqueFighters.push(name);
    }
    
    return uniqueFighters;
  }

  /**
   * Organize fights into main card, prelims, and early prelims
   */
  organizeFightCard(fights) {
    const mainCardSize = Math.min(6, fights.length);
    const prelimStart = mainCardSize;
    const prelimSize = Math.min(4, fights.length - prelimStart);
    const earlyStart = prelimStart + prelimSize;
    
    return {
      mainCard: fights.slice(0, mainCardSize),
      prelimCard: fights.slice(prelimStart, prelimStart + prelimSize),
      earlyPrelimCard: fights.slice(earlyStart)
    };
  }

  /**
   * Fetch URL using HTTPS
   */
  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { 
        headers: { 
          'User-Agent': this.userAgent 
        } 
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
}

module.exports = TapologyUFCScraper321;
