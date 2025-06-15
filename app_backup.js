// Sports App JavaScript - Updated with Football + UFC Auto-Fetch
const { ipcRenderer } = require('electron');

class SportsApp {
  constructor() {
    this.footballMatches = [];
    this.ufcMainCard = [];
    this.ufcPrelimCard = [];
    this.ufcEarlyPrelimCard = [];
    this.ufcEvents = [];
    this.dataManager = null;
    this.matchFetcher = null;
    this.ufcFetcher = null;
    this.lastFetchTime = null;
    this.lastUFCFetch = null;
    this.autoFetchOnStartup = true; // Enable auto-fetch on startup
    this.availableChannels = [];
    this.selectedChannels = new Set(); // Track which channels are selected
    this.showAllChannels = true; // When true, show all matches regardless of channel selection
    this.debugVisible = true; // Show debug window by default
    this.debugLogs = {
      requests: [],
      data: [],
      filtering: [],
      display: []
    };
    
    // Initialize data manager and fetchers
    this.initDataManager();
    this.init();
  }

  async initDataManager() {
    try {
      this.debugLog('data', 'Initializing data manager and fetchers...');
      
      // Initialize fetchers with debug logging
      const MatchFetcher = require('./matchFetcher');
      const UFCFetcher = require('./ufcFetcher');
      
      // Pass debug logging function to fetchers
      this.matchFetcher = new MatchFetcher((category, message, data) => {
        this.debugLog(category, message, data);
      });
      this.ufcFetcher = new UFCFetcher();
      
      this.debugLog('data', 'Fetchers initialized successfully');
      
      // Load data from file system
      await this.loadMatchData();
      
      // Auto-fetch on startup if enabled
      if (this.autoFetchOnStartup) {
        await this.autoFetchOnStartup();
      }
    } catch (error) {
      this.debugLog('data', `Failed to initialize data manager: ${error.message}`);
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
    // Football now uses web scraping (no API key needed)
    if (type === 'football') {
      // Always try to fetch from website
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
    this.debugLog('data', 'Loading match data from file system...');
    
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
        
        this.debugLog('data', `Loaded data from file: ${this.footballMatches.length} football matches, ${this.ufcEvents.length} UFC events`);
        
        // Handle UFC data - use fetched events or fallback to hardcoded
        if (this.ufcEvents && this.ufcEvents.length > 0) {
          // Use the most recent UFC event for main/prelim cards
          const upcomingEvent = this.ufcEvents.find(event => 
            new Date(event.ukDateTime || event.date) > new Date()
          ) || this.ufcEvents[0];
          
          if (upcomingEvent) {
            this.ufcMainCard = upcomingEvent.mainCard || [];
            this.ufcPrelimCard = upcomingEvent.prelimCard || [];
            this.ufcEarlyPrelimCard = upcomingEvent.earlyPrelimCard || [];
            this.debugLog('data', 'Using fetched UFC event data', { title: upcomingEvent.title });
          }
        }
        
        // Fallback to hardcoded UFC if no fetched data
        if (this.ufcMainCard.length === 0) {
          this.loadFallbackUFCData();
          this.debugLog('data', 'Using fallback UFC data');
        }
        
        console.log(`📊 Loaded ${this.footballMatches.length} football matches and ${this.ufcEvents.length} UFC events`);
      } else {
        this.debugLog('data', 'No data file found, using fallback data');
        console.log('📁 No data file found, using fallback data');
        this.loadFallbackData();
      }
    } catch (error) {
      this.debugLog('data', `Error loading match data: ${error.message}`);
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
        channels: ["Premier Sports 1"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0],
        apiSource: 'fallback'
      },
      {
        id: "fallback_002",
        time: "16:00",
        teamA: "Liverpool",
        teamB: "Crystal Palace",
        competition: "Premier League",
        channel: "Sky Sports Premier League",
        channels: ["Sky Sports Premier League"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0],
        apiSource: 'fallback'
      },
      {
        id: "fallback_003",
        time: "19:45",
        teamA: "Manchester United",
        teamB: "Arsenal",
        competition: "Premier League",
        channel: "Sky Sports Premier League, Sky Sports Main Event",
        channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0],
        apiSource: 'fallback'
      }
    ];

    this.loadFallbackUFCData();
    console.log('📋 Using fallback data - web scraping will provide real data');
  }

  loadFallbackUFCData() {
    this.ufcMainCard = [
      { 
        fighter1: "Erin Blanchfield", 
        fighter2: "Maycee Barber", 
        weightClass: "Women's Flyweight", 
        title: "Main Event" 
      },
      { 
        fighter1: "Mateusz Gamrot", 
        fighter2: "Ludovit Klein", 
        weightClass: "Lightweight", 
        title: "" 
      },
      { 
        fighter1: "Billy Ray Goff", 
        fighter2: "Seokhyeon Ko", 
        weightClass: "Welterweight", 
        title: "" 
      },
      { 
        fighter1: "Dustin Jacoby", 
        fighter2: "Bruno Lopes", 
        weightClass: "Light Heavyweight", 
        title: "" 
      },
      { 
        fighter1: "Zach Reese", 
        fighter2: "Dusko Todorovic", 
        weightClass: "Middleweight", 
        title: "" 
      }
    ];

    this.ufcPrelimCard = [
      { fighter1: "Allan Nascimento", fighter2: "Jafel Filho", weightClass: "Flyweight" },
      { fighter1: "Andreas Gustafsson", fighter2: "Jeremiah Wells", weightClass: "Welterweight" },
      { fighter1: "Ketlen Vieira", fighter2: "TBD", weightClass: "Women's Bantamweight" },
      { fighter1: "Rayanne dos Santos", fighter2: "Alice Ardelean", weightClass: "Women's Strawweight" }
    ];
    
    // Fight Night events typically don't have early prelims
    this.ufcEarlyPrelimCard = [];
  }

  init() {
    this.debugLog('display', 'Initializing Sports App...');
    
    this.updateClock();
    this.renderFootballMatches();
    this.renderUFCFights();
    this.renderChannelFilter();
    this.addFetchButton();
    this.initDebugWindow();
    
    // Update clock every second
    setInterval(() => this.updateClock(), 1000);
    
    // Update match statuses every minute
    setInterval(() => this.updateMatchStatuses(), 60000);
    
    // Auto-refresh sports data every 2 hours (optional)
    setInterval(() => this.autoRefreshIfNeeded(), 2 * 60 * 60 * 1000);
    
    this.debugLog('display', 'Sports App initialized successfully!');
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
    // Always show UK time explicitly
    const now = new Date();
    const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
    
    const timeString = ukTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const dateString = ukTime.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Determine if we're in BST or GMT (June 2025 = BST)
    const timezoneName = this.isUKSummerTime() ? 'BST' : 'GMT';
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
      timeElement.textContent = `${timeString} ${timezoneName} (UK Time) - ${dateString}`;
    }
  }

  // Check if UK is in summer time (BST)
  isUKSummerTime() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    // BST runs from last Sunday in March to last Sunday in October
    // For June 2025, we're definitely in BST
    return month >= 2 && month <= 9; // March to October (approximate)
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

  // Get live match time (how long the match has been running)
  getLiveMatchTime(match) {
    if (this.getMatchStatus(match) !== 'live') {
      return null;
    }
    
    const now = new Date();
    const matchStart = this.getMatchDateTime(match);
    const minutesElapsed = Math.floor((now - matchStart) / (1000 * 60));
    
    if (minutesElapsed <= 45) {
      return `${minutesElapsed}'`;
    } else if (minutesElapsed <= 60) {
      return 'HT';
    } else if (minutesElapsed <= 105) {
      return `${minutesElapsed - 15}'`; // Account for 15-min halftime
    } else {
      return 'FT';
    }
  }

  // Generate mock live score for demonstration
  getMockLiveScore(match) {
    if (this.getMatchStatus(match) !== 'live') {
      return null;
    }
    
    // Simple mock scoring based on match ID
    const seed = match.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const homeScore = seed % 4; // 0-3 goals
    const awayScore = (seed * 2) % 3; // 0-2 goals
    
    return `${homeScore}-${awayScore}`;
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
    this.debugLog('display', 'Rendering football matches...');
    
    const container = document.getElementById('football-matches');
    if (!container) {
      this.debugLog('display', 'ERROR: football-matches container not found');
      return;
    }

    container.innerHTML = '';

    // Filter out old matches (matches that started more than 3 hours ago)
    const currentMatches = this.footballMatches.filter(match => {
      const matchDateTime = this.getMatchDateTime(match);
      const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000));
      return matchDateTime > threeHoursAgo;
    });
    
    this.debugLog('filtering', `Filtered old matches: ${this.footballMatches.length} total -> ${currentMatches.length} current`);

    // Apply channel filtering
    const filteredMatches = this.applyChannelFilter(currentMatches);
    
    this.debugLog('filtering', `Applied channel filter: ${currentMatches.length} current -> ${filteredMatches.length} after channel filter`, {
      selectedChannels: Array.from(this.selectedChannels),
      showAllChannels: this.showAllChannels
    });

    if (currentMatches.length === 0) {
      this.debugLog('display', 'No current matches found - showing empty state');
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

    if (filteredMatches.length === 0 && currentMatches.length > 0) {
      this.debugLog('display', 'No matches after channel filtering - showing filter message');
      container.innerHTML = `
        <div class="no-filtered-matches">
          <div class="no-filtered-matches-icon">📺</div>
          <div class="no-filtered-matches-text">No matches match your channel filter</div>
          <div class="no-filtered-matches-subtext">
            ${currentMatches.length} matches available - try selecting more channels below
          </div>
        </div>
      `;
      return;
    }

    filteredMatches.forEach(match => {
      const status = this.getMatchStatus(match);
      const statusClass = this.getStatusClass(status);
      const isApiMatch = match.apiSource ? '🌐' : '✏️';

      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.setAttribute('data-match-id', match.id);
      
      // Get live score and match time if applicable
      const liveScore = this.getMockLiveScore(match);
      const liveTime = this.getLiveMatchTime(match);
      const timezoneName = this.isUKSummerTime() ? 'BST' : 'GMT';
      
      matchCard.innerHTML = `
        <div class="match-header">
          <div class="match-time">
            <div class="status-indicator ${statusClass}"></div>
            <span class="time-text">${match.time} ${timezoneName}</span>
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
            <span class="vs">${status === 'live' && liveScore ? liveScore : 'vs'}</span>
            <span class="team-b">${match.teamB}</span>
          </div>
          ${status === 'live' && liveTime ? `<div class="live-time">${liveTime} min</div>` : ''}
        </div>
        
        <div class="competition">
          <span class="competition-badge">${match.competition}</span>
          ${match.venue ? `<span class="venue-info" title="Venue">${match.venue}</span>` : ''}
          ${status === 'live' ? '<span class="live-indicator">🔴 LIVE</span>' : ''}
        </div>
      `;

      container.appendChild(matchCard);
    });

    // Update matches count in header
    this.updateMatchesCount(filteredMatches.length, currentMatches.length);
  }

  updateMatchesCount(filteredCount, totalCount) {
    const sectionTitle = document.querySelector('.football-section .section-title');
    if (sectionTitle) {
      const lastFetchText = this.lastFetchTime ? 
        ` (Updated: ${new Date(this.lastFetchTime).toLocaleTimeString('en-GB')})` : '';
      const countText = filteredCount === totalCount ? 
        `(${totalCount})` : `(${filteredCount}/${totalCount})`;
      
      // Count live matches
      const liveCount = filteredCount > 0 ? 
        this.footballMatches.filter(match => this.getMatchStatus(match) === 'live').length : 0;
      const liveText = liveCount > 0 ? ` • ${liveCount} LIVE` : '';
      
      const timezoneName = this.isUKSummerTime() ? 'BST' : 'GMT';
      sectionTitle.textContent = `Today's Football on UK TV ${countText}${liveText} • All times ${timezoneName}${lastFetchText}`;
    }
  }

  renderUFCFights() {
    this.renderMainCard();
    this.renderPrelimCard();
    this.renderEarlyPrelimCard();
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
  
  renderEarlyPrelimCard() {
    const container = document.getElementById('early-prelim-card-fights');
    if (!container) return;

    container.innerHTML = '';
    
    // Skip rendering if no early prelim fights (Fight Night events)
    if (!this.ufcEarlyPrelimCard || this.ufcEarlyPrelimCard.length === 0) {
      return;
    }

    this.ufcEarlyPrelimCard.forEach(fight => {
      const fightCard = document.createElement('div');
      fightCard.className = 'fight-prelim early-prelim';
      
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
    this.renderChannelFilter(); // Update channel filter with new data
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
        this.renderChannelFilter(); // Update channel filter with new data
        
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
        this.renderChannelFilter(); // Update channel filter with new data
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
  updateUFCEvent(mainCard, prelimCard, earlyPrelimCard) {
    if (mainCard) this.ufcMainCard = mainCard;
    if (prelimCard) this.ufcPrelimCard = prelimCard;
    if (earlyPrelimCard) this.ufcEarlyPrelimCard = earlyPrelimCard;
    this.renderUFCFights();
    this.saveMatchData();
  }

  // Channel filtering methods
  extractChannelsFromMatches() {
    const allChannels = new Set();
    
    this.footballMatches.forEach(match => {
      if (match.channels && Array.isArray(match.channels)) {
        match.channels.forEach(channel => {
          if (channel && channel !== 'Check TV Guide' && channel.trim()) {
            allChannels.add(channel.trim());
          }
        });
      } else if (match.channel && match.channel !== 'Check TV Guide') {
        // Split comma-separated channels
        const channels = match.channel.split(',').map(ch => ch.trim());
        channels.forEach(channel => {
          if (channel && channel !== 'Check TV Guide') {
            allChannels.add(channel);
          }
        });
      }
    });
    
    return Array.from(allChannels).sort();
  }

  renderChannelFilter() {
    this.availableChannels = this.extractChannelsFromMatches();
    
    const container = document.getElementById('channel-checkboxes');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.availableChannels.length === 0) {
      container.innerHTML = `
        <div class="no-channels">
          <p>No TV channels found in current matches</p>
        </div>
      `;
      return;
    }
    
    // Initialize all channels as selected on first load
    if (this.selectedChannels.size === 0) {
      this.availableChannels.forEach(channel => {
        this.selectedChannels.add(channel);
      });
      this.showAllChannels = true;
    }
    
    this.availableChannels.forEach(channel => {
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'channel-checkbox';
      
      const isChecked = this.selectedChannels.has(channel);
      if (isChecked) {
        checkboxDiv.classList.add('checked');
      }
      
      checkboxDiv.innerHTML = `
        <input type="checkbox" id="channel-${this.sanitizeId(channel)}" 
               ${isChecked ? 'checked' : ''} 
               onchange="window.sportsApp.toggleChannel('${channel.replace(/'/g, '\\\'')}')">
        <label for="channel-${this.sanitizeId(channel)}">${channel}</label>
      `;
      
      container.appendChild(checkboxDiv);
    });
    
    this.updateFilterStatus();
  }

  sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '_');
  }

  toggleChannel(channel) {
    if (this.selectedChannels.has(channel)) {
      this.selectedChannels.delete(channel);
    } else {
      this.selectedChannels.add(channel);
    }
    
    this.showAllChannels = this.selectedChannels.size === this.availableChannels.length;
    
    // Update the checkbox appearance
    const checkboxDiv = document.getElementById(`channel-${this.sanitizeId(channel)}`).parentElement;
    if (this.selectedChannels.has(channel)) {
      checkboxDiv.classList.add('checked');
    } else {
      checkboxDiv.classList.remove('checked');
    }
    
    // Re-render matches with new filter
    this.renderFootballMatches();
    this.updateFilterStatus();
  }

  selectAllChannels() {
    this.availableChannels.forEach(channel => {
      this.selectedChannels.add(channel);
      const checkbox = document.getElementById(`channel-${this.sanitizeId(channel)}`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.parentElement.classList.add('checked');
      }
    });
    
    this.showAllChannels = true;
    this.renderFootballMatches();
    this.updateFilterStatus();
  }

  clearAllChannels() {
    this.selectedChannels.clear();
    
    this.availableChannels.forEach(channel => {
      const checkbox = document.getElementById(`channel-${this.sanitizeId(channel)}`);
      if (checkbox) {
        checkbox.checked = false;
        checkbox.parentElement.classList.remove('checked');
      }
    });
    
    this.showAllChannels = false;
    this.renderFootballMatches();
    this.updateFilterStatus();
  }

  applyChannelFilter(matches) {
    if (this.showAllChannels || this.selectedChannels.size === 0) {
      return matches;
    }
    
    return matches.filter(match => {
      let matchChannels = [];
      
      if (match.channels && Array.isArray(match.channels)) {
        matchChannels = match.channels;
      } else if (match.channel && match.channel !== 'Check TV Guide') {
        matchChannels = match.channel.split(',').map(ch => ch.trim());
      }
      
      // Check if any of the match's channels are selected
      return matchChannels.some(channel => 
        this.selectedChannels.has(channel.trim())
      );
    });
  }

  updateFilterStatus() {
    const statusElement = document.getElementById('filter-status');
    if (!statusElement) return;
    
    const selectedCount = this.selectedChannels.size;
    const totalChannels = this.availableChannels.length;
    
    if (selectedCount === 0) {
      statusElement.textContent = 'No channels selected - showing no matches';
    } else if (selectedCount === totalChannels) {
      statusElement.textContent = 'Showing all matches';
    } else {
      statusElement.textContent = `Showing matches from ${selectedCount}/${totalChannels} channels`;
    }
    
    // Debug log
    this.debugLog('filtering', `Filter status updated: ${selectedCount}/${totalChannels} channels selected`);
  }

  // Debug system methods
  debugLog(category, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    if (this.debugLogs[category]) {
      this.debugLogs[category].push(logEntry);
      // Keep only last 50 entries per category
      if (this.debugLogs[category].length > 50) {
        this.debugLogs[category] = this.debugLogs[category].slice(-50);
      }
    }
    
    // Update debug UI if visible
    this.updateDebugDisplay(category);
    
    // Console log for immediate debugging
    console.log(`[${category.toUpperCase()}] ${message}`, data || '');
  }

  updateDebugDisplay(category) {
    const contentElement = document.getElementById(`debug-${category}-content`);
    if (!contentElement) return;
    
    const logs = this.debugLogs[category] || [];
    if (logs.length === 0) {
      contentElement.textContent = `No ${category} activity yet...`;
      return;
    }
    
    const html = logs.map(log => {
      const dataHtml = log.data ? `<div class="debug-data">${log.data}</div>` : '';
      return `
        <div class="debug-entry">
          <div class="debug-timestamp">[${log.timestamp}]</div>
          <div class="debug-message">${log.message}</div>
          ${dataHtml}
        </div>
      `;
    }).join('');
    
    contentElement.innerHTML = html;
    // Auto-scroll to bottom
    contentElement.scrollTop = contentElement.scrollHeight;
  }

  toggleDebugWindow() {
    const debugSection = document.getElementById('debug-section');
    const toggleBtn = document.getElementById('debug-toggle');
    
    if (!debugSection || !toggleBtn) return;
    
    this.debugVisible = !this.debugVisible;
    
    if (this.debugVisible) {
      debugSection.classList.remove('hidden');
      toggleBtn.textContent = 'Hide Debug';
    } else {
      debugSection.classList.add('hidden');
      toggleBtn.textContent = 'Show Debug';
    }
    
    this.debugLog('display', `Debug window ${this.debugVisible ? 'shown' : 'hidden'}`);
  }

  showDebugTab(tabName) {
    // Hide all panels
    document.querySelectorAll('.debug-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    // Hide all tabs
    document.querySelectorAll('.debug-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show selected panel and tab
    const panel = document.getElementById(`debug-${tabName}`);
    const tab = document.querySelector(`[onclick="window.sportsApp.showDebugTab('${tabName}')"]`);
    
    if (panel) panel.classList.add('active');
    if (tab) tab.classList.add('active');
    
    // Update the display for this category
    this.updateDebugDisplay(tabName);
    
    this.debugLog('display', `Switched to debug tab: ${tabName}`);
  }

  clearDebugLog() {
    Object.keys(this.debugLogs).forEach(category => {
      this.debugLogs[category] = [];
      this.updateDebugDisplay(category);
    });
    
    console.log('🧹 Debug logs cleared');
  }

  initDebugWindow() {
    // Initialize debug window with initial state
    this.debugLog('display', 'Debug system initialized');
    this.debugLog('data', 'Football matches loaded', { count: this.footballMatches.length });
    this.debugLog('data', 'Available channels extracted', { channels: this.availableChannels });
    
    // Show initial debug tab
    this.showDebugTab('requests');
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
