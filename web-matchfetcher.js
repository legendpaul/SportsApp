// Web-compatible Match Fetcher - Uses fetch API instead of Node.js https
class WebMatchFetcher {
  constructor(debugLogCallback = null) {
    this.baseUrl = 'https://www.live-footballontv.com';
    this.corsProxyUrl = 'https://api.allorigins.win/get?url='; // CORS proxy service
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
      
      // Try direct fetch first (will likely fail due to CORS)
      let htmlContent = await this.tryDirectFetch();
      
      if (!htmlContent) {
        // Try CORS proxy
        htmlContent = await this.tryProxyFetch();
      }
      
      if (!htmlContent) {
        this.debugLog('requests', 'Unable to fetch from website due to CORS restrictions, using demo data');
        return this.generateDemoMatches();
      }

      this.debugLog('requests', `Received HTML content: ${htmlContent.length} characters`);
      
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
      this.debugLog('requests', 'Falling back to demo data for web version');
      return this.generateDemoMatches();
    }
  }

  async tryDirectFetch() {
    try {
      this.debugLog('requests', 'Attempting direct fetch...');
      
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.5'
        },
        mode: 'cors' // This will likely fail due to CORS
      });

      if (response.ok) {
        const text = await response.text();
        this.debugLog('requests', 'Direct fetch successful');
        return text;
      } else {
        this.debugLog('requests', `Direct fetch failed with status: ${response.status}`);
        return null;
      }
    } catch (error) {
      this.debugLog('requests', `Direct fetch failed: ${error.message}`);
      return null;
    }
  }

  async tryProxyFetch() {
    try {
      this.debugLog('requests', 'Attempting CORS proxy fetch...');
      
      const proxyUrl = `${this.corsProxyUrl}${encodeURIComponent(this.baseUrl)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.contents) {
          this.debugLog('requests', 'CORS proxy fetch successful');
          return data.contents;
        }
      }
      
      this.debugLog('requests', `CORS proxy fetch failed with status: ${response.status}`);
      return null;
      
    } catch (error) {
      this.debugLog('requests', `CORS proxy fetch failed: ${error.message}`);
      return null;
    }
  }

  generateDemoMatches() {
    this.debugLog('data', 'Generating demo matches for web version...');
    
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    // Generate realistic demo matches with times spread throughout the day
    const demoMatches = [
      {
        id: `web_demo_${Date.now()}_1`,
        time: "13:30",
        teamA: "Manchester City",
        teamB: "Arsenal", 
        competition: "Premier League",
        channel: "Sky Sports Premier League, Sky Sports Main Event",
        channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'Etihad Stadium'
      },
      {
        id: `web_demo_${Date.now()}_2`,
        time: "15:00",
        teamA: "Liverpool",
        teamB: "Chelsea",
        competition: "Premier League", 
        channel: "BBC One, BBC iPlayer",
        channels: ["BBC One", "BBC iPlayer"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'Anfield'
      },
      {
        id: `web_demo_${Date.now()}_3`,
        time: "17:30",
        teamA: "Real Madrid",
        teamB: "Barcelona",
        competition: "La Liga",
        channel: "Premier Sports 1",
        channels: ["Premier Sports 1"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'Santiago Bernabéu'
      },
      {
        id: `web_demo_${Date.now()}_4`,
        time: "20:00",
        teamA: "Bayern Munich",
        teamB: "Borussia Dortmund",
        competition: "Bundesliga",
        channel: "TNT Sports 2",
        channels: ["TNT Sports 2"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'Allianz Arena'
      },
      {
        id: `web_demo_${Date.now()}_5`,
        time: "19:45",
        teamA: "Paris Saint-Germain",
        teamB: "Olympique Marseille",
        competition: "Ligue 1",
        channel: "Discovery+",
        channels: ["Discovery+"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'Parc des Princes'
      }
    ];

    // If it's past 18:00, add some evening matches
    if (currentHour >= 18) {
      demoMatches.push({
        id: `web_demo_${Date.now()}_6`,
        time: "22:00",
        teamA: "AC Milan",
        teamB: "Inter Milan",
        competition: "Serie A",
        channel: "TNT Sports 3",
        channels: ["TNT Sports 3"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: today,
        apiSource: 'web-demo',
        venue: 'San Siro'
      });
    }

    this.debugLog('data', `Generated ${demoMatches.length} demo matches for today`);
    return demoMatches;
  }

  parseMatches(htmlContent) {
    this.debugLog('data', 'Starting to parse HTML content for matches...');
    const matches = [];
    
    try {
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
        this.debugLog('data', 'Could not find today\'s date section, parsing all fixtures for today');
        const allFixtures = this.parseAllFixturesFromHTML(htmlContent);
        const todayMatches = allFixtures.filter(match => {
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
      this.debugLog('data', `Error parsing teams from "${teamsText}": ${error.message}`);
    }
    
    return null;
  }

  parseChannelsFromHTML(fixtureHTML) {
    const channels = [];
    
    try {
      const channelRegex = /<span class="channel-pill"[^>]*>([^<]+)<\/span>/g;
      let match;
      
      while ((match = channelRegex.exec(fixtureHTML)) !== null) {
        const channelText = this.cleanHTML(match[1].trim());
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

  async updateMatchData() {
    try {
      this.debugLog('data', 'Starting automatic match data update...');
      
      const dataManager = new WebDataManager();
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
      existingData.lastFetch = new Date().toISOString();
      
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
      
      // Try direct fetch first
      let success = false;
      
      try {
        const response = await fetch(this.baseUrl, { 
          method: 'HEAD',
          mode: 'no-cors' // This won't give us the content but will test if the site is reachable
        });
        success = true; // If we get here without error, the site is reachable
      } catch (error) {
        // Try proxy
        try {
          const proxyUrl = `${this.corsProxyUrl}${encodeURIComponent(this.baseUrl)}`;
          const response = await fetch(proxyUrl);
          success = response.ok;
        } catch (proxyError) {
          success = false;
        }
      }
      
      this.debugLog('requests', `Website connection ${success ? 'successful' : 'failed/blocked by CORS'}`);
      
      if (!success) {
        this.debugLog('requests', 'Note: Web version will use demo data due to CORS restrictions');
      }
      
      return success;
      
    } catch (error) {
      this.debugLog('requests', `Website connection test failed: ${error.message}`);
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

// Make it available globally for web environment
window.WebMatchFetcher = WebMatchFetcher;
