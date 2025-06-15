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
      'Eurosport': 'Eurosport',
      'TBC': 'TBC'
    };
  }

  async fetchTodaysMatches() {
    try {
      this.debugLog('requests', 'Starting to fetch today\'s matches from live-footballontv.com...');
      
      const htmlContent = await this.makeWebRequest('/');
      
      if (!htmlContent) {
        this.debugLog('requests', 'No content received from website');
        console.log('⚠️ No content found or website error');
        return [];
      }

      this.debugLog('requests', `Received HTML content: ${htmlContent.length} characters`);
      this.debugLog('data', 'Processing matches from website...');
      
      const processedMatches = this.parseMatches(htmlContent);
      
      // Filter for today's matches
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = processedMatches.filter(match => match.matchDate === today);
      
      this.debugLog('data', `Found ${processedMatches.length} total matches, ${todayMatches.length} for today`);
      
      return todayMatches;
      
    } catch (error) {
      this.debugLog('requests', `Error fetching matches: ${error.message}`);
      console.error('❌ Error fetching matches:', error.message);
      return [];
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

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Website Error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request Error: ${error.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  parseMatches(htmlContent) {
    this.debugLog('data', 'Starting to parse HTML content for matches...');
    const matches = [];
    
    try {
      // Split content into lines and process
      const lines = htmlContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      this.debugLog('data', `Processing ${lines.length} lines of HTML content`);
      
      let currentDate = null;
      let i = 0;
      let parsedCount = 0;
      
      while (i < lines.length) {
        const line = lines[i];
        
        // Check if line is a date (e.g., "Monday 2nd June 2025")
        if (this.isDateLine(line)) {
          currentDate = this.parseDate(line);
          this.debugLog('data', `Found date: ${line} -> ${currentDate}`);
          i++;
          continue;
        }
        
        // Check if line is a time (e.g., "19:45")
        if (this.isTimeLine(line) && currentDate) {
          const time = line;
          
          // Next line should be the match (teams)
          if (i + 1 < lines.length) {
            const matchLine = lines[i + 1];
            const teams = this.parseTeams(matchLine);
            
            if (teams) {
              let competition = '';
              let channels = [];
              let j = i + 2;
              
              // Look for competition and channels in following lines
              while (j < lines.length && !this.isTimeLine(lines[j]) && !this.isDateLine(lines[j])) {
                const nextLine = lines[j];
                
                if (this.isCompetitionLine(nextLine)) {
                  competition = nextLine;
                } else if (this.isChannelLine(nextLine)) {
                  channels = this.parseChannels(nextLine);
                }
                j++;
              }
              
              // Create match object
              const match = {
                id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                time: time,
                teamA: teams.teamA,
                teamB: teams.teamB,
                competition: competition || 'Football',
                channel: channels.length > 0 ? channels.join(', ') : 'Check TV Guide',
                channels: channels, // Array of individual channels for filtering
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
              
              i = j - 1; // Continue from where we left off
            }
          }
        }
        
        i++;
      }
      
      this.debugLog('data', `Parsing completed: ${matches.length} matches extracted`);
      
    } catch (error) {
      this.debugLog('data', `Error parsing matches: ${error.message}`);
      console.error('Error parsing matches:', error);
    }
    
    return matches;
  }

  isDateLine(line) {
    // Check if line matches date format like "Monday 2nd June 2025"
    const datePattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/;
    return datePattern.test(line);
  }

  parseDate(dateLine) {
    try {
      // Extract date from line like "Monday 2nd June 2025"
      const parts = dateLine.split(' ');
      if (parts.length >= 4) {
        const day = parts[1].replace(/\D/g, ''); // Remove st, nd, rd, th
        const month = parts[2];
        const year = parts[3];
        
        const monthMap = {
          'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        
        const monthNum = monthMap[month];
        if (monthNum) {
          const dateStr = `${year}-${monthNum}-${day.padStart(2, '0')}`;
          return dateStr;
        }
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }

  isTimeLine(line) {
    // Check if line matches time format like "19:45"
    const timePattern = /^\d{1,2}:\d{2}$/;
    return timePattern.test(line);
  }

  parseTeams(matchLine) {
    try {
      // Look for "v" or "vs" between team names
      const patterns = [
        /^(.+?)\s+v\s+(.+)$/,
        /^(.+?)\s+vs\s+(.+)$/
      ];
      
      for (const pattern of patterns) {
        const match = matchLine.match(pattern);
        if (match) {
          return {
            teamA: match[1].trim(),
            teamB: match[2].trim()
          };
        }
      }
    } catch (error) {
      console.error('Error parsing teams:', error);
    }
    
    return null;
  }

  isCompetitionLine(line) {
    // Competition lines usually contain keywords like "Premier League", "Champions League", etc.
    // and don't contain channel names
    const competitionKeywords = [
      'Premier League', 'Championship', 'League One', 'League Two',
      'Champions League', 'Europa League', 'Conference League',
      'FA Cup', 'League Cup', 'Community Shield',
      'World Cup', 'European Championship', 'Nations League',
      'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
      'International Friendly', 'FIFA World Cup', 'UEFA', 'CONCACAF',
      'Women\'s', 'U21', 'U19', 'U23', 'Play-Off', 'Final', 'Semi-Final',
      'Group Stage', 'Qualifier', 'Cup', 'League'
    ];
    
    // Check if it's not a channel line and contains competition keywords
    if (this.isChannelLine(line)) {
      return false;
    }
    
    return competitionKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  isChannelLine(line) {
    // Check if line contains known TV channel names
    const channelNames = Object.keys(this.channelMappings);
    return channelNames.some(channel => 
      line.includes(channel)
    );
  }

  parseChannels(channelLine) {
    const channels = [];
    const channelNames = Object.keys(this.channelMappings);
    
    for (const channel of channelNames) {
      if (channelLine.includes(channel)) {
        channels.push(this.channelMappings[channel]);
      }
    }
    
    // If no specific channels found, try to extract any text as potential channel
    if (channels.length === 0) {
      // Clean up the line and treat as channel
      const cleanedLine = channelLine.replace(/[^\w\s+]/g, ' ').trim();
      if (cleanedLine && cleanedLine.length > 0) {
        channels.push(cleanedLine);
      }
    }
    
    return [...new Set(channels)]; // Remove duplicates
  }

  async updateMatchData() {
    try {
      console.log('🔄 Starting automatic match data update...');
      
      // Load existing data
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const existingData = dataManager.loadData();
      
      // Fetch new matches
      const newMatches = await this.fetchTodaysMatches();
      
      if (newMatches.length === 0) {
        console.log('⚠️ No new matches found');
        return { success: true, added: 0, total: existingData.footballMatches.length };
      }

      // Filter out matches that already exist (avoid duplicates based on teams, time, and date)
      const existingMatchKeys = new Set(
        existingData.footballMatches.map(m => 
          `${m.teamA}_${m.teamB}_${m.time}_${m.matchDate}`
        )
      );
      
      const uniqueNewMatches = newMatches.filter(match => {
        const matchKey = `${match.teamA}_${match.teamB}_${match.time}_${match.matchDate}`;
        return !existingMatchKeys.has(matchKey);
      });

      console.log(`📊 Found ${newMatches.length} total matches, ${uniqueNewMatches.length} are new`);

      // Add new matches to existing data
      existingData.footballMatches.push(...uniqueNewMatches);
      
      // Save updated data
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        console.log(`✅ Successfully added ${uniqueNewMatches.length} new matches`);
        console.log(`📊 Total matches now: ${existingData.footballMatches.length}`);
        
        // Log the new matches added
        uniqueNewMatches.forEach(match => {
          console.log(`  ⚽ ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition}) - ${match.channel}`);
        });
      }
      
      return { 
        success: saved, 
        added: uniqueNewMatches.length, 
        total: existingData.footballMatches.length,
        matches: uniqueNewMatches
      };
      
    } catch (error) {
      console.error('❌ Error updating match data:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Method to test website connection
  async testConnection() {
    try {
      console.log('🔍 Testing live-footballontv.com connection...');
      const content = await this.makeWebRequest('/');
      const success = content && content.length > 1000;
      console.log(`${success ? '✅' : '❌'} Website connection ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('❌ Website connection failed:', error.message);
      return false;
    }
  }

  // Get all unique channels from current matches for filtering
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
        // Split comma-separated channels
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

// If script is run directly, perform update
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
