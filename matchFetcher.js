const https = require('https');
const fs = require('fs');
const path = require('path');

class MatchFetcher {
  constructor() {
    // Free tier: 10 requests per minute, 10 competitions
    this.apiKey = '35813088b3ae49dbb84843a9f959ba69'; // Football-Data.org API key
    this.baseUrl = 'api.football-data.org';
    this.dataManager = null;
    
    // UK TV Channel mappings for competitions
    this.channelMappings = {
      'PL': 'Sky Sports Premier League', // Premier League
      'ELC': 'Sky Sports Football',      // Championship  
      'CL': 'TNT Sports',                // Champions League
      'EL': 'TNT Sports',                // Europa League
      'WC': 'BBC/ITV',                   // World Cup
      'EC': 'BBC/ITV',                   // Euros
      'PD': 'Premier Sports',            // La Liga
      'SA': 'BT Sport',                  // Serie A
      'BL1': 'Sky Sports',               // Bundesliga
      'FL1': 'BT Sport',                 // Ligue 1
      'DED': 'Premier Sports'            // Eredivisie
    };

    this.competitionNames = {
      'PL': 'Premier League',
      'ELC': 'Championship', 
      'CL': 'Champions League',
      'EL': 'Europa League',
      'WC': 'World Cup',
      'EC': 'European Championship',
      'PD': 'La Liga',
      'SA': 'Serie A', 
      'BL1': 'Bundesliga',
      'FL1': 'Ligue 1',
      'DED': 'Eredivisie'
    };
  }

  async fetchTodaysMatches() {
    try {
      console.log('🔄 Fetching today\'s matches from Football-Data.org...');
      
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
      
      // Fetch matches for today
      const matches = await this.makeApiRequest(`/v4/matches?dateFrom=${today}&dateTo=${tomorrow}`);
      
      if (!matches || !matches.matches) {
        console.log('⚠️ No matches found or API error');
        return [];
      }

      console.log(`📊 Found ${matches.matches.length} matches for today`);
      
      const processedMatches = this.processMatches(matches.matches);
      return processedMatches;
      
    } catch (error) {
      console.error('❌ Error fetching matches:', error.message);
      return [];
    }
  }

  async fetchWeekMatches() {
    try {
      console.log('🔄 Fetching this week\'s matches...');
      
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7*24*60*60*1000);
      
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = nextWeek.toISOString().split('T')[0];
      
      const matches = await this.makeApiRequest(`/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      
      if (!matches || !matches.matches) {
        console.log('⚠️ No matches found for this week');
        return [];
      }

      console.log(`📊 Found ${matches.matches.length} matches for this week`);
      return this.processMatches(matches.matches);
      
    } catch (error) {
      console.error('❌ Error fetching weekly matches:', error.message);
      return [];
    }
  }

  makeApiRequest(endpoint) {
    return new Promise((resolve, reject) => {
      if (this.apiKey === 'YOUR_FOOTBALL_DATA_API_KEY_HERE') {
        reject(new Error("API key not configured. Please replace 'YOUR_FOOTBALL_DATA_API_KEY_HERE' in matchFetcher.js with your actual Football-Data.org API key."));
        return;
      }

      const options = {
        hostname: this.baseUrl,
        path: endpoint,
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
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
              reject(new Error(`API Error: ${res.statusCode} - ${jsonData.message || data}`));
            }
          } catch (e) {
            reject(new Error(`JSON Parse Error: ${e.message}`));
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

  processMatches(apiMatches) {
    const processedMatches = [];

    apiMatches.forEach(match => {
      try {
        // Skip matches that don't have teams or are invalid
        if (!match.homeTeam || !match.awayTeam || !match.utcDate) {
          return;
        }

        const matchDate = new Date(match.utcDate);
        const ukTime = new Date(matchDate.getTime()); // API should return UTC
        
        // Convert to UK time (UTC+0 or UTC+1 depending on DST)
        const timeString = ukTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/London'
        });

        const competition = match.competition?.code || 'UNKNOWN';
        const competitionName = this.competitionNames[competition] || match.competition?.name || 'Unknown Competition';
        const channel = this.channelMappings[competition] || 'Check TV Guide';

        const processedMatch = {
          id: `api_${match.id}`,
          time: timeString,
          teamA: match.homeTeam.name || match.homeTeam.shortName,
          teamB: match.awayTeam.name || match.awayTeam.shortName,
          competition: competitionName,
          channel: channel,
          status: this.mapStatus(match.status),
          createdAt: new Date().toISOString(),
          matchDate: matchDate.toISOString().split('T')[0],
          apiSource: 'football-data.org',
          apiMatchId: match.id,
          venue: match.venue?.name || 'TBD'
        };

        processedMatches.push(processedMatch);
        
      } catch (error) {
        console.error('Error processing match:', error.message, match);
      }
    });

    return processedMatches;
  }

  mapStatus(apiStatus) {
    const statusMap = {
      'SCHEDULED': 'upcoming',
      'TIMED': 'upcoming', 
      'IN_PLAY': 'live',
      'PAUSED': 'live',
      'FINISHED': 'finished',
      'POSTPONED': 'postponed',
      'CANCELLED': 'cancelled',
      'SUSPENDED': 'suspended'
    };
    
    return statusMap[apiStatus] || 'upcoming';
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

      // Filter out matches that already exist (avoid duplicates)
      const existingIds = new Set(existingData.footballMatches.map(m => m.apiMatchId).filter(Boolean));
      const uniqueNewMatches = newMatches.filter(match => !existingIds.has(match.apiMatchId));

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
          console.log(`  ⚽ ${match.time} - ${match.teamA} vs ${match.teamB} (${match.competition})`);
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

  // Method to setup API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    console.log('🔑 API key updated');
  }

  // Method to test API connection
  async testConnection() {
    try {
      console.log('🔍 Testing Football-Data.org API connection...');
      const competitions = await this.makeApiRequest('/v4/competitions');
      console.log(`✅ API connection successful! Found ${competitions.competitions?.length || 0} competitions`);
      return true;
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return false;
    }
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



