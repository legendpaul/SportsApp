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
      'ITV1': 'ITV1',
      'ITV2': 'ITV2', 
      'ITV3': 'ITV3',
      'ITV4': 'ITV4',
      'ITVX': 'ITVX',
      'ITV TBC': 'ITV',
      'Channel 4': 'Channel 4',
      'Channel 4 Online': 'Channel 4 Online',
      'Sky Sports Premier League': 'Sky Sports Premier League',
      'Sky Sports Football': 'Sky Sports Football',
      'Sky Sports': 'Sky Sports',
      'Sky Sports Main Event': 'Sky Sports Main Event',
      'TNT Sports': 'TNT Sports',
      'TNT Sports 1': 'TNT Sports 1',
      'TNT Sports 2': 'TNT Sports 2',
      'BT Sport': 'BT Sport',
      'Premier Sports': 'Premier Sports',
      'Premier Sports 1': 'Premier Sports 1',
      'Premier Sports 2': 'Premier Sports 2',
      'S4C': 'S4C',
      'S4C Online': 'S4C Online',
      'STV': 'STV',
      'STV Player': 'STV Player',
      'Amazon Prime Video': 'Amazon Prime Video',
      'Discovery+': 'Discovery+',
      'DAZN': 'DAZN',
      'ESPN': 'ESPN',
      'ESPN+': 'ESPN+',
      'Eurosport': 'Eurosport'
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

  parseMatches(htmlContent) {
    this.debugLog('data', 'Starting to parse HTML content for matches...');
    const matches = [];
    
    try {
      // First, let's try a more flexible approach
      // Look for patterns in the HTML that indicate football matches
      
      // Method 1: Look for time patterns followed by team names
      const timePattern = /(\d{1,2}:\d{2})/g;
      const lines = htmlContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      this.debugLog('data', `Processing ${lines.length} lines of HTML content`);
      
      let currentDate = null;
      let parsedCount = 0;
      
      // Look for today's date patterns
      const today = new Date();
      const todayPatterns = [
        today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
        `${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'long' })} ${today.getFullYear()}`,
        `${today.getDate()}${this.getOrdinalSuffix(today.getDate())} ${today.toLocaleDateString('en-GB', { month: 'short' })} ${today.getFullYear()}`
      ];
      
      this.debugLog('data', 'Looking for today\'s date patterns', { patterns: todayPatterns });
      
      // Try to find today's section
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line contains today's date
        if (todayPatterns.some(pattern => line.includes(pattern))) {
          currentDate = today.toISOString().split('T')[0];
          this.debugLog('data', `Found today's date section: ${line} -> ${currentDate}`);
          
          // Look for matches after this date
          for (let j = i + 1; j < lines.length && j < i + 100; j++) {
            const matchLine = lines[j];
            
            // Stop if we hit another date
            if (this.isDateLine(matchLine) && !todayPatterns.some(p => matchLine.includes(p))) {
              this.debugLog('data', `Hit next date, stopping: ${matchLine}`);
              break;
            }
            
            // Look for time pattern
            const timeMatch = matchLine.match(/^(\d{1,2}:\d{2})/);
            if (timeMatch) {
              const time = timeMatch[1];
              
              // Look for teams in next few lines
              for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
                const teamsLine = lines[k];
                const teams = this.parseTeams(teamsLine);
                
                if (teams) {
                  // Look for competition and channels
                  let competition = 'Football';
                  let channels = ['Check TV Guide'];
                  
                  for (let l = k + 1; l < Math.min(k + 10, lines.length); l++) {
                    const infoLine = lines[l];
                    
                    if (this.isTimeLine(infoLine) || this.isDateLine(infoLine)) break;
                    
                    if (this.isCompetitionLine(infoLine)) {
                      competition = infoLine;
                    }
                    
                    if (this.isChannelLine(infoLine)) {
                      channels = this.parseChannels(infoLine);
                    }
                  }
                  
                  const match = {
                    id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    time: time,
                    teamA: teams.teamA,
                    teamB: teams.teamB,
                    competition: competition,
                    channel: channels.length > 0 ? channels.join(', ') : 'Check TV Guide',
                    channels: channels,
                    status: 'upcoming',
                    createdAt: new Date().toISOString(),
                    matchDate: currentDate,
                    apiSource: 'live-footballontv.com',
                    venue: ''
                  };
                  
                  matches.push(match);
                  parsedCount++;
                  
                  this.debugLog('data', `Parsed match ${parsedCount}: ${teams.teamA} vs ${teams.teamB} at ${time}`, {
                    competition,
                    channels
                  });
                  
                  j = k; // Continue from teams line
                  break;
                }
              }
            }
          }
          break; // Found today's section, no need to continue
        }
      }
      
      // If no matches found with strict date matching, try broader search
      if (matches.length === 0) {
        this.debugLog('data', 'No matches found with date matching, trying broader search...');
        
        // Look for any time patterns and team patterns
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const timeMatch = line.match(/^(\d{1,2}:\d{2})/);
          
          if (timeMatch) {
            const time = timeMatch[1];
            
            // Look for teams in next few lines
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const teamsLine = lines[j];
              const teams = this.parseTeams(teamsLine);
              
              if (teams) {
                // Use today as default date
                const match = {
                  id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  time: time,
                  teamA: teams.teamA,
                  teamB: teams.teamB,
                  competition: 'Football',
                  channel: 'Check TV Guide',
                  channels: ['Check TV Guide'],
                  status: 'upcoming',
                  createdAt: new Date().toISOString(),
                  matchDate: today.toISOString().split('T')[0],
                  apiSource: 'live-footballontv.com',
                  venue: ''
                };
                
                matches.push(match);
                parsedCount++;
                
                this.debugLog('data', `Broad search - Parsed match ${parsedCount}: ${teams.teamA} vs ${teams.teamB} at ${time}`);
                
                i = j; // Skip ahead
                break;
              }
            }
          }
        }
      }
      
      this.debugLog('data', `Parsing completed: ${matches.length} matches extracted`);
      
      // Save sample of lines for debugging
      this.saveDebugLines(lines.slice(0, 50));
      
    } catch (error) {
      this.debugLog('data', `Error parsing matches: ${error.message}`);
    }
    
    return matches;
  }

  getOrdinalSuffix(day) {
    const j = day % 10;
    const k = day % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
  }

  saveDebugLines(lines) {
    try {
      const debugDir = path.join(__dirname, 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const debugFile = path.join(debugDir, 'parsed_lines.txt');
      fs.writeFileSync(debugFile, lines.join('\n'));
      this.debugLog('data', `Saved first 50 parsed lines to debug/parsed_lines.txt`);
    } catch (error) {
      this.debugLog('data', `Could not save debug lines: ${error.message}`);
    }
  }

  isDateLine(line) {
    // More flexible date matching
    const datePatterns = [
      /\w+(day)\s+\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
      /\d{1,2}(st|nd|rd|th)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i,
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{4}-\d{2}-\d{2}/
    ];
    
    return datePatterns.some(pattern => pattern.test(line));
  }

  parseDate(dateLine) {
    try {
      const today = new Date();
      // For now, just return today's date - we can improve this later
      return today.toISOString().split('T')[0];
    } catch (error) {
      this.debugLog('data', `Error parsing date: ${error.message}`);
      return new Date().toISOString().split('T')[0];
    }
  }

  isTimeLine(line) {
    return /^\d{1,2}:\d{2}/.test(line);
  }

  parseTeams(matchLine) {
    try {
      // More flexible team parsing
      const patterns = [
        /^(.+?)\s+v\s+(.+)$/,
        /^(.+?)\s+vs\s+(.+)$/,
        /^(.+?)\s+V\s+(.+)$/,
        /(.+?)\s+-\s+(.+)/
      ];
      
      for (const pattern of patterns) {
        const match = matchLine.match(pattern);
        if (match && match[1] && match[2]) {
          const teamA = match[1].trim();
          const teamB = match[2].trim();
          
          // Basic validation - teams should be at least 3 characters
          if (teamA.length >= 3 && teamB.length >= 3) {
            return { teamA, teamB };
          }
        }
      }
    } catch (error) {
      this.debugLog('data', `Error parsing teams from "${matchLine}": ${error.message}`);
    }
    
    return null;
  }

  isCompetitionLine(line) {
    const competitionKeywords = [
      'Premier League', 'Championship', 'League One', 'League Two',
      'Champions League', 'Europa League', 'Conference League',
      'FA Cup', 'League Cup', 'Community Shield',
      'World Cup', 'European Championship', 'Nations League',
      'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
      'International Friendly', 'FIFA', 'UEFA', 'CONCACAF',
      'Women\'s', 'U21', 'U19', 'U23', 'Play-Off', 'Final', 'Semi-Final',
      'Group Stage', 'Qualifier', 'Cup', 'League'
    ];
    
    if (this.isChannelLine(line)) {
      return false;
    }
    
    return competitionKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  isChannelLine(line) {
    const channelNames = Object.keys(this.channelMappings);
    return channelNames.some(channel => line.includes(channel));
  }

  parseChannels(channelLine) {
    const channels = [];
    const channelNames = Object.keys(this.channelMappings);
    
    for (const channel of channelNames) {
      if (channelLine.includes(channel)) {
        channels.push(this.channelMappings[channel]);
      }
    }
    
    if (channels.length === 0) {
      const cleanedLine = channelLine.replace(/[^\w\s+]/g, ' ').trim();
      if (cleanedLine && cleanedLine.length > 0) {
        channels.push(cleanedLine);
      }
    }
    
    return [...new Set(channels)];
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
