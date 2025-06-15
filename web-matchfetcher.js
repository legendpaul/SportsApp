// Web-compatible Match Fetcher - Uses Netlify Functions for real data
// Version: 2.1.0 - Fixed Netlify environment detection
class WebMatchFetcher {
  constructor(debugLogCallback = null) {
    this.version = '2.1.0';
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-football';
    this.corsProxyUrl = 'https://api.allorigins.win/get?url=';
    this.directUrl = 'https://www.live-footballontv.com';
    
    // Initialize debug function first
    this.debugLog = debugLogCallback || ((category, message, data) => {
      console.log(`[${category.toUpperCase()}] ${message}`, data || '');
    });
    
    // Log version for debugging
    this.debugLog('requests', `WebMatchFetcher v${this.version} initializing...`);
    
    // Then detect environment
    this.isLocal = this.detectLocalEnvironment();
  }

  detectLocalEnvironment() {
    // Check if running locally (not on Netlify)
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Local development indicators
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    const isFileProtocol = protocol === 'file:';
    const hasDevPort = port && (port === '3000' || port === '8080' || port === '5000');
    
    // Netlify indicators (production)
    const isNetlify = hostname.includes('.netlify.app') || hostname.includes('.netlify.com');
    const isHTTPS = protocol === 'https:';
    
    // Determine environment
    const isLocal = (isLocalhost || isFileProtocol || hasDevPort) && !isNetlify;
    
    // Log detailed environment info
    const envInfo = {
      hostname,
      protocol,
      port,
      isLocalhost,
      isFileProtocol,
      hasDevPort,
      isNetlify,
      isHTTPS,
      finalDecision: isLocal ? 'Local Development' : 'Production (Netlify)'
    };
    
    // Log after debugLog is available
    if (this.debugLog) {
      this.debugLog('requests', `Environment detection complete: ${envInfo.finalDecision}`, envInfo);
    } else {
      console.log(`[REQUESTS] Environment detection complete: ${envInfo.finalDecision}`, envInfo);
    }
    
    return isLocal; // Ensure this returns boolean
  }

  async fetchTodaysMatches() {
    try {
      // Log current environment for debugging
      const envDetails = {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
        href: window.location.href,
        isLocal: this.isLocal // This should be boolean
      };
      
      this.debugLog('requests', `Starting fetch with environment details:`, envDetails);
      
      if (this.isLocal) {
        this.debugLog('requests', 'Local development detected - using CORS proxy for live data...');
        return await this.fetchWithCorsProxy();
      } else {
        this.debugLog('requests', 'Production environment - using Netlify function...');
        return await this.fetchWithNetlifyFunction();
      }
    } catch (error) {
      this.debugLog('requests', `Error fetching matches: ${error.message}`);
      
      // Try fallback methods if primary fails
      if (this.isLocal) {
        this.debugLog('requests', 'CORS proxy failed, trying direct fetch...');
        try {
          return await this.fetchDirect();
        } catch (fallbackError) {
          this.debugLog('requests', 'All methods failed, using demo data for local development');
          return this.generateLocalDemoMatches();
        }
      } else {
        // In production, if Netlify function fails completely, use demo data
        this.debugLog('requests', 'Netlify function failed completely, using demo data as fallback');
        return this.generateLocalDemoMatches();
      }
    }
  }

  async fetchWithNetlifyFunction() {
    const response = await fetch(this.netlifyFunctionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Netlify function failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Function returned error: ${data.error}`);
    }

    // Log the data source and any notes
    const source = data.source || 'unknown';
    const fetchMethod = data.fetchMethod || 'unknown';
    const note = data.note || '';
    
    this.debugLog('requests', `Successfully fetched ${data.todayCount} matches from Netlify function`, {
      totalFound: data.totalFound,
      todayCount: data.todayCount,
      fetchTime: data.fetchTime,
      source: source,
      fetchMethod: fetchMethod,
      note: note
    });
    
    // Log additional info if using demo data
    if (source === 'demo-data') {
      this.debugLog('requests', `Using demo data: ${note}`);
      if (data.error) {
        this.debugLog('requests', `Original error: ${data.error}`);
      }
    } else if (source === 'live-data') {
      this.debugLog('requests', `Successfully fetched live data via ${fetchMethod}`);
    }

    return data.matches || [];
  }

  async fetchWithCorsProxy() {
    this.debugLog('requests', 'Attempting CORS proxy fetch...');
    
    const proxyUrl = `${this.corsProxyUrl}${encodeURIComponent(this.directUrl)}`;
    const response = await fetch(proxyUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`CORS proxy failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.contents) {
      throw new Error('CORS proxy returned no content');
    }

    this.debugLog('requests', `CORS proxy successful - received ${data.contents.length} characters`);
    
    const matches = this.parseMatches(data.contents);
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(match => match.matchDate === today);
    
    this.debugLog('requests', `Parsed ${matches.length} total matches, ${todayMatches.length} for today`);
    
    return todayMatches;
  }

  async fetchDirect() {
    this.debugLog('requests', 'Attempting direct fetch (will likely fail due to CORS)...');
    
    const response = await fetch(this.directUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    this.debugLog('requests', `Direct fetch successful - received ${html.length} characters`);
    
    const matches = this.parseMatches(html);
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(match => match.matchDate === today);
    
    return todayMatches;
  }

  generateLocalDemoMatches() {
    this.debugLog('requests', 'Generating demo matches for local development...');
    
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    const demoMatches = [
      {
        id: `local_demo_${Date.now()}_1`,
        time: "15:00",
        teamA: "Manchester City",
        teamB: "Arsenal", 
        competition: "Premier League",
        channel: "Sky Sports Premier League, Sky Sports Main Event",
        channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'local-demo',
        venue: 'Etihad Stadium'
      },
      {
        id: `local_demo_${Date.now()}_2`,
        time: "17:30",
        teamA: "Liverpool",
        teamB: "Chelsea",
        competition: "Premier League", 
        channel: "BBC One, BBC iPlayer",
        channels: ["BBC One", "BBC iPlayer"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'local-demo',
        venue: 'Anfield'
      },
      {
        id: `local_demo_${Date.now()}_3`,
        time: "20:00",
        teamA: "Real Madrid",
        teamB: "Barcelona",
        competition: "La Liga",
        channel: "Premier Sports 1",
        channels: ["Premier Sports 1"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'local-demo',
        venue: 'Santiago Bernabéu'
      }
    ];

    this.debugLog('requests', `Generated ${demoMatches.length} demo matches for local development`);
    return demoMatches;
  }

  async updateMatchData() {
    try {
      this.debugLog('data', 'Starting automatic match data update...');
      
      const dataManager = new WebDataManager();
      const existingData = dataManager.loadData();
      
      const newMatches = await this.fetchTodaysMatches();
      
      if (newMatches.length === 0) {
        this.debugLog('data', 'No matches found from data source');
        return { success: true, added: 0, total: existingData.footballMatches.length };
      }
      
      // Check if matches are from demo data
      const isDemoData = newMatches.length > 0 && newMatches[0].apiSource && 
                        (newMatches[0].apiSource.includes('demo') || newMatches[0].apiSource.includes('local'));
      
      if (isDemoData) {
        this.debugLog('data', 'Received demo data - not adding to existing matches to avoid duplicates');
        return { 
          success: true, 
          added: 0, 
          total: existingData.footballMatches.length,
          matches: newMatches,
          source: 'demo-data',
          note: 'Demo data not persisted to avoid duplicates'
        };
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
      existingData.lastFetch = new Date().toISOString();
      
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        this.debugLog('data', `Successfully added ${uniqueNewMatches.length} new matches from live source`);
        
        uniqueNewMatches.forEach(match => {
          this.debugLog('data', `Added: ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition})`);
        });
      }
      
      return { 
        success: saved, 
        added: uniqueNewMatches.length, 
        total: existingData.footballMatches.length,
        matches: uniqueNewMatches,
        source: newMatches.length > 0 && newMatches[0].apiSource ? newMatches[0].apiSource : 'live-footballontv.com'
      };
      
    } catch (error) {
      this.debugLog('data', `Error updating match data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      if (this.isLocal) {
        this.debugLog('requests', 'Testing local development data fetching...');
        
        // Try CORS proxy first
        try {
          const response = await fetch(`${this.corsProxyUrl}${encodeURIComponent(this.directUrl)}`, {
            method: 'GET'
          });
          const success = response.ok;
          this.debugLog('requests', `CORS proxy connection ${success ? 'successful' : 'failed'} - status: ${response.status}`);
          return success;
        } catch (error) {
          this.debugLog('requests', `CORS proxy test failed: ${error.message}`);
          return false;
        }
      } else {
        this.debugLog('requests', 'Testing Netlify function connection...');
        
        // First test if the function endpoint exists
        try {
          const testResponse = await fetch(this.netlifyFunctionUrl, { 
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          this.debugLog('requests', `Function endpoint test - Status: ${testResponse.status}`, {
            url: this.netlifyFunctionUrl,
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers)
          });
          
          if (!testResponse.ok) {
            if (testResponse.status === 404) {
              this.debugLog('requests', 'ERROR: Netlify function not found (404) - check deployment');
              return false;
            } else if (testResponse.status >= 500) {
              this.debugLog('requests', 'ERROR: Netlify function server error - check function logs');
              return false;
            }
          }
          
          const data = await testResponse.json();
          this.debugLog('requests', 'Function response received', {
            success: data.success,
            matchCount: data.matches ? data.matches.length : 0,
            source: data.source || 'unknown',
            note: data.note || ''
          });
          
          if (data.source === 'demo-data') {
            this.debugLog('requests', 'Function returned demo data - this may indicate issues with live data fetching');
          }
          
          return testResponse.ok;
          
        } catch (error) {
          this.debugLog('requests', `Function test failed: ${error.message}`, {
            url: this.netlifyFunctionUrl,
            error: error.name,
            message: error.message
          });
          return false;
        }
      }
      
    } catch (error) {
      this.debugLog('requests', `Connection test failed: ${error.message}`);
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

  // HTML parsing methods for local development
  parseMatches(htmlContent) {
    console.log('Starting to parse HTML content for matches...');
    const matches = [];
    
    try {
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Look for today's date section in HTML
      const todayPatterns = [
        `Sunday ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
        `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`
      ];
      
      console.log('Looking for today\'s date patterns:', todayPatterns);
      
      // Find today's date section
      let todaySection = null;
      let nextDayIndex = -1;
      
      for (const pattern of todayPatterns) {
        const patternIndex = htmlContent.indexOf(pattern);
        if (patternIndex !== -1) {
          console.log(`Found today's date section: ${pattern}`);
          todaySection = pattern;
          
          const fixtureStartIndex = htmlContent.indexOf('<div class="fixture">', patternIndex);
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
        console.log('Could not find today\'s date section, parsing all fixtures for today');
        const allFixtures = this.parseAllFixturesFromHTML(htmlContent);
        const todayMatches = allFixtures.filter(match => {
          match.matchDate = todayFormatted;
          return true;
        });
        matches.push(...todayMatches);
      }
      
      console.log(`Parsing completed: ${matches.length} matches extracted`);
      
    } catch (error) {
      console.log(`Error parsing matches: ${error.message}`);
    }
    
    return matches;
  }

  parseFixturesFromHTML(htmlSection, matchDate) {
    const matches = [];
    
    try {
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
      console.log(`Error parsing fixtures section: ${error.message}`);
    }
    
    return matches;
  }

  parseAllFixturesFromHTML(htmlContent) {
    const matches = [];
    
    try {
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
      console.log(`Error parsing all fixtures: ${error.message}`);
    }
    
    return matches;
  }

  parseIndividualFixture(fixtureHTML, matchDate) {
    try {
      // Extract time
      const timeMatch = fixtureHTML.match(/<div class="fixture__time">([^<]+)<\/div>/);
      if (!timeMatch) return null;
      
      const time = timeMatch[1].trim();
      if (time === 'TBC') return null;
      
      // Extract teams
      const teamsMatch = fixtureHTML.match(/<div class="fixture__teams">([^<]+)<\/div>/);
      if (!teamsMatch) return null;
      
      const teamsText = teamsMatch[1].trim();
      const teams = this.parseTeamsFromText(teamsText);
      if (!teams) return null;
      
      // Extract competition
      const competitionMatch = fixtureHTML.match(/<div class="fixture__competition">([^<]+)<\/div>/);
      const competition = competitionMatch ? this.cleanHTML(competitionMatch[1].trim()) : 'Football';
      
      // Extract channels
      const channels = this.parseChannelsFromHTML(fixtureHTML);
      
      const matchObj = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      
      console.log(`Parsed match: ${teams.teamA} vs ${teams.teamB} at ${time}`);
      
      return matchObj;
      
    } catch (error) {
      console.log(`Error parsing individual fixture: ${error.message}`);
      return null;
    }
  }

  parseTeamsFromText(teamsText) {
    try {
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
          
          if (teamA.length >= 2 && teamB.length >= 2 && teamA !== teamB) {
            return { teamA, teamB };
          }
        }
      }
    } catch (error) {
      console.log(`Error parsing teams from "${teamsText}": ${error.message}`);
    }
    
    return null;
  }

  parseChannelsFromHTML(fixtureHTML) {
    const channels = [];
    
    // UK TV Channel mappings
    const channelMappings = {
      'BBC One': 'BBC One',
      'BBC Two': 'BBC Two', 
      'BBC Three': 'BBC Three',
      'BBC Four': 'BBC Four',
      'BBC iPlayer': 'BBC iPlayer',
      'ITV1': 'ITV1',
      'ITV2': 'ITV2', 
      'ITV4': 'ITV4',
      'ITVX': 'ITVX',
      'Channel 4': 'Channel 4',
      'Sky Sports Premier League': 'Sky Sports Premier League',
      'Sky Sports Football': 'Sky Sports Football',
      'Sky Sports Main Event': 'Sky Sports Main Event',
      'TNT Sports': 'TNT Sports',
      'TNT Sports 1': 'TNT Sports 1',
      'TNT Sports 2': 'TNT Sports 2',
      'TNT Sports 3': 'TNT Sports 3',
      'Premier Sports 1': 'Premier Sports 1',
      'Premier Sports 2': 'Premier Sports 2',
      'Amazon Prime Video': 'Amazon Prime Video',
      'Discovery+': 'Discovery+'
    };
    
    try {
      const channelRegex = /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g;
      let match;
      
      while ((match = channelRegex.exec(fixtureHTML)) !== null) {
        const channelText = this.cleanHTML(match[1].trim());
        const mappedChannel = channelMappings[channelText] || channelText;
        
        if (mappedChannel && mappedChannel !== 'Check TV Guide' && !channels.includes(mappedChannel)) {
          channels.push(mappedChannel);
        }
      }
      
    } catch (error) {
      console.log(`Error parsing channels: ${error.message}`);
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
}

// Make it available globally for web environment
window.WebMatchFetcher = WebMatchFetcher;
