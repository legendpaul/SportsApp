// Web-compatible Match Fetcher - Uses Netlify Functions for real data
// Version: 2.1.0 - Fixed Netlify environment detection
class WebMatchFetcher {
  constructor(debugLogCallback = null) {
    this.version = '2.1.0';
    // Use working scraping function instead of API function
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-football';
    this.apiFunctionUrl = '/.netlify/functions/fetch-football-api'; // Backup if APIs are configured
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
      this.debugLog('requests', `CRITICAL ERROR in fetchTodaysMatches: ${error.message}`, {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        isLocal: this.isLocal,
        functionUrl: this.netlifyFunctionUrl
      });
      
      // Try fallback methods if primary fails
      if (this.isLocal) {
      this.debugLog('requests', 'CORS proxy failed, trying direct fetch...');
      try {
      return await this.fetchDirect();
      } catch (fallbackError) {
      this.debugLog('requests', 'All data fetching methods failed');
      throw new Error('Unable to fetch live football data - all methods failed');
      }
      } else {
      // In production, if Netlify function fails completely, throw error
      this.debugLog('requests', 'Netlify function failed completely');
      throw new Error('Netlify function failed to fetch live data');
      }
    }
  }

  async fetchWithNetlifyFunction() {
    this.debugLog('requests', `Attempting to call primary Netlify function: ${this.netlifyFunctionUrl}`);
    
    try {
      // Try the primary scraping function first
      const response = await this.callNetlifyFunction(this.netlifyFunctionUrl);
      
      if (response.success && response.matches && response.matches.length > 0) {
        this.debugLog('requests', `Primary function successful: ${response.matches.length} matches`);
        return response.matches;
      } else if (response.success && response.matches && response.matches.length === 0) {
        this.debugLog('requests', 'Primary function successful but no matches found for today');
        return response.matches; // Return empty array if no matches today
      } else {
        this.debugLog('requests', `Primary function failed or returned no data: ${response.error || 'Unknown error'}`);
        throw new Error(response.error || 'Primary function returned no data');
      }
      
    } catch (primaryError) {
      this.debugLog('requests', `Primary function failed: ${primaryError.message}`);
      this.debugLog('requests', `Trying backup API function: ${this.apiFunctionUrl}`);
      
      // Try the API function as backup
      try {
        const apiResponse = await this.callNetlifyFunction(this.apiFunctionUrl);
        
        if (apiResponse.success && apiResponse.matches && apiResponse.matches.length > 0) {
          this.debugLog('requests', `Backup API function successful: ${apiResponse.matches.length} matches`);
          return apiResponse.matches;
        } else {
          this.debugLog('requests', `Backup API function also failed: ${apiResponse.error || 'No data'}`);
          throw new Error(`Both functions failed. Primary: ${primaryError.message}, API: ${apiResponse.error || 'No data'}`);
        }
        
      } catch (apiError) {
        this.debugLog('requests', `Backup API function failed: ${apiError.message}`);
        
        // Both functions failed, throw the original error
        throw new Error(`All Netlify functions failed. Scraper: ${primaryError.message}, API: ${apiError.message}`);
      }
    }
  }
  
  async callNetlifyFunction(functionUrl) {
    this.debugLog('requests', `Calling function: ${functionUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      this.debugLog('requests', `Function response received`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = `Could not read error response: ${textError.message}`;
        }
        
        this.debugLog('requests', `Function HTTP error`, {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText.substring(0, 500)
        });
        
        throw new Error(`Function failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      this.debugLog('requests', `Function response parsed`, {
        hasSuccess: 'success' in data,
        success: data.success,
        hasMatches: 'matches' in data,
        matchCount: data.matches ? data.matches.length : 0,
        source: data.source || 'unknown',
        note: data.note || 'No note'
      });
      
      return data;
      
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        this.debugLog('requests', 'Function request timed out after 30 seconds');
        throw new Error('Function request timed out');
      }
      
      this.debugLog('requests', `Function call failed: ${fetchError.message}`);
      throw fetchError;
    }
  }

  async fetchWithCorsProxy() {
    this.debugLog('requests', 'Attempting CORS proxy fetch...');
    
    // Try multiple CORS proxy services for better reliability
    const proxyServices = [
      'https://api.allorigins.win/get?url=',
      'https://corsproxy.io/?',
      'https://cors-anywhere.herokuapp.com/',
      'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    let lastError;
    
    for (const proxyUrl of proxyServices) {
      try {
        this.debugLog('requests', `Trying CORS proxy: ${proxyUrl}`);
        
        const fullUrl = `${proxyUrl}${encodeURIComponent(this.directUrl)}`;
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let htmlContent;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          htmlContent = data.contents || data.body || data.data;
        } else {
          htmlContent = await response.text();
        }
        
        if (!htmlContent || htmlContent.length < 1000) {
          throw new Error(`Insufficient content: ${htmlContent ? htmlContent.length : 0} characters`);
        }

        this.debugLog('requests', `CORS proxy successful - received ${htmlContent.length} characters`);
        
        const matches = this.parseMatches(htmlContent);
        const today = new Date().toISOString().split('T')[0];
        const todayMatches = matches.filter(match => match.matchDate === today);
        
        this.debugLog('requests', `Parsed ${matches.length} total matches, ${todayMatches.length} for today`);
        
        return todayMatches;
        
      } catch (error) {
        lastError = error;
        this.debugLog('requests', `CORS proxy ${proxyUrl} failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error(`All CORS proxies failed. Last error: ${lastError.message}`);
  }

  async fetchDirect() {
    this.debugLog('requests', 'Attempting direct fetch (will likely fail due to CORS)...');
    
    try {
      const response = await fetch(this.directUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      if (!html || html.length < 1000) {
        throw new Error(`Insufficient content from direct fetch: ${html ? html.length : 0} characters`);
      }
      
      this.debugLog('requests', `Direct fetch successful - received ${html.length} characters`);
      
      const matches = this.parseMatches(html);
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = matches.filter(match => match.matchDate === today);
      
      this.debugLog('requests', `Direct fetch parsed ${matches.length} total matches, ${todayMatches.length} for today`);
      
      return todayMatches;
      
    } catch (error) {
      this.debugLog('requests', `Direct fetch failed: ${error.message}`);
      throw error;
    }
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

  // Improved HTML parsing methods for local development
  parseMatches(htmlContent) {
    console.log('Starting to parse HTML content for matches...');
    console.log(`HTML content length: ${htmlContent.length} characters`);
    
    // Log a preview of the HTML to understand its structure
    const htmlPreview = htmlContent.substring(0, 2000);
    console.log('HTML preview:', htmlPreview);
    
    const matches = [];
    
    try {
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Comprehensive date patterns for better matching
      const todayPatterns = [
        `${today.toLocaleDateString('en-GB', { weekday: 'long' })} ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
        `${today.toLocaleDateString('en-US', { weekday: 'long' })} ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-US', { month: 'long' })} ${today.getFullYear()}`,
        `Sunday ${today.getDate()}${this.getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
        `${today.getDate()}${this.getOrdinalSuffix(today.getDate())} June ${today.getFullYear()}`,
        `June ${today.getDate()}${this.getOrdinalSuffix(today.getDate())}, ${today.getFullYear()}`,
        `${today.getDate()}-06-${today.getFullYear()}`, // Alternative date format
        `${today.getFullYear()}-06-${today.getDate().toString().padStart(2, '0')}`, // ISO format
        // Generic patterns
        'fixture',
        'match',
        'today'
      ];
      
      console.log('Looking for today\'s date patterns:', todayPatterns);
      
      // Also look for any date-like patterns in the HTML
      const dateRegex = /\b(\d{1,2})(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/g;
      let dateMatch;
      while ((dateMatch = dateRegex.exec(htmlContent)) !== null) {
        console.log(`Found date pattern in HTML: ${dateMatch[0]}`);
      }
      
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
        console.log('Could not find today\'s date section, parsing all fixtures and looking for matches');
        
        // Look for fixture indicators in the HTML
        const fixtureIndicators = [
          'class="fixture"',
          'class="match"',
          'vs ',
          ' v ',
          'kick-off',
          'premier league',
          'champions league',
          'football'
        ];
        
        let hasFootballContent = false;
        for (const indicator of fixtureIndicators) {
          if (htmlContent.toLowerCase().includes(indicator.toLowerCase())) {
            console.log(`Found football indicator: ${indicator}`);
            hasFootballContent = true;
          }
        }
        
        if (!hasFootballContent) {
          console.log('No football content indicators found in HTML');
          return [];
        }
        
        const allFixtures = this.parseAllFixturesFromHTML(htmlContent);
        console.log(`parseAllFixturesFromHTML returned ${allFixtures.length} matches`);
        
        const todayMatches = allFixtures.map(match => ({
          ...match,
          matchDate: todayFormatted
        }));
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
      console.log(`Parsing fixture HTML: ${fixtureHTML.substring(0, 300)}...`);
      
      // Try multiple patterns for time extraction
      const timePatterns = [
        /<div class="fixture__time"[^>]*>([^<]+)<\/div>/,
        /<span class="time"[^>]*>([^<]+)<\/span>/,
        /<div[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/div>/,
        /\b(\d{1,2}:\d{2})\b/,
        /\b(\d{1,2}\.\d{2})\b/
      ];
      
      let time = null;
      for (const pattern of timePatterns) {
        const timeMatch = fixtureHTML.match(pattern);
        if (timeMatch && timeMatch[1]) {
          time = timeMatch[1].trim();
          console.log(`Found time: ${time}`);
          break;
        }
      }
      
      if (!time || time === 'TBC' || time === 'FT' || time === 'HT') {
        console.log(`Invalid or missing time: ${time}`);
        return null;
      }
      
      // Try multiple patterns for teams extraction
      const teamPatterns = [
        /<div class="fixture__teams"[^>]*>([^<]+)<\/div>/,
        /<span class="teams"[^>]*>([^<]+)<\/span>/,
        /<div[^>]*class="[^"]*teams[^"]*"[^>]*>([^<]+)<\/div>/,
        /<h[2-6][^>]*>([^<]*\s+(?:v|vs|V)\s+[^<]*)<\/h[2-6]>/,
        /([A-Za-z\s&'\-\.]+)\s+(?:v|vs|V)\s+([A-Za-z\s&'\-\.]+)/
      ];
      
      let teams = null;
      for (const pattern of teamPatterns) {
        const teamsMatch = fixtureHTML.match(pattern);
        if (teamsMatch && teamsMatch[1]) {
          const teamsText = teamsMatch[1].trim();
          console.log(`Found teams text: ${teamsText}`);
          teams = this.parseTeamsFromText(teamsText);
          if (teams) {
            console.log(`Successfully parsed teams: ${teams.teamA} vs ${teams.teamB}`);
            break;
          }
        }
      }
      
      if (!teams) {
        console.log('No valid teams found');
        return null;
      }
      
      // Try multiple patterns for competition
      const competitionPatterns = [
        /<div class="fixture__competition"[^>]*>([^<]+)<\/div>/,
        /<span class="competition"[^>]*>([^<]+)<\/span>/,
        /<div[^>]*class="[^"]*competition[^"]*"[^>]*>([^<]+)<\/div>/
      ];
      
      let competition = 'Football';
      for (const pattern of competitionPatterns) {
        const competitionMatch = fixtureHTML.match(pattern);
        if (competitionMatch && competitionMatch[1]) {
          competition = this.cleanHTML(competitionMatch[1].trim());
          console.log(`Found competition: ${competition}`);
          break;
        }
      }
      
      // Extract channels
      const channels = this.parseChannelsFromHTML(fixtureHTML);
      console.log(`Found channels: ${channels.join(', ')}`);
      
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
      const cleanText = teamsText
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`Attempting to parse teams from: "${cleanText}"`);
      
      const patterns = [
        /^(.+?)\s+v\s+(.+)$/i,
        /^(.+?)\s+vs\s+(.+)$/i,
        /^(.+?)\s+V\s+(.+)$/,
        /(.+?)\s+-\s+(.+)/,
        /(.+?)\s+@\s+(.+)/, // Sometimes uses @ instead of vs
        /^(.+?)\s+versus\s+(.+)$/i
      ];
      
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match && match[1] && match[2]) {
          let teamA = match[1].trim();
          let teamB = match[2].trim();
          
          // Clean up team names
          teamA = teamA.replace(/^\W+|\W+$/g, ''); // Remove leading/trailing non-word chars
          teamB = teamB.replace(/^\W+|\W+$/g, '');
          
          if (teamA.length >= 2 && teamB.length >= 2 && teamA !== teamB) {
            console.log(`Successfully parsed teams: "${teamA}" vs "${teamB}"`);
            return { teamA, teamB };
          }
        }
      }
      
      console.log(`Could not parse teams from: "${cleanText}"`);
    } catch (error) {
      console.log(`Error parsing teams from "${teamsText}": ${error.message}`);
    }
    
    return null;
  }

  parseChannelsFromHTML(fixtureHTML) {
    const channels = [];
    
    // Comprehensive UK TV Channel mappings
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
      'Channel 5': 'Channel 5',
      'Sky Sports Premier League': 'Sky Sports Premier League',
      'Sky Sports Football': 'Sky Sports Football',
      'Sky Sports Main Event': 'Sky Sports Main Event',
      'Sky Sports Action': 'Sky Sports Action',
      'TNT Sports': 'TNT Sports',
      'TNT Sports 1': 'TNT Sports 1',
      'TNT Sports 2': 'TNT Sports 2',
      'TNT Sports 3': 'TNT Sports 3',
      'Premier Sports 1': 'Premier Sports 1',
      'Premier Sports 2': 'Premier Sports 2',
      'Amazon Prime Video': 'Amazon Prime Video',
      'Discovery+': 'Discovery+',
      'Eurosport 1': 'Eurosport 1',
      'Eurosport 2': 'Eurosport 2'
    };
    
    try {
      // Multiple patterns to catch different channel formats
      const channelPatterns = [
        /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g,
        /<div[^>]*class="[^"]*channel[^"]*"[^>]*>([^<]+)<\/div>/g,
        /<span[^>]*class="[^"]*channel[^"]*"[^>]*>([^<]+)<\/span>/g,
        /<li[^>]*class="[^"]*channel[^"]*"[^>]*>([^<]+)<\/li>/g
      ];
      
      for (const pattern of channelPatterns) {
        pattern.lastIndex = 0; // Reset regex
        let match;
        
        while ((match = pattern.exec(fixtureHTML)) !== null) {
          const channelText = this.cleanHTML(match[1].trim());
          const mappedChannel = channelMappings[channelText] || channelText;
          
          if (mappedChannel && 
              mappedChannel !== 'Check TV Guide' && 
              !channels.includes(mappedChannel) &&
              mappedChannel.length > 1) {
            channels.push(mappedChannel);
            console.log(`Found channel: ${mappedChannel}`);
          }
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
