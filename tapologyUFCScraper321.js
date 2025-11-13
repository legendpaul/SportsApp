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
   * Extract active fights with weight classes using bout hrefs
   */
  extractActiveFights(html, cancelledFighters) {
    const fights = [];
    const processedBouts = new Set();
    const fighterPairs = new Set();
    
    // STEP 1: Build a map of all fighters to their weight classes from the entire page
    console.log('   Building fighter-to-weight mapping...');
    const fighterWeightMap = new Map();
    
    // Look for patterns like: "Fighter Name" ... "170 lbs" within reasonable distance
    const fighterLinkRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let fighterMatch;
    
    while ((fighterMatch = fighterLinkRegex.exec(html)) !== null) {
      const fighterName = fighterMatch[1].trim();
      const fighterIndex = fighterMatch.index;
      
      // Look for weight within 500 characters AFTER this fighter mention
      const searchEnd = Math.min(html.length, fighterIndex + 500);
      const searchHTML = html.substring(fighterIndex, searchEnd);
      
      const weightMatch = searchHTML.match(/(\d+)\s*lbs/i);
      if (weightMatch && !fighterWeightMap.has(fighterName)) {
        fighterWeightMap.set(fighterName, `${weightMatch[1]} lbs`);
      }
    }
    
    console.log(`   Mapped ${fighterWeightMap.size} fighters to weight classes`);
    
    // STEP 2: Extract bouts
    const boutHrefRegex = /href="\/fightcenter\/bouts\/(\d+-[^"]+)"/gi;
    let boutMatch;
    
    console.log('   Searching for bout links...');
    
    while ((boutMatch = boutHrefRegex.exec(html)) !== null) {
      const boutUrl = boutMatch[1];
      const boutIndex = boutMatch.index;
      
      if (processedBouts.has(boutUrl)) continue;

      // Check if bout is in a "previous" or "past" section by looking for a section header
      const searchStartForSection = Math.max(0, boutIndex - 4000);
      const searchEndForSection = boutIndex;
      const precedingHtml = html.substring(searchStartForSection, searchEndForSection);
      const lastLi = precedingHtml.lastIndexOf('<li');
      const precedingHtmlTrimmed = precedingHtml.substring(lastLi);
      if (/class="[^"]*previous[^"]*"/.test(precedingHtmlTrimmed)) {
          console.log(`   - Skipping previous bout (in previous section): ${boutUrl}`);
          continue;
      }
      
      // Check if fizzled or has a result
      const checkRange = 300;
      const checkStart = Math.max(0, boutIndex - 100);
      const checkEnd = Math.min(html.length, boutIndex + checkRange);
      const checkHTML = html.substring(checkStart, checkEnd);
      
      if (checkHTML.match(/>fizzled<\/a>/i)) {
        console.log(`   - Skipping fizzled bout: ${boutUrl}`);
        continue;
      }

      // Check for result text like "Decision"
      const result_regex = /(>Decision<|>KO<|>TKO<|>Submission<|>Draw<|>NC<)/i;
      if (result_regex.test(checkHTML)) {
          console.log(`   - Skipping past bout (result found): ${boutUrl}`);
          continue;
      }
      
      // Extract fighters
      const searchStart = Math.max(0, boutIndex - 2000);
      const searchEnd = Math.min(html.length, boutIndex + 2000);
      const searchHTML = html.substring(searchStart, searchEnd);
      
      const fighterRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-[^"]*"[^>]*>([^<]+)<\/a>/gi;
      const fighters = [];
      let fMatch;
      
      while ((fMatch = fighterRegex.exec(searchHTML)) !== null) {
        const name = fMatch[1].trim();
        if (name.length > 2 && !fighters.includes(name)) {
          fighters.push(name);
        }
        if (fighters.length >= 2) break;
      }
      
      if (fighters.length < 2) continue;
      
      // Check for duplicates
      const pairKey = [fighters[0], fighters[1]].sort().join('|');
      if (fighterPairs.has(pairKey)) {
        continue;
      }
      
      // STEP 3: Get weight class from our mapping
      let weightClass = '';
      
      // Try to get weight from either fighter
      if (fighterWeightMap.has(fighters[0])) {
        weightClass = fighterWeightMap.get(fighters[0]);
      } else if (fighterWeightMap.has(fighters[1])) {
        weightClass = fighterWeightMap.get(fighters[1]);
      }
      
      // If still no weight, try a broader search in the bout area
      if (!weightClass) {
        const broadSearch = html.substring(
          Math.max(0, boutIndex - 5000),
          Math.min(html.length, boutIndex + 5000)
        );
        const weightMatch = broadSearch.match(/(\d+)\s*lbs/i);
        if (weightMatch) {
          weightClass = `${weightMatch[1]} lbs`;
        }
      }
      
      processedBouts.add(boutUrl);
      fighterPairs.add(pairKey);
      
      fights.push({
        fighter1: fighters[0],
        fighter2: fighters[1],
        weightClass: weightClass,
        result: null,
        boutUrl: boutUrl
      });
      
      console.log(`   ✓ ${fighters[0]} vs ${fighters[1]} (${weightClass || 'NO WEIGHT'})`);
    }
    
    console.log(`   Found ${fights.length} bouts with weight classes`);
    
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
   * Displays ALL non-cancelled and non-fizzled fights with no limits
   * Main card: First 5 fights (typical UFC structure)
   * Prelims: All remaining fights (no artificial caps)
   */
  organizeFightCard(fights) {
    // Main card is typically the first 5 fights
    const mainCardSize = Math.min(5, fights.length);
    const prelimStart = mainCardSize;
    
    // ALL remaining fights go to prelims - no caps, no limits
    // Just display everything that wasn't cancelled or fizzled
    const remainingFights = fights.length - prelimStart;
    
    return {
      mainCard: fights.slice(0, mainCardSize),
      prelimCard: fights.slice(prelimStart),  // ALL remaining fights
      earlyPrelimCard: []  // Not using early prelims anymore
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
