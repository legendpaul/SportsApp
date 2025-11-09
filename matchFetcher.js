const https = require('https');
const fs = require('fs');
const path = require('path');

class MatchFetcher {
  constructor(debugLogCallback = null) {
    this.baseUrl = 'www.live-footballontv.com';
    this.dataManager = null;
    this.debugLog = debugLogCallback || ((category, message, data) => {
      console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    });
    
    // UK TV Channel mappings and names
    this.channelMappings = {
      'BBC One': 'BBC One',
      'BBC Two': 'BBC Two', 
      'BBC Three': 'BBC Three',
      'BBC Four': 'BBC Four',
      'BBC One Wales': 'BBC One Wales',
      'BBC One Scotland': 'BBC One Scotland',
      'BBC One NI': 'BBC One NI',
      'BBC Two Wales': 'BBC Two Wales',
      'BBC Scotland': 'BBC Scotland',
      'BBC Two NI': 'BBC Two NI',
      'BBC iPlayer': 'BBC iPlayer',
      'BBC Sport Website': 'BBC Sport Website',
      'BBC Red Button': 'BBC Red Button',
      'ITV1': 'ITV1',
      'ITV2': 'ITV2', 
      'ITV3': 'ITV3',
      'ITV4': 'ITV4',
      'ITVX': 'ITVX',
      'STV': 'STV',
      'STV Player': 'STV Player',
      'Channel 4': 'Channel 4',
      'Channel 4 Online': 'Channel 4 Online',
      'Channel 4 Sport YouTube': 'Channel 4 Sport YouTube',
      '4seven': '4seven',
      'Sky Sports Premier League': 'Sky Sports Premier League',
      'Sky Sports Football': 'Sky Sports Football',
      'Sky Sports': 'Sky Sports',
      'Sky Sports Main Event': 'Sky Sports Main Event',
      'TNT Sports': 'TNT Sports',
      'TNT Sports 1': 'TNT Sports 1',
      'TNT Sports 2': 'TNT Sports 2',
      'TNT Sports 3': 'TNT Sports 3',
      'BT Sport': 'BT Sport',
      'Premier Sports': 'Premier Sports',
      'Premier Sports 1': 'Premier Sports 1',
      'Premier Sports 2': 'Premier Sports 2',
      'S4C': 'S4C',
      'S4C Online': 'S4C Online',
      'Amazon Prime Video': 'Amazon Prime Video',
      'Discovery+': 'Discovery+',
      'DAZN': 'DAZN',
      'ESPN': 'ESPN',
      'ESPN+': 'ESPN+',
      'Eurosport': 'Eurosport',
      '5': 'Channel 5',
      '5Action': '5Action',
      'UEFA.tv': 'UEFA.tv',
      'FIFA+': 'FIFA+',
      'LOITV': 'LOITV',
      'NWSL+': 'NWSL+',
      'Apple TV': 'Apple TV',
      'Youth Football Arena': 'Youth Football Arena'
    };
  }

  async fetchTodaysMatches() {
    try {
      this.debugLog('requests', 'Starting to fetch today\'s matches from live-footballontv.com...');
      
      const htmlContent = await this.makeWebRequest('/');
      
      if (!htmlContent) {
        this.debugLog('requests', 'No content received from website');
        return [];
      }

      this.debugLog('requests', `Received HTML content: ${htmlContent.length} characters`);
      
      // Save raw HTML for debugging
      this.saveDebugHTML(htmlContent);
      
      this.debugLog('data', 'Processing matches from website...');
      
      const processedMatches = this.parseMatches(htmlContent);
      
      // Filter for today's matches
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = processedMatches.filter(match => match.matchDate === today);
      
      this.debugLog('data', `Found ${processedMatches.length} total matches, ${todayMatches.length} for today`, {
        today: today,
        allDates: [...new Set(processedMatches.map(m => m.matchDate))],
        sampleMatches: processedMatches.slice(0, 3)
      });
      
      return todayMatches;
      
    } catch (error) {
      this.debugLog('requests', `Error fetching matches: ${error.message}`);
      return [];
    }
  }

  parseMatches(htmlContent) {
    this.debugLog('data', 'Starting to parse HTML content for matches...');
    const matches = [];
    
    try {
      // Parse HTML content to extract structured match data
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Look for today's date section in HTML
      const todayPatterns = [
        `Sunday ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
        `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`
      ];
      
      this.debugLog('data', 'Looking for today\'s date patterns', { patterns: todayPatterns });
      
      // Find today's date section
      let todaySection = null;
      let nextDayIndex = -1;
      
      for (const pattern of todayPatterns) {
        const patternIndex = htmlContent.indexOf(pattern);
        if (patternIndex !== -1) {
          this.debugLog('data', `Found today's date section: ${pattern}`);
          todaySection = pattern;
          
          // Find the start of today's fixtures and end of today's fixtures
          const fixtureStartIndex = htmlContent.indexOf('<div class="fixture">', patternIndex);
          
          // Find next day to know where today's fixtures end
          const nextDayPattern = htmlContent.indexOf('class="fixture-date"', patternIndex + pattern.length);
          nextDayIndex = nextDayPattern !== -1 ? nextDayPattern : htmlContent.length;
          
          if (fixtureStartIndex !== -1 && fixtureStartIndex < nextDayIndex) {
            const todayFixturesSection = htmlContent.substring(fixtureStartIndex, nextDayIndex);
            matches.push(...this.parseFixturesFromHTML(todayFixturesSection, todayFormatted));
          }
          break;
        }
      }
      
      if (!todaySection) {
        this.debugLog('data', 'Could not find today\'s date section, parsing all fixtures for today');
        
        // Fallback: parse all fixtures and filter by current time
        const allFixtures = this.parseAllFixturesFromHTML(htmlContent);
        const todayMatches = allFixtures.filter(match => {
          // If we can't find today's date, assume all parsed matches are for today
          match.matchDate = todayFormatted;
          return true;
        });
        
        matches.push(...todayMatches);
      }
      
      this.debugLog('data', `Parsing completed: ${matches.length} matches extracted`);
      
    } catch (error) {
      this.debugLog('data', `Error parsing matches: ${error.message}`);
    }
    
    return matches;
  }

  parseFixturesFromHTML(htmlSection, matchDate) {
    const matches = [];
    
    try {
      // Split by fixture divs
      const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
      let match;
      
      while ((match = fixtureRegex.exec(htmlSection)) !== null) {
        const fixtureHTML = match[1];
        const parsedMatch = this.parseIndividualFixture(fixtureHTML, matchDate);
        
        if (parsedMatch) {
          matches.push(parsedMatch);
        }
      }
      
    } catch (error) {
      this.debugLog('data', `Error parsing fixtures section: ${error.message}`);
    }
    
    return matches;
  }

  parseAllFixturesFromHTML(htmlContent) {
    const matches = [];
    
    try {
      // Extract all fixture divs from the entire HTML
      const fixtureRegex = /<div class="fixture">(.*?)<\/div>(?=<div class="fixture">|<div class="advertfixtures">|<div class="anchor">|$)/gs;
      let match;
      
      const today = new Date().toISOString().split('T')[0];
      
      while ((match = fixtureRegex.exec(htmlContent)) !== null) {
        const fixtureHTML = match[1];
        const parsedMatch = this.parseIndividualFixture(fixtureHTML, today);
        
        if (parsedMatch) {
          matches.push(parsedMatch);
        }
      }
      
    } catch (error) {
      this.debugLog('data', `Error parsing all fixtures: ${error.message}`);
    }
    
    return matches;
  }

  shouldExcludeMatch(teamA, teamB, competition) {
    // List of keywords to exclude (case insensitive)
    const excludeKeywords = ['women', 'u17', 'u 17', 'u18', 'u 18', 'u19', 'u 19', 'u20', 'u 20'];
    
    // Combine all text to check
    const textToCheck = `${teamA} ${teamB} ${competition}`.toLowerCase();
    
    // Check if any exclude keyword is present
    for (const keyword of excludeKeywords) {
      if (textToCheck.includes(keyword)) {
        this.debugLog('data', `Excluding match: "${teamA} vs ${teamB}" (${competition}) - contains "${keyword}"`);
        return true;
      }
    }
    
    return false;
  }

  parseIndividualFixture(fixtureHTML, matchDate) {
    try {
      // Extract time
      const timeMatch = fixtureHTML.match(/<div class="fixture__time">([^<]+)<\/div>/);
      if (!timeMatch) return null;
      
      const time = timeMatch[1].trim();
      if (time === 'TBC') return null; // Skip TBC matches
      
      // Extract teams
      const teamsMatch = fixtureHTML.match(/<div class="fixture__teams">([^<]+)<\/div>/);
      if (!teamsMatch) return null;
      
      const teamsText = teamsMatch[1].trim();
      const teams = this.parseTeamsFromText(teamsText);
      if (!teams) return null;
      
      // Extract competition
      const competitionMatch = fixtureHTML.match(/<div class="fixture__competition">([^<]+)<\/div>/);
      const competition = competitionMatch ? this.cleanHTML(competitionMatch[1].trim()) : 'Football';
      
      // Filter out women's and youth matches
      if (this.shouldExcludeMatch(teams.teamA, teams.teamB, competition)) {
        return null;
      }
      
      // Extract channels
      const channels = this.parseChannelsFromHTML(fixtureHTML);
      
      const matchObj = {
        id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        time: time,
        teamA: teams.teamA,
        teamB: teams.teamB,
        competition: competition,
        channel: channels.length > 0 ? channels.join(', ') : 'Check TV Guide',
        channels: channels.length > 0 ? channels : ['Check TV Guide'],
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        matchDate: matchDate,
        apiSource: 'live-footballontv.com',
        venue: ''
      };
      
      this.debugLog('data', `Parsed match: ${teams.teamA} vs ${teams.teamB} at ${time}`, {
        competition,
        channels
      });
      
      return matchObj;
      
    } catch (error) {
      this.debugLog('data', `Error parsing individual fixture: ${error.message}`);
      return null;
    }
  }

  parseTeamsFromText(teamsText) {
    try {
      // Clean the text and try different patterns
      const cleanText = teamsText.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
      
      const patterns = [
        /^(.+?)\s+v\s+(.+)$/,
        /^(.+?)\s+vs\s+(.+)$/,
        /^(.+?)\s+V\s+(.+)$/,
        /(.+?)\s+-\s+(.+)/
      ];
      
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match && match[1] && match[2]) {
          const teamA = match[1].trim();
          const teamB = match[2].trim();
          
          // Basic validation - teams should be at least 2 characters
          if (teamA.length >= 2 && teamB.length >= 2 && teamA !== teamB) {
            return { teamA, teamB };
          }
        }
      }
    } catch (error) {
      this.debugLog('data', `Error parsing teams from "${teamsText}": ${error.message}`);
    }
    
    return null;
  }

  parseChannelsFromHTML(fixtureHTML) {
    const channels = [];
    
    try {
      // Extract channel pills
      const channelRegex = /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g;
      let match;
      
      while ((match = channelRegex.exec(fixtureHTML)) !== null) {
        const channelText = this.cleanHTML(match[1].trim());
        
        // Map channel names
        const mappedChannel = this.channelMappings[channelText] || channelText;
        
        if (mappedChannel && mappedChannel !== 'Check TV Guide' && !channels.includes(mappedChannel)) {
          channels.push(mappedChannel);
        }
      }
      
    } catch (error) {
      this.debugLog('data', `Error parsing channels: ${error.message}`);
    }
    
    return channels;
  }

  cleanHTML(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  getOrdinalSuffix(day) {
    const j = day % 10;
    const k = day % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
  }

  saveDebugHTML(htmlContent) {
    try {
      const debugDir = path.join(__dirname, 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const debugFile = path.join(debugDir, 'fetched_html.html');
      fs.writeFileSync(debugFile, htmlContent);
      this.debugLog('data', `Saved raw HTML to debug/fetched_html.html for inspection`);
    } catch (error) {
      this.debugLog('data', `Could not save debug HTML: ${error.message}`);
    }
  }

  makeWebRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: endpoint,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      this.debugLog('requests', `Making request to https://${this.baseUrl}${endpoint}`);

      const req = https.request(options, (res) => {
        let data = '';
        
        this.debugLog('requests', `Response status: ${res.statusCode} ${res.statusMessage}`);
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          this.debugLog('requests', `Response completed. Content length: ${data.length} characters`);
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Website Error: ${res.statusCode} - ${data.substring(0, 200)}...`));
          }
        });
      });

      req.on('error', (error) => {
        this.debugLog('requests', `Request failed: ${error.message}`);
        reject(new Error(`Request Error: ${error.message}`));
      });

      req.setTimeout(15000, () => {
        req.destroy();
        this.debugLog('requests', 'Request timed out after 15 seconds');
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async updateMatchData() {
    try {
      this.debugLog('data', 'Starting automatic match data update...');
      
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const existingData = dataManager.loadData();
      
      const newMatches = await this.fetchTodaysMatches();
      
      if (newMatches.length === 0) {
        this.debugLog('data', 'No new matches found from website');
        return { success: true, added: 0, total: existingData.footballMatches.length };
      }

      const existingIds = new Set(
        existingData.footballMatches.map(m => 
          `${m.teamA}_${m.teamB}_${m.time}_${m.matchDate}`
        )
      );
      
      const uniqueNewMatches = newMatches.filter(match => {
        const matchKey = `${match.teamA}_${match.teamB}_${match.time}_${match.matchDate}`;
        return !existingIds.has(matchKey);
      });

      this.debugLog('data', `Found ${newMatches.length} total matches, ${uniqueNewMatches.length} are new`);

      existingData.footballMatches.push(...uniqueNewMatches);
      
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        this.debugLog('data', `Successfully added ${uniqueNewMatches.length} new matches`);
        
        uniqueNewMatches.forEach(match => {
          this.debugLog('data', `Added: ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition})`);
        });
      }
      
      return { 
        success: saved, 
        added: uniqueNewMatches.length, 
        total: existingData.footballMatches.length,
        matches: uniqueNewMatches
      };
      
    } catch (error) {
      this.debugLog('data', `Error updating match data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      this.debugLog('requests', 'Testing live-footballontv.com connection...');
      const content = await this.makeWebRequest('/');
      const success = content && content.length > 1000;
      this.debugLog('requests', `Website connection ${success ? 'successful' : 'failed'} - content length: ${content ? content.length : 0}`);
      return success;
    } catch (error) {
      this.debugLog('requests', `Website connection failed: ${error.message}`);
      return false;
    }
  }

  getAllChannels(matches) {
    const allChannels = new Set();
    
    matches.forEach(match => {
      if (match.channels && Array.isArray(match.channels)) {
        match.channels.forEach(channel => {
          if (channel && channel !== 'Check TV Guide') {
            allChannels.add(channel);
          }
        });
      } else if (match.channel && match.channel !== 'Check TV Guide') {
        const channels = match.channel.split(',').map(ch => ch.trim());
        channels.forEach(channel => {
          if (channel) {
            allChannels.add(channel);
          }
        });
      }
    });
    
    return Array.from(allChannels).sort();
  }
}

if (require.main === module) {
  const fetcher = new MatchFetcher();
  
  fetcher.updateMatchData().then(result => {
    if (result.success) {
      console.log(`🎉 Match update completed: ${result.added} new matches added`);
      process.exit(0);
    } else {
      console.error('💥 Match update failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = MatchFetcher;
