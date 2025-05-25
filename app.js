// Sports App JavaScript - Updated with Football + UFC Auto-Fetch
const { ipcRenderer } = require('electron');

class SportsApp {
  constructor() {
    this.footballMatches = [];
    this.ufcMainCard = [];
    this.ufcPrelimCard = [];
    this.ufcEvents = [];
    this.dataManager = null;
    this.matchFetcher = null;
    this.ufcFetcher = null;
    this.lastFetchTime = null;
    this.lastUFCFetch = null;
    this.autoFetchOnStartup = true; // Enable auto-fetch on startup
    
    // Initialize data manager and fetchers
    this.initDataManager();
    this.init();
  }

  async initDataManager() {
    try {
      // Initialize fetchers
      const MatchFetcher = require('./matchFetcher');
      const UFCFetcher = require('./ufcFetcher');
      this.matchFetcher = new MatchFetcher();
      this.ufcFetcher = new UFCFetcher();
      
      // Load data from file system
      await this.loadMatchData();
      
      // Auto-fetch on startup if enabled
      if (this.autoFetchOnStartup) {
        await this.autoFetchOnStartup();
      }
    } catch (error) {
      console.error('Failed to initialize data manager:', error);
      // Fall back to hardcoded data if needed
      this.loadFallbackData();
    }
  }

  async autoFetchOnStartup() {
    try {
      console.log('🚀 Auto-fetching sports data on startup...');
      
      // Check if we should fetch
      const shouldFetchFootball = this.shouldAutoFetch('football');
      const shouldFetchUFC = this.shouldAutoFetch('ufc');
      
      if (shouldFetchFootball || shouldFetchUFC) {
        console.log('📥 Fetching fresh sports data...');
        this.showStartupFetchingState();
        
        let footballResult = { success: true, added: 0 };
        let ufcResult = { success: true, added: 0 };
        
        // Fetch football matches if needed
        if (shouldFetchFootball) {
          try {
            footballResult = await this.matchFetcher.updateMatchData();
            console.log(`⚽ Football: ${footballResult.success ? 'Success' : 'Failed'} - ${footballResult.added} new matches`);
          } catch (error) {
            console.log(`⚽ Football fetch error: ${error.message}`);
            footballResult = { success: false, error: error.message };
          }
        }
        
        // Fetch UFC events if needed
        if (shouldFetchUFC) {
          try {
            ufcResult = await this.ufcFetcher.updateUFCData();
            console.log(`🥊 UFC: ${ufcResult.success ? 'Success' : 'Failed'} - ${ufcResult.added} new events`);
          } catch (error) {
            console.log(`🥊 UFC fetch error: ${error.message}`);
            ufcResult = { success: false, error: error.message };
          }
        }
        
        // Show results
        const totalNew = (footballResult.added || 0) + (ufcResult.added || 0);
        if (totalNew > 0) {
          await this.loadMatchData(); // Reload with new data
          this.showStartupFetchResult(`📥 Found ${footballResult.added || 0} football matches, ${ufcResult.added || 0} UFC events!`);
        } else if (footballResult.success || ufcResult.success) {
          this.showStartupFetchResult('✅ Sports data is up to date');
        } else {
          this.showStartupFetchResult('⚠️ Using cached sports data');
        }
        
        // Also run cleanup while we're at it
        await this.startupCleanup();
        
      } else {
        console.log('⏭️ Skipping startup fetch (data is recent)');
      }
    } catch (error) {
      console.error('Error during startup fetch:', error);
      this.showStartupFetchResult('⚠️ Using cached data');
    }
  }

  shouldAutoFetch(type) {
    // Check if we have API keys configured
    if (type === 'football') {
      if (!this.matchFetcher || this.matchFetcher.apiKey === 'YOUR_API_KEY_HERE') {
        console.log('⏭️ No football API key configured, skipping auto-fetch');
        return false;
      }
    }
    
    // Always fetch UFC (TheSportsDB is free and doesn't require API key)
    if (type === 'ufc') {
      // Always try to fetch UFC
    }

    // Check last fetch times
    const lastFetch = type === 'football' ? this.lastFetchTime : this.lastUFCFetch;
    
    // Always fetch if no previous fetch recorded
    if (!lastFetch) {
      return true;
    }

    // Fetch if last fetch was more than 2 hours ago
    const lastFetchDate = new Date(lastFetch);
    const now = new Date();
    const hoursSinceLastFetch = (now - lastFetchDate) / (1000 * 60 * 60);

    return hoursSinceLastFetch > 2;
  }

  async startupCleanup() {
    try {
      console.log('🧹 Running startup cleanup...');
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const result = dataManager.cleanupOldMatches();
      
      if (result.success && result.removedCount > 0) {
        console.log(`🧹 Startup cleanup: Removed ${result.removedCount} old events`);
        await this.loadMatchData(); // Reload after cleanup
      }
    } catch (error) {
      console.error('Error during startup cleanup:', error);
    }
  }

  showStartupFetchingState() {
    // Show a subtle loading indicator during startup fetch
    const header = document.querySelector('.header-content');
    if (header && !document.getElementById('startup-loading')) {
      const loading = document.createElement('div');
      loading.id = 'startup-loading';
      loading.className = 'startup-loading';
      loading.innerHTML = `
        <span class="loading-spinner">⏳</span>
        <span>Checking for new sports data...</span>
      `;
      header.appendChild(loading);
    }
  }

  showStartupFetchResult(message) {
    // Remove loading indicator and show result briefly
    const loading = document.getElementById('startup-loading');
    if (loading) {
      loading.innerHTML = `<span>${message}</span>`;
      loading.className = 'startup-result';
      
      // Remove after 4 seconds
      setTimeout(() => {
        if (loading.parentNode) {
          loading.parentNode.removeChild(loading);
        }
      }, 4000);
    }
  }

  async loadMatchData() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(__dirname, 'data', 'matches.json');
      
      if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        this.footballMatches = data.footballMatches || [];
        this.ufcEvents = data.ufcEvents || [];
        this.lastFetchTime = data.lastFetch || null;
        this.lastUFCFetch = data.lastUFCFetch || null;
        
        // Handle UFC data - use fetched events or fallback to hardcoded
        if (this.ufcEvents && this.ufcEvents.length > 0) {
          // Use the most recent UFC event for main/prelim cards
          const upcomingEvent = this.ufcEvents.find(event => 
            new Date(event.ukDateTime || event.date) > new Date()
          ) || this.ufcEvents[0];
          
          if (upcomingEvent) {
            this.ufcMainCard = upcomingEvent.mainCard || [];
            this.ufcPrelimCard = upcomingEvent.prelimCard || [];
          }
        }
        
        // Fallback to hardcoded UFC if no fetched data
        if (this.ufcMainCard.length === 0) {
          this.loadFallbackUFCData();
        }
        
        console.log(`📊 Loaded ${this.footballMatches.length} football matches and ${this.ufcEvents.length} UFC events`);
      } else {
        console.log('📁 No data file found, using fallback data');
        this.loadFallbackData();
      }
    } catch (error) {
      console.error('Error loading match data:', error);
      this.loadFallbackData();
    }
  }

  loadFallbackData() {
    // Fallback football data
    this.footballMatches = [
      {
        id: "fallback_001",
        time: "13:00",
        teamA: "Girona",
        teamB: "Atlético Madrid",
        competition: "La Liga",
        channel: "Premier Sports 1",
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0]
      },
      {
        id: "fallback_002",
        time: "16:00",
        teamA: "Liverpool",
        teamB: "Crystal Palace",
        competition: "Premier League",
        channel: "Sky Sports Premier League",
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0]
      }
    ];

    this.loadFallbackUFCData();
    console.log('📋 Using fallback data - consider setting up API integration');
  }

  loadFallbackUFCData() {
    this.ufcMainCard = [
      { 
        fighter1: "Merab Dvalishvili", 
        fighter2: "Sean O'Malley", 
        weightClass: "Bantamweight", 
        title: "Title Fight" 
      },
      { 
        fighter1: "Julianna Peña", 
        fighter2: "Kayla Harrison", 
        weightClass: "Women's Bantamweight", 
        title: "Title Fight" 
      }
    ];

    this.ufcPrelimCard = [
      { fighter1: "Bruno Silva", fighter2: "Joshua Van", weightClass: "Flyweight" },
      { fighter1: "Ariane Lipski", fighter2: "Cong Wang", weightClass: "Women's Flyweight" }
    ];
  }

  init() {
    this.updateClock();
    this.renderFootballMatches();
    this.renderUFCFights();
    this.addFetchButton();
    
    // Update clock every second
    setInterval(() => this.updateClock(), 1000);
    
    // Update match statuses every minute
    setInterval(() => this.updateMatchStatuses(), 60000);
    
    // Auto-refresh sports data every 2 hours (optional)
    setInterval(() => this.autoRefreshIfNeeded(), 2 * 60 * 60 * 1000);
    
    console.log('🚀 Sports App initialized successfully!');
  }

  async autoRefreshIfNeeded() {
    // Auto-refresh during the day if app is running for a long time
    const now = new Date();
    const hour = now.getHours();
    
    // Only auto-refresh during reasonable hours (8 AM to 11 PM)
    if (hour >= 8 && hour <= 23) {
      console.log('🔄 Auto-refreshing sports data (2-hour interval)');
      await this.fetchNewSportsData();
    }
  }

  addFetchButton() {
    // Add fetch controls to the header
    const header = document.querySelector('.header-content');
    if (header && !document.getElementById('fetch-controls')) {
      const controls = document.createElement('div');
      controls.id = 'fetch-controls';
      controls.className = 'fetch-controls';
      controls.innerHTML = `
        <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn" title="Fetch new matches and UFC events">
          📥 Refresh Sports Data
        </button>
        <button onclick="window.sportsApp.manualCleanup()" class="cleanup-btn" title="Remove old matches and events">
          🧹 Cleanup
        </button>
        <div class="auto-fetch-indicator" title="Auto-fetches football & UFC on startup">
          🔄 Auto-fetch: ON
        </div>
      `;
      header.appendChild(controls);
    }
  }

  updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB');
    const dateString = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
      timeElement.textContent = `${timeString} - ${dateString}`;
    }
  }

  getMatchStatus(match) {
    const now = new Date();
    const matchDateTime = this.getMatchDateTime(match);
    
    if (now > matchDateTime) {
      // Check if it's been more than 2 hours (typical match duration)
      const timeDiff = now - matchDateTime;
      if (timeDiff > 2 * 60 * 60 * 1000) {
        return "finished";
      }
      return "live";
    } else {
      const timeDiff = matchDateTime - now;
      if (timeDiff <= 30 * 60 * 1000) { // 30 minutes
        return "soon";
      }
      return "upcoming";
    }
  }

  getMatchDateTime(match) {
    const [hours, minutes] = match.time.split(':');
    const matchDate = new Date(match.matchDate || new Date().toISOString().split('T')[0]);
    matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return matchDate;
  }

  getStatusClass(status) {
    switch (status) {
      case "live": return "status-live";
      case "soon": return "status-soon";
      case "finished": return "status-finished";
      default: return "status-upcoming";
    }
  }

  renderFootballMatches() {
    const container = document.getElementById('football-matches');
    if (!container) return;

    container.innerHTML = '';

    // Filter out old matches (matches that started more than 3 hours ago)
    const currentMatches = this.footballMatches.filter(match => {
      const matchDateTime = this.getMatchDateTime(match);
      const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000));
      return matchDateTime > threeHoursAgo;
    });

    if (currentMatches.length === 0) {
      container.innerHTML = `
        <div class="no-matches">
          <div class="no-matches-icon">📅</div>
          <div class="no-matches-text">No upcoming football matches today</div>
          <div class="no-matches-subtext">
            App automatically checks for new matches on startup
            <br>
            <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn">
              📥 Check for new sports data now
            </button>
          </div>
        </div>
      `;
      return;
    }

    currentMatches.forEach(match => {
      const status = this.getMatchStatus(match);
      const statusClass = this.getStatusClass(status);
      const isApiMatch = match.apiSource ? '🌐' : '✏️';

      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.setAttribute('data-match-id', match.id);
      
      matchCard.innerHTML = `
        <div class="match-header">
          <div class="match-time">
            <div class="status-indicator ${statusClass}"></div>
            <span class="time-text">${match.time}</span>
            <span class="match-source" title="${match.apiSource ? 'From Football API' : 'Manual entry'}">${isApiMatch}</span>
          </div>
          <div class="channel-info">
            <span>📺</span>
            <span>${match.channel}</span>
          </div>
        </div>
        
        <div class="teams">
          <div class="teams-text">
            <span class="team-a">${match.teamA}</span>
            <span class="vs">vs</span>
            <span class="team-b">${match.teamB}</span>
          </div>
        </div>
        
        <div class="competition">
          <span class="competition-badge">${match.competition}</span>
          ${match.venue ? `<span class="venue-info" title="Venue">${match.venue}</span>` : ''}
        </div>
      `;

      container.appendChild(matchCard);
    });

    // Update matches count in header
    this.updateMatchesCount(currentMatches.length);
  }

  updateMatchesCount(count) {
    const sectionTitle = document.querySelector('.football-section .section-title');
    if (sectionTitle) {
      const lastFetchText = this.lastFetchTime ? 
        ` (Updated: ${new Date(this.lastFetchTime).toLocaleTimeString('en-GB')})` : '';
      sectionTitle.textContent = `Today's Football on UK TV (${count})${lastFetchText}`;
    }
  }

  renderUFCFights() {
    this.renderMainCard();
    this.renderPrelimCard();
    this.updateUFCTitle();
  }

  updateUFCTitle() {
    const ufcTitle = document.querySelector('.ufc-title');
    if (ufcTitle && this.ufcEvents.length > 0) {
      // Find next upcoming UFC event
      const upcomingEvent = this.ufcEvents.find(event => 
        new Date(event.ukDateTime || event.date) > new Date()
      );
      
      if (upcomingEvent) {
        ufcTitle.textContent = upcomingEvent.title;
        
        // Update event details if elements exist
        const ufcDetails = document.querySelector('.ufc-details');
        if (ufcDetails) {
          const dateSpan = ufcDetails.querySelector('span');
          if (dateSpan && upcomingEvent.date) {
            const eventDate = new Date(upcomingEvent.ukDateTime || upcomingEvent.date);
            dateSpan.textContent = eventDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric'
            });
          }
        }
        
        // Add API source indicator
        const lastUFCFetchText = this.lastUFCFetch ? 
          ` (UFC Updated: ${new Date(this.lastUFCFetch).toLocaleTimeString('en-GB')})` : '';
        const apiIndicator = upcomingEvent.apiSource ? ' 🌐' : ' ✏️';
        ufcTitle.textContent += apiIndicator + lastUFCFetchText;
      }
    }
  }

  renderMainCard() {
    const container = document.getElementById('main-card-fights');
    if (!container) return;

    container.innerHTML = '';

    this.ufcMainCard.forEach(fight => {
      const fightCard = document.createElement('div');
      fightCard.className = 'fight-main';
      
      fightCard.innerHTML = `
        <div class="fight-header">
          <div class="fighters">
            <div class="fighter fighter-1">${fight.fighter1}</div>
            <div class="vs-separator">vs</div>
            <div class="fighter fighter-2">${fight.fighter2}</div>
          </div>
          ${fight.title ? `<div class="title-fight">${fight.title}</div>` : ''}
        </div>
        <div class="weight-class">
          <span class="weight-badge">${fight.weightClass}</span>
        </div>
      `;

      container.appendChild(fightCard);
    });
  }

  renderPrelimCard() {
    const container = document.getElementById('prelim-card-fights');
    if (!container) return;

    container.innerHTML = '';

    this.ufcPrelimCard.forEach(fight => {
      const fightCard = document.createElement('div');
      fightCard.className = 'fight-prelim';
      
      fightCard.innerHTML = `
        <div class="prelim-fighters">
          <div class="prelim-fighter fighter-1">${fight.fighter1}</div>
          <div class="vs-separator">vs</div>
          <div class="prelim-fighter fighter-2">${fight.fighter2}</div>
        </div>
        <div class="prelim-weight">${fight.weightClass}</div>
      `;

      container.appendChild(fightCard);
    });
  }

  async updateMatchStatuses() {
    // Reload data from file to get any updates
    await this.loadMatchData();
    
    // Re-render all sports data with updated statuses
    this.renderFootballMatches();
    this.renderUFCFights();
    console.log('🔄 Sports data statuses updated');
  }

  // Method to fetch both football and UFC data
  async fetchNewSportsData() {
    try {
      console.log('📥 Fetching new sports data...');
      
      // Show loading state
      this.showFetchingState(true);
      
      if (!this.matchFetcher) {
        const MatchFetcher = require('./matchFetcher');
        this.matchFetcher = new MatchFetcher();
      }
      
      if (!this.ufcFetcher) {
        const UFCFetcher = require('./ufcFetcher');
        this.ufcFetcher = new UFCFetcher();
      }
      
      // Fetch both football and UFC data
      const [footballResult, ufcResult] = await Promise.all([
        this.matchFetcher.updateMatchData().catch(e => ({ success: false, error: e.message })),
        this.ufcFetcher.updateUFCData().catch(e => ({ success: false, error: e.message }))
      ]);
      
      const totalNew = (footballResult.added || 0) + (ufcResult.added || 0);
      
      if (totalNew > 0) {
        console.log(`✅ Fetched ${footballResult.added || 0} football matches, ${ufcResult.added || 0} UFC events`);
        
        // Update timestamps
        if (footballResult.success) this.lastFetchTime = new Date().toISOString();
        if (ufcResult.success) this.lastUFCFetch = new Date().toISOString();
        
        // Reload data and refresh UI
        await this.loadMatchData();
        this.renderFootballMatches();
        this.renderUFCFights();
        
        // Show success message
        this.showFetchResult(`✅ Added ${footballResult.added || 0} football matches, ${ufcResult.added || 0} UFC events!`);
        
      } else if (footballResult.success || ufcResult.success) {
        this.showFetchResult('✅ Sports data is up to date');
      } else {
        this.showFetchResult(`❌ Failed to fetch: ${footballResult.error || ufcResult.error}`);
      }
      
      this.showFetchingState(false);
      return { 
        success: footballResult.success || ufcResult.success, 
        football: footballResult,
        ufc: ufcResult
      };
      
    } catch (error) {
      console.error('Error fetching sports data:', error);
      this.showFetchResult(`❌ Error: ${error.message}`);
      this.showFetchingState(false);
      return { success: false, error: error.message };
    }
  }

  showFetchingState(isLoading) {
    const fetchButtons = document.querySelectorAll('.fetch-btn');
    fetchButtons.forEach(btn => {
      if (isLoading) {
        btn.textContent = '⏳ Fetching...';
        btn.disabled = true;
      } else {
        btn.textContent = '📥 Refresh Sports Data';
        btn.disabled = false;
      }
    });
  }

  showFetchResult(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'fetch-notification';
    notification.textContent = message;
    
    const header = document.querySelector('.header-content');
    if (header) {
      header.appendChild(notification);
      
      // Remove after 4 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 4000);
    }
  }

  // Method to manually trigger cleanup from the app
  async manualCleanup() {
    try {
      console.log('🧹 Running manual cleanup...');
      
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const result = dataManager.cleanupOldMatches();
      
      if (result.success) {
        console.log(`✅ Manual cleanup completed: Removed ${result.removedCount} old events`);
        this.showFetchResult(`🧹 Removed ${result.removedCount} old events`);
        
        // Reload data and refresh UI
        await this.loadMatchData();
        this.renderFootballMatches();
        this.renderUFCFights();
      } else {
        this.showFetchResult(`❌ Cleanup failed`);
      }
      
      return result;
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      this.showFetchResult(`❌ Cleanup error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Method to add new matches dynamically
  addFootballMatch(match) {
    const newMatch = {
      ...match,
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      matchDate: match.matchDate || new Date().toISOString().split('T')[0]
    };
    
    this.footballMatches.push(newMatch);
    this.renderFootballMatches();
    
    // Save to file
    this.saveMatchData();
  }

  async saveMatchData() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(__dirname, 'data', 'matches.json');
      
      const data = {
        footballMatches: this.footballMatches,
        ufcEvents: this.ufcEvents,
        lastCleanup: null,
        lastFetch: this.lastFetchTime,
        lastUFCFetch: this.lastUFCFetch
      };
      
      const dataDir = path.dirname(dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
      console.log('💾 Sports data saved successfully');
    } catch (error) {
      console.error('Error saving sports data:', error);
    }
  }

  // Method to update UFC event
  updateUFCEvent(mainCard, prelimCard) {
    if (mainCard) this.ufcMainCard = mainCard;
    if (prelimCard) this.ufcPrelimCard = prelimCard;
    this.renderUFCFights();
    this.saveMatchData();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM loaded, initializing Sports App...');
  const app = new SportsApp();
  
  // Make app globally accessible for debugging and manual operations
  window.sportsApp = app;
  
  // Add manual operation shortcuts
  window.fetchSportsData = () => app.fetchNewSportsData();
  window.fetchFootball = () => app.matchFetcher?.updateMatchData();
  window.fetchUFC = () => app.ufcFetcher?.updateUFCData();
  window.manualCleanup = () => app.manualCleanup();
  window.addMatch = (match) => app.addFootballMatch(match);
});

// Error handling
window.addEventListener('error', (e) => {
  console.error('❌ Sports App Error:', e.error);
});

console.log('📺 Sports App script loaded successfully!');
