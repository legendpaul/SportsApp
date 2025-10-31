// Sports App JavaScript - STANDARDIZED VERSION with ALL features
// Includes: IGNORE matches, Traffic Light states, Data management, Enhanced debugging, Tapology scraper
const { ipcRenderer } = require('electron');

class SportsApp {
  constructor() {
    this.version = '3.0.0'; // Standardized version
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
    this.shouldAutoFetchOnStartup = true;
    this.availableChannels = [];
    this.selectedChannels = new Set();
    this.showAllChannels = true;
    this.debugVisible = true;
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
      this.debugLog('data', `Initializing data manager and fetchers (v${this.version})...`);
      
      const MatchFetcher = require('./matchFetcher');
      const UFCFetcher = require('./ufcFetcher');
      
      this.matchFetcher = new MatchFetcher((category, message, data) => {
        this.debugLog(category, message, data);
      });
      this.ufcFetcher = new UFCFetcher();
      
      this.debugLog('data', 'Fetchers initialized successfully');
      
      await this.loadMatchData();
      
      if (this.shouldAutoFetchOnStartup) {
        await this.autoFetchOnStartup();
      }
    } catch (error) {
      this.debugLog('data', `Failed to initialize data manager: ${error.message}`);
      console.error('Failed to initialize data manager:', error);
      this.loadFallbackData();
    }
  }

  async autoFetchOnStartup() {
    try {
      this.debugLog('requests', 'Auto-fetching sports data on startup...');
      
      const shouldFetchFootball = this.shouldAutoFetch('football');
      const shouldFetchUFC = this.shouldAutoFetch('ufc');
      
      if (shouldFetchFootball || shouldFetchUFC) {
        this.debugLog('requests', 'Fetching fresh sports data...');
        this.showStartupFetchingState();
        
        let footballResult = { success: true, added: 0 };
        let ufcResult = { success: true, added: 0 };
        
        if (shouldFetchFootball) {
          try {
            footballResult = await this.matchFetcher.updateMatchData();
            this.debugLog('requests', `Football fetch result: ${footballResult.success ? 'Success' : 'Failed'} - ${footballResult.added} new matches`);
          } catch (error) {
            this.debugLog('requests', `Football fetch error: ${error.message}`);
            footballResult = { success: false, error: error.message };
          }
        }
        
        if (shouldFetchUFC) {
          try {
            ufcResult = await this.ufcFetcher.updateUFCData();
            this.debugLog('requests', `UFC fetch result: ${ufcResult.success ? 'Success' : 'Failed'} - ${ufcResult.added} new events`);
          } catch (error) {
            this.debugLog('requests', `UFC fetch error: ${error.message}`);
            ufcResult = { success: false, error: error.message };
          }
        }
        
        const totalNew = (footballResult.added || 0) + (ufcResult.added || 0);
        if (totalNew > 0) {
          await this.loadMatchData();
          this.showStartupFetchResult(`📥 Found ${footballResult.added || 0} football matches, ${ufcResult.added || 0} UFC events!`);
        } else if (footballResult.success || ufcResult.success) {
          this.showStartupFetchResult('✅ Sports data is up to date');
        } else {
          this.showStartupFetchResult('⚠️ Using cached sports data');
        }
        
        await this.startupCleanup();
      } else {
        this.debugLog('requests', 'Skipping startup fetch (data is recent)');
      }
    } catch (error) {
      this.debugLog('requests', `Error during startup fetch: ${error.message}`);
      this.showStartupFetchResult('⚠️ Using cached data');
    }
  }

  shouldAutoFetch(type) {
    const lastFetch = type === 'football' ? this.lastFetchTime : this.lastUFCFetch;
    
    if (!lastFetch) {
      return true;
    }

    const lastFetchDate = new Date(lastFetch);
    const now = new Date();
    const hoursSinceLastFetch = (now - lastFetchDate) / (1000 * 60 * 60);

    return hoursSinceLastFetch > 2;
  }

  async startupCleanup() {
    try {
      this.debugLog('data', 'Running startup cleanup...');
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const result = dataManager.cleanupOldMatches();
      
      if (result.success && result.removedCount > 0) {
        this.debugLog('data', `Startup cleanup: Removed ${result.removedCount} old events`);
        await this.loadMatchData();
      }
    } catch (error) {
      this.debugLog('data', `Error during startup cleanup: ${error.message}`);
    }
  }

  showStartupFetchingState() {
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
    const loading = document.getElementById('startup-loading');
    if (loading) {
      loading.innerHTML = `<span>${message}</span>`;
      loading.className = 'startup-result';
      
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
        
        // Load matches with traffic light and ignored states
        this.footballMatches = (data.footballMatches || []).map(match => ({
          ...match,
          trafficLightState: match.trafficLightState || 0,
          ignored: match.ignored || false
        }));
        
        this.ufcEvents = data.ufcEvents || [];
        this.lastFetchTime = data.lastFetch || null;
        this.lastUFCFetch = data.lastUFCFetch || null;
        
        this.debugLog('data', `Loaded data from file: ${this.footballMatches.length} football matches, ${this.ufcEvents.length} UFC events`);
        
        if (this.ufcEvents && this.ufcEvents.length > 0) {
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
        
        if (this.ufcMainCard.length === 0) {
          this.debugLog('data', 'No UFC events loaded - real data required');
          this.showNoUFCDataMessage();
        }
        
        console.log(`📊 Loaded ${this.footballMatches.length} football matches and ${this.ufcEvents.length} UFC events`);
      } else {
        this.debugLog('data', 'No data file found, using fallback data');
        this.loadFallbackData();
      }
    } catch (error) {
      this.debugLog('data', `Error loading match data: ${error.message}`);
      this.loadFallbackData();
    }
  }

  loadFallbackData() {
    this.footballMatches = [
      {
        id: "fallback_001",
        time: "13:00",
        teamA: "Manchester City",
        teamB: "Arsenal",
        competition: "Premier League",
        channel: "Sky Sports Premier League, Sky Sports Main Event",
        channels: ["Sky Sports Premier League", "Sky Sports Main Event"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0],
        apiSource: 'fallback',
        trafficLightState: 0,
        ignored: false
      },
      {
        id: "fallback_002",
        time: "15:30",
        teamA: "Liverpool",
        teamB: "Chelsea",
        competition: "Premier League",
        channel: "BBC One, BBC iPlayer",
        channels: ["BBC One", "BBC iPlayer"],
        status: "upcoming",
        createdAt: new Date().toISOString(),
        matchDate: new Date().toISOString().split('T')[0],
        apiSource: 'fallback',
        trafficLightState: 0,
        ignored: false
      }
    ];

    this.showNoUFCDataMessage();
    this.debugLog('data', 'Using enhanced fallback data - UFC data requires real fetch');
  }

  showNoUFCDataMessage() {
    const ufcTitle = document.querySelector('.ufc-title');
    if (ufcTitle) {
      ufcTitle.textContent = 'No UFC Events - Real Data Required';
    }
    
    const mainCardContainer = document.getElementById('main-card-fights');
    if (mainCardContainer) {
      mainCardContainer.innerHTML = `
        <div class="no-ufc-data">
          <div class="no-ufc-icon">🥊</div>
          <div class="no-ufc-text">No UFC event data available</div>
          <div class="no-ufc-subtext">
            Real UFC data must be fetched from official sources
            <br>
            <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn">
              📥 Fetch Real UFC Data
            </button>
          </div>
        </div>
      `;
    }
    
    const prelimContainer = document.getElementById('prelim-card-fights');
    if (prelimContainer) {
      prelimContainer.innerHTML = '';
    }
    
    const earlyPrelimContainer = document.getElementById('early-prelim-card-fights');
    if (earlyPrelimContainer) {
      earlyPrelimContainer.innerHTML = '';
    }
  }

  init() {
    this.debugLog('display', `Initializing Sports App v${this.version}...`);
    
    this.updateClock();
    this.renderFootballMatches();
    this.renderUFCFights();
    this.renderChannelFilter();
    this.addFetchButton();
    this.addDataManagementButtons(); // NEW: Data management
    this.initDebugWindow();
    
    setInterval(() => this.updateClock(), 1000);
    setInterval(() => this.updateMatchStatuses(), 60000);
    setInterval(() => this.autoRefreshIfNeeded(), 2 * 60 * 60 * 1000);
    
    this.debugLog('display', `Sports App v${this.version} initialized successfully!`);
    console.log(`🚀 Sports App v${this.version} initialized successfully!`);
  }

  async autoRefreshIfNeeded() {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 8 && hour <= 23) {
      this.debugLog('requests', 'Auto-refreshing sports data (2-hour interval)');
      await this.fetchNewSportsData();
    }
  }

  addFetchButton() {
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
        <button onclick="window.sportsApp.toggleIgnoredMatchesView()" id="view-ignored-btn" class="view-ignored-btn" title="View your ignored matches" style="display: none;">
          📦 View Ignored (0)
        </button>
        <div class="auto-fetch-indicator" title="Auto-fetches football & UFC on startup">
          🔄 Auto-fetch: ON
        </div>
      `;
      header.appendChild(controls);
      
      // Update the button state based on ignored matches count
      this.updateIgnoredMatchesButton();
    }
  }

  // NEW: Data management buttons for export/import
  addDataManagementButtons() {
    const footer = document.querySelector('.footer');
    if (footer && !document.getElementById('data-management')) {
      const dataControls = document.createElement('div');
      dataControls.id = 'data-management';
      dataControls.className = 'data-management';
      dataControls.innerHTML = `
        <div class="data-management-controls">
          <button onclick="window.sportsApp.exportData()" class="data-btn" title="Export your sports data">
            💾 Export Data
          </button>
          <input type="file" id="import-file" accept=".json" style="display: none;" onchange="window.sportsApp.importData(event)">
          <button onclick="document.getElementById('import-file').click()" class="data-btn" title="Import sports data">
            📁 Import Data
          </button>
          <button onclick="window.sportsApp.clearAllData()" class="data-btn clear-data" title="Clear all stored data">
            🗑️ Clear All Data
          </button>
          <span class="storage-info" id="storage-info">Storage: Loading...</span>
        </div>
      `;
      footer.appendChild(dataControls);
      
      this.updateStorageInfo();
    }
  }

  updateStorageInfo() {
    const storageInfo = document.getElementById('storage-info');
    if (storageInfo) {
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(__dirname, 'data', 'matches.json');
      
      try {
        if (fs.existsSync(dataFile)) {
          const stats = fs.statSync(dataFile);
          const kb = Math.round(stats.size / 1024 * 100) / 100;
          storageInfo.textContent = `Storage: ${kb} KB | ${this.footballMatches.length} matches, ${this.ufcEvents.length} events`;
        } else {
          storageInfo.textContent = 'Storage: No data file';
        }
      } catch (error) {
        storageInfo.textContent = 'Storage: Unknown';
      }
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
      const timeDiff = now - matchDateTime;
      if (timeDiff > 2 * 60 * 60 * 1000) {
        return "finished";
      }
      return "live";
    } else {
      const timeDiff = matchDateTime - now;
      if (timeDiff <= 30 * 60 * 1000) {
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
    this.debugLog('display', 'Rendering football matches...');
    
    const container = document.getElementById('football-matches');
    if (!container) {
      this.debugLog('display', 'ERROR: football-matches container not found');
      return;
    }

    container.innerHTML = '';

    // Filter out old AND ignored matches
    const currentMatches = this.footballMatches.filter(match => {
      const matchDateTime = this.getMatchDateTime(match);
      const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000));
      return matchDateTime > threeHoursAgo && !match.ignored; // NEW: Check ignored flag
    });
    
    this.debugLog('filtering', `Filtered matches: ${this.footballMatches.length} total -> ${currentMatches.length} current (non-ignored)`);

    const filteredMatches = this.applyChannelFilter(currentMatches);
    
    this.debugLog('filtering', `Applied channel filter: ${currentMatches.length} current -> ${filteredMatches.length} after channel filter`);

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

    if (filteredMatches.length === 0 && currentMatches.length > 0) {
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

    this.debugLog('display', `Rendering ${filteredMatches.length} football match cards`);

    filteredMatches.forEach(match => {
      const status = this.getMatchStatus(match);
      const statusClass = this.getStatusClass(status);
      const isApiMatch = match.apiSource ? '🌐' : '✏️';

      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.setAttribute('data-match-id', match.id);
      
      // NEW: Apply traffic light styling
      if (match.trafficLightState === 1) {
        matchCard.classList.add('traffic-light-green');
      } else if (match.trafficLightState === 2) {
        matchCard.classList.add('traffic-light-red');
      }
      
      matchCard.innerHTML = `
        <div class="match-header">
          <div class="match-time">
            <div class="status-indicator ${statusClass}"></div>
            <span class="time-text">${match.time}</span>
            <span class="match-source" title="${match.apiSource ? 'From live-footballontv.com' : 'Fallback data'}">${isApiMatch}</span>
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
        <div class="match-actions">
          <button class="ignore-btn">Ignore</button>
        </div>
      `;

      // NEW: Click handler for traffic light toggle
      matchCard.addEventListener('click', (e) => {
        if (e.target.classList.contains('ignore-btn')) {
          return; // Don't trigger traffic light on ignore button click
        }
        this.onMatchCardClick(match.id);
      });

      // NEW: Ignore button handler
      const ignoreBtn = matchCard.querySelector('.ignore-btn');
      ignoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onIgnoreButtonClick(match.id);
      });

      container.appendChild(matchCard);
    });

    this.updateMatchesCount(filteredMatches.length, currentMatches.length);
  }

  // NEW: Traffic light click handler
  onMatchCardClick(matchId) {
    const match = this.footballMatches.find(m => m.id === matchId);
    if (!match) return;

    // Cycle through states: 0 -> 1 -> 2 -> 0
    const currentState = match.trafficLightState || 0;
    const nextState = (currentState + 1) % 3;

    // Update local data
    match.trafficLightState = nextState;

    // Update persisted data
    const DataManager = require('./dataManager');
    const dataManager = new DataManager();
    dataManager.updateMatchTrafficLightState(matchId, nextState);

    // Update the UI
    this.renderFootballMatches();
    
    this.debugLog('filtering', `Traffic light toggled for match ${matchId}: ${currentState} -> ${nextState}`);
  }

  // NEW: Ignore button handler
  onIgnoreButtonClick(matchId) {
    const match = this.footballMatches.find(m => m.id === matchId);
    if (!match) return;

    if (confirm(`Hide "${match.teamA} vs ${match.teamB}"?\n\nThis match will be hidden from your view.`)) {
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      dataManager.ignoreMatch(matchId);
      
      match.ignored = true;
      
      this.renderFootballMatches();
      this.updateIgnoredMatchesButton();
      this.showFetchResult(`✅ Match hidden: ${match.teamA} vs ${match.teamB}`);
      
      this.debugLog('filtering', `Match ignored: ${matchId}`);
    }
  }

  // NEW: View ignored matches functionality
  toggleIgnoredMatchesView() {
    const section = document.getElementById('ignored-matches-section');
    if (!section) {
      this.showIgnoredMatches();
    } else {
      this.hideIgnoredMatches();
    }
  }

  showIgnoredMatches() {
    const DataManager = require('./dataManager');
    const dataManager = new DataManager();
    const ignoredMatches = dataManager.getIgnoredMatches();

    const container = document.getElementById('football-matches');
    if (!container) return;

    let section = document.getElementById('ignored-matches-section');
    if (section) {
      section.remove();
    }

    section = document.createElement('div');
    section.id = 'ignored-matches-section';
    section.className = 'ignored-matches-section';

    if (ignoredMatches.length === 0) {
      section.innerHTML = `
        <div class="ignored-header">
          <h3>📦 Ignored Matches</h3>
          <button onclick="window.sportsApp.toggleIgnoredMatchesView()" class="close-ignored-btn">×</button>
        </div>
        <div class="no-ignored-matches">
          <p>No ignored matches</p>
        </div>
      `;
    } else {
      section.innerHTML = `
        <div class="ignored-header">
          <h3>📦 Ignored Matches (${ignoredMatches.length})</h3>
          <button onclick="window.sportsApp.toggleIgnoredMatchesView()" class="close-ignored-btn">×</button>
        </div>
        <div id="ignored-matches-list"></div>
      `;

      const listContainer = section.querySelector('#ignored-matches-list');
      ignoredMatches.forEach(match => {
        const matchCard = document.createElement('div');
        matchCard.className = 'match-card ignored-match-card';
        matchCard.innerHTML = `
          <div class="match-header">
            <div class="match-time">
              <span class="time-text">${match.time}</span>
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
          </div>
          <div class="match-actions">
            <button class="restore-btn" onclick="window.sportsApp.restoreMatch('${match.id}')">Restore</button>
          </div>
        `;
        listContainer.appendChild(matchCard);
      });
    }

    container.parentNode.insertBefore(section, container.nextSibling);
    this.updateIgnoredMatchesButton();
  }

  hideIgnoredMatches() {
    const section = document.getElementById('ignored-matches-section');
    if (section) {
      section.remove();
    }
    this.updateIgnoredMatchesButton();
  }

  restoreMatch(matchId) {
    const DataManager = require('./dataManager');
    const dataManager = new DataManager();
    dataManager.unignoreMatch(matchId);

    const match = this.footballMatches.find(m => m.id === matchId);
    if (match) {
      match.ignored = false;
    }

    this.renderFootballMatches();
    this.showIgnoredMatches();
    this.showFetchResult(`✅ Match restored: ${match.teamA} vs ${match.teamB}`);
    this.debugLog('filtering', `Match restored: ${matchId}`);
  }

  updateIgnoredMatchesButton() {
    const DataManager = require('./dataManager');
    const dataManager = new DataManager();
    const ignoredMatches = dataManager.getIgnoredMatches();
    const count = ignoredMatches.length;

    const existingBtn = document.getElementById('view-ignored-btn');
    if (existingBtn) {
      const section = document.getElementById('ignored-matches-section');
      existingBtn.textContent = section ? '✖ Close Ignored' : `📦 View Ignored (${count})`;
      existingBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  updateMatchesCount(filteredCount, totalCount) {
    const sectionTitle = document.querySelector('.football-section .section-title');
    if (sectionTitle) {
      const lastFetchText = this.lastFetchTime ? 
        ` (Updated: ${new Date(this.lastFetchTime).toLocaleTimeString('en-GB')})` : '';
      const countText = filteredCount === totalCount ? 
        `(${totalCount})` : `(${filteredCount}/${totalCount})`;
      sectionTitle.textContent = `Today's Football on UK TV ${countText}${lastFetchText}`;
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
      const upcomingEvent = this.ufcEvents.find(event => 
        new Date(event.ukDateTime || event.date) > new Date()
      );
      
      if (upcomingEvent) {
        ufcTitle.textContent = upcomingEvent.title;
        
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
        
        this.updateUFCTiming(upcomingEvent);
        
        const lastUFCFetchText = this.lastUFCFetch ? 
          ` (Updated: ${new Date(this.lastUFCFetch).toLocaleTimeString('en-GB')})` : '';
        
        let statusIndicator = '';
        if (upcomingEvent.apiSource === 'ufc_official_website_direct') {
          const hasData = (upcomingEvent.mainCard && upcomingEvent.mainCard.length > 0);
          statusIndicator = hasData ? ' 🌐✅' : ' 🌐⏳';
        } else if (upcomingEvent.apiSource === 'tapology_321_scraper') {
          statusIndicator = ' 🔍✅'; // Tapology source
        } else {
          statusIndicator = ' ✏️';
        }
        
        ufcTitle.textContent += statusIndicator + lastUFCFetchText;
      }
    } else if (ufcTitle) {
      ufcTitle.textContent = 'No UFC Events - Real Data Required 📥';
    }
  }

  updateUFCTiming(event) {
    const ukTimesSection = document.querySelector('.uk-times');
    if (!ukTimesSection) return;
    
    this.debugLog('display', 'Updating UFC timing display', { event });
    
    const formatUKTime = (dateString, fallbackHour = '18:00') => {
      if (!dateString) return fallbackHour;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return fallbackHour;
        return date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } catch (error) {
        return fallbackHour;
      }
    };
    
    const formatUKDay = (dateString, fallbackDay = 'Sat') => {
      if (!dateString) return fallbackDay;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return fallbackDay;
        return date.toLocaleDateString('en-GB', { weekday: 'short' });
      } catch (error) {
        return fallbackDay;
      }
    };
    
    const getEventTimes = (event) => {
      const baseChannel = event.broadcast || 'TNT Sports 1';
      
      let prelimsTime, prelimsDay, mainCardTime, mainCardDay;
      
      if (event.ukPrelimTimeStr && event.ukMainCardTimeStr) {
        prelimsTime = event.ukPrelimTimeStr;
        prelimsDay = formatUKDay(event.prelimUTCDate, 'Sat');
        mainCardTime = event.ukMainCardTimeStr;
        mainCardDay = formatUKDay(event.mainCardUTCDate, 'Sat');
      } else if (event.prelimUTCDate && event.mainCardUTCDate) {
        prelimsTime = formatUKTime(event.prelimUTCDate.toISOString(), '18:00');
        prelimsDay = formatUKDay(event.prelimUTCDate.toISOString(), 'Sat');
        mainCardTime = formatUKTime(event.mainCardUTCDate.toISOString(), '20:00');
        mainCardDay = formatUKDay(event.mainCardUTCDate.toISOString(), 'Sat');
      } else {
        prelimsTime = 'TBD';
        prelimsDay = 'TBD';
        mainCardTime = 'TBD';
        mainCardDay = 'TBD';
      }
      
      return { prelimsTime, prelimsDay, mainCardTime, mainCardDay, channel: baseChannel };
    };
    
    const times = getEventTimes(event);
    
    const timesTitle = ukTimesSection.querySelector('.times-title');
    if (timesTitle) {
      const eventTypeDisplay = (event.ufcNumber ? `UFC ${event.ufcNumber}` : event.title || 'UFC Event').toUpperCase();
      timesTitle.textContent = `UK Start Times (${eventTypeDisplay} - REAL DATA)`;
    }
    
    const timesGrid = ukTimesSection.querySelector('.times-grid');
    if (timesGrid) {
      timesGrid.innerHTML = `
        ${event.ukEarlyPrelimTimeStr ? `
        <div class="time-slot early-prelims">
          <div class="time-label">Early Prelims</div>
          <div class="time-value">${event.ukEarlyPrelimTimeStr} - ${times.channel}</div>
          <div class="time-note">📡 From Official UFC Data</div>
        </div>
        ` : ''}
        <div class="time-slot prelims">
          <div class="time-label">Prelims</div>
          <div class="time-value">${times.prelimsTime} (${times.prelimsDay}) - ${times.channel}</div>
          <div class="time-note">📡 From Official UFC Data</div>
        </div>
        <div class="time-slot main-card">
          <div class="time-label">Main Card</div>
          <div class="time-value">${times.mainCardTime} (${times.mainCardDay}) - ${times.channel}</div>
          <div class="time-note">📡 From Official UFC Data</div>
        </div>
      `;
    }
  }

  renderMainCard() {
    const container = document.getElementById('main-card-fights');
    if (!container) return;

    container.innerHTML = '';

    if (this.ufcMainCard.length === 0) {
      if (this.ufcEvents && this.ufcEvents.length > 0) {
        const upcomingEvent = this.ufcEvents.find(event => 
          new Date(event.ukDateTime || event.date) > new Date()
        );
        
        if (upcomingEvent && upcomingEvent.apiSource) {
          container.innerHTML = `
            <div class="ufc-event-confirmed">
              <div class="ufc-confirmed-icon">✅</div>
              <div class="ufc-confirmed-text">UFC Event Confirmed</div>
              <div class="ufc-confirmed-details">
                <strong>${upcomingEvent.title}</strong><br>
                ${upcomingEvent.venue || upcomingEvent.location || 'Venue TBD'}<br>
                Fight card details will be added closer to event date
              </div>
            </div>
          `;
          return;
        }
      }
      
      container.innerHTML = `
        <div class="no-ufc-data">
          <div class="no-ufc-icon">🥊</div>
          <div class="no-ufc-text">No UFC events found</div>
          <div class="no-ufc-subtext">
            Real UFC data must be fetched from official sources
            <br>
            <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn">
              📥 Fetch Real UFC Data
            </button>
          </div>
        </div>
      `;
      return;
    }

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

    if (this.ufcPrelimCard.length === 0) return;

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
    
    if (!this.ufcEarlyPrelimCard || this.ufcEarlyPrelimCard.length === 0) return;

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
    await this.loadMatchData();
    this.renderFootballMatches();
    this.renderUFCFights();
    this.renderChannelFilter();
    this.updateStorageInfo();
    this.debugLog('display', 'Sports data statuses updated');
  }

  async fetchNewSportsData() {
    try {
      this.debugLog('requests', 'Fetching new sports data...');
      
      this.showFetchingState(true);
      
      if (!this.matchFetcher) {
        const MatchFetcher = require('./matchFetcher');
        this.matchFetcher = new MatchFetcher((category, message, data) => {
          this.debugLog(category, message, data);
        });
      }
      
      if (!this.ufcFetcher) {
        const UFCFetcher = require('./ufcFetcher');
        this.ufcFetcher = new UFCFetcher();
      }
      
      const [footballResult, ufcResult] = await Promise.all([
        this.matchFetcher.updateMatchData().catch(e => ({ success: false, error: e.message })),
        this.ufcFetcher.updateUFCData().catch(e => ({ success: false, error: e.message }))
      ]);
      
      this.debugLog('requests', 'Fetch results received', { footballResult, ufcResult });
      
      const totalNew = (footballResult.added || 0) + (ufcResult.added || 0);
      
      if (totalNew > 0) {
        if (footballResult.success) this.lastFetchTime = new Date().toISOString();
        if (ufcResult.success) this.lastUFCFetch = new Date().toISOString();
        
        await this.loadMatchData();
        this.renderFootballMatches();
        this.renderUFCFights();
        this.renderChannelFilter();
        this.updateStorageInfo();
        
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
      this.debugLog('requests', `Error fetching sports data: ${error.message}`);
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
    const notification = document.createElement('div');
    notification.className = 'fetch-notification';
    notification.textContent = message;
    
    const header = document.querySelector('.header-content');
    if (header) {
      header.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 4000);
    }
  }

  async manualCleanup() {
    try {
      this.debugLog('data', 'Running manual cleanup...');
      
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();
      const result = dataManager.cleanupOldMatches();
      
      if (result.success) {
        this.debugLog('data', `Manual cleanup completed: Removed ${result.removedCount} old events`);
        this.showFetchResult(`🧹 Removed ${result.removedCount} old events`);
        
        await this.loadMatchData();
        this.renderFootballMatches();
        this.renderUFCFights();
        this.renderChannelFilter();
        this.updateStorageInfo();
      } else {
        this.showFetchResult(`❌ Cleanup failed`);
      }
      
      return result;
    } catch (error) {
      this.debugLog('data', `Error during manual cleanup: ${error.message}`);
      this.showFetchResult(`❌ Cleanup error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // NEW: Data management methods
  exportData() {
    try {
      this.debugLog('data', 'Exporting sports data...');
      
      const fs = require('fs');
      const path = require('path');
      const { dialog } = require('electron').remote || require('@electron/remote');
      
      const data = {
        footballMatches: this.footballMatches,
        ufcEvents: this.ufcEvents,
        lastFetch: this.lastFetchTime,
        lastUFCFetch: this.lastUFCFetch,
        exportedAt: new Date().toISOString(),
        version: this.version
      };
      
      const defaultPath = path.join(
        require('os').homedir(), 
        'Downloads',
        `sports-app-data-${new Date().toISOString().split('T')[0]}.json`
      );
      
      const filePath = dialog.showSaveDialogSync({
        title: 'Export Sports Data',
        defaultPath: defaultPath,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        this.showFetchResult('💾 Data exported successfully!');
        this.debugLog('data', `Data exported to: ${filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.debugLog('data', `Error exporting data: ${error.message}`);
      this.showFetchResult(`❌ Export error: ${error.message}`);
      return false;
    }
  }

  async importData(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      this.debugLog('data', `Importing data from file: ${file.name}`);
      
      const fs = require('fs');
      const path = require('path');
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          if (!importData.footballMatches || !Array.isArray(importData.footballMatches)) {
            throw new Error('Invalid data format: missing footballMatches array');
          }
          
          if (!importData.ufcEvents || !Array.isArray(importData.ufcEvents)) {
            throw new Error('Invalid data format: missing ufcEvents array');
          }
          
          const DataManager = require('./dataManager');
          const dataManager = new DataManager();
          
          const saved = dataManager.saveData({
            footballMatches: importData.footballMatches,
            ufcEvents: importData.ufcEvents,
            lastCleanup: null,
            lastFetch: importData.lastFetch || null,
            lastUFCFetch: importData.lastUFCFetch || null
          });
          
          if (saved) {
            this.showFetchResult(`📁 Imported ${importData.footballMatches.length} matches, ${importData.ufcEvents.length} events!`);
            this.debugLog('data', 'Data import completed successfully');
            
            await this.loadMatchData();
            this.renderFootballMatches();
            this.renderUFCFights();
            this.renderChannelFilter();
            this.updateStorageInfo();
          } else {
            throw new Error('Failed to save imported data');
          }
        } catch (parseError) {
          this.debugLog('data', `Error parsing import file: ${parseError.message}`);
          this.showFetchResult(`❌ Import failed: ${parseError.message}`);
        }
      };
      
      reader.readAsText(file);
      event.target.value = '';
      
    } catch (error) {
      this.debugLog('data', `Error importing data: ${error.message}`);
      this.showFetchResult(`❌ Import error: ${error.message}`);
      event.target.value = '';
    }
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear ALL stored sports data? This cannot be undone.')) {
      try {
        this.debugLog('data', 'Clearing all stored data...');
        
        const DataManager = require('./dataManager');
        const dataManager = new DataManager();
        const success = dataManager.clearAllData();
        
        if (success) {
          this.showFetchResult('🗑️ All data cleared successfully!');
          this.debugLog('data', 'All data cleared');
          
          this.footballMatches = [];
          this.ufcEvents = [];
          this.lastFetchTime = null;
          this.lastUFCFetch = null;
          
          this.loadFallbackData();
          this.renderFootballMatches();
          this.renderUFCFights();
          this.renderChannelFilter();
          this.updateStorageInfo();
        } else {
          this.showFetchResult('❌ Failed to clear data');
        }
      } catch (error) {
        this.debugLog('data', `Error clearing data: ${error.message}`);
        this.showFetchResult(`❌ Clear error: ${error.message}`);
      }
    }
  }

  addFootballMatch(match) {
    const newMatch = {
      ...match,
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      matchDate: match.matchDate || new Date().toISOString().split('T')[0],
      trafficLightState: 0,
      ignored: false
    };
    
    this.footballMatches.push(newMatch);
    this.renderFootballMatches();
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
      this.debugLog('data', 'Sports data saved successfully');
      this.updateStorageInfo();
    } catch (error) {
      this.debugLog('data', `Error saving sports data: ${error.message}`);
    }
  }

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
    this.debugLog('display', 'Rendering channel filter...');
    
    this.availableChannels = this.extractChannelsFromMatches();
    this.debugLog('data', `Extracted ${this.availableChannels.length} unique channels`);
    
    const container = document.getElementById('channel-checkboxes');
    if (!container) {
      this.debugLog('display', 'ERROR: channel-checkboxes container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (this.availableChannels.length === 0) {
      container.innerHTML = `
        <div class="no-channels">
          <p>No TV channels found in current matches</p>
        </div>
      `;
      return;
    }
    
    if (this.selectedChannels.size === 0) {
      this.availableChannels.forEach(channel => {
        this.selectedChannels.add(channel);
      });
      this.showAllChannels = true;
      this.debugLog('filtering', 'Initialized all channels as selected');
    }
    
    this.availableChannels.forEach(channel => {
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'channel-checkbox';
      
      const isChecked = this.selectedChannels.has(channel);
      if (isChecked) {
        checkboxDiv.classList.add('checked');
      }
      
      const safeChannelName = channel.replace(/'/g, "\\'");
      
      checkboxDiv.innerHTML = `
        <input type="checkbox" id="channel-${this.sanitizeId(channel)}" 
               ${isChecked ? 'checked' : ''} 
               onchange="window.sportsApp.toggleChannel('${safeChannelName}')">
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
    this.debugLog('filtering', `Toggling channel: ${channel}`);
    
    if (this.selectedChannels.has(channel)) {
      this.selectedChannels.delete(channel);
    } else {
      this.selectedChannels.add(channel);
    }
    
    this.showAllChannels = this.selectedChannels.size === this.availableChannels.length;
    
    const checkboxDiv = document.getElementById(`channel-${this.sanitizeId(channel)}`).parentElement;
    if (this.selectedChannels.has(channel)) {
      checkboxDiv.classList.add('checked');
    } else {
      checkboxDiv.classList.remove('checked');
    }
    
    this.renderFootballMatches();
    this.updateFilterStatus();
  }

  selectAllChannels() {
    this.debugLog('filtering', 'Selecting all channels');
    
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
    this.debugLog('filtering', 'Clearing all channels');
    
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
      if (this.debugLogs[category].length > 50) {
        this.debugLogs[category] = this.debugLogs[category].slice(-50);
      }
    }
    
    this.updateDebugDisplay(category);
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
  }

  showDebugTab(tabName) {
    document.querySelectorAll('.debug-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    document.querySelectorAll('.debug-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const panel = document.getElementById(`debug-${tabName}`);
    const tab = document.querySelector(`[onclick="window.sportsApp.showDebugTab('${tabName}')"]`);
    
    if (panel) panel.classList.add('active');
    if (tab) tab.classList.add('active');
    
    this.updateDebugDisplay(tabName);
  }

  clearDebugLog() {
    Object.keys(this.debugLogs).forEach(category => {
      this.debugLogs[category] = [];
      this.updateDebugDisplay(category);
    });
    
    console.log('🧹 Debug logs cleared');
  }

  // NEW: Enhanced debug methods from web version
  generateComprehensiveDebugReport() {
    const report = [];
    report.push('=== UK Sports TV Guide - Debug Report ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`App Version: ${this.version}`);
    report.push(`Environment: Electron Desktop App`);
    report.push('');

    report.push('=== FOOTBALL MATCHES ===');
    report.push(`Total matches: ${this.footballMatches.length}`);
    report.push(`Last fetch: ${this.lastFetchTime || 'Never'}`);
    report.push(`Available channels: ${this.availableChannels.length}`);
    report.push(`Selected channels: ${this.selectedChannels.size}`);
    report.push('');

    report.push('=== UFC EVENTS ===');
    report.push(`Total UFC events: ${this.ufcEvents.length}`);
    report.push(`Last UFC fetch: ${this.lastUFCFetch || 'Never'}`);
    report.push(`Main card fights: ${this.ufcMainCard.length}`);
    report.push(`Prelim fights: ${this.ufcPrelimCard.length}`);
    report.push('');

    Object.keys(this.debugLogs).forEach(category => {
      report.push(`=== ${category.toUpperCase()} LOGS ===`);
      const logs = this.debugLogs[category] || [];
      if (logs.length === 0) {
        report.push('No logs available');
      } else {
        logs.slice(-10).forEach(log => {
          report.push(`[${log.timestamp}] ${log.message}`);
          if (log.data) {
            report.push(`Data: ${log.data}`);
          }
        });
      }
      report.push('');
    });

    return report.join('\n');
  }

  copyDebugToClipboard() {
    try {
      const { clipboard } = require('electron');
      const debugContent = this.generateComprehensiveDebugReport();
      clipboard.writeText(debugContent);
      this.showFetchResult('✅ Debug logs copied to clipboard!');
      this.debugLog('display', 'Debug logs copied to clipboard');
    } catch (error) {
      this.debugLog('display', `Error copying to clipboard: ${error.message}`);
      this.showFetchResult(`❌ Copy failed: ${error.message}`);
    }
  }

  initDebugWindow() {
    this.debugLog('display', `Debug system initialized for Electron v${this.version}`);
    this.debugLog('data', 'Football matches loaded', { count: this.footballMatches.length });
    this.debugLog('data', 'Available channels extracted', { channels: this.availableChannels });
    this.showDebugTab('requests');
  }

  // ============================================================================
  // UFC 321 TAPOLOGY SCRAPER INTEGRATION METHODS
  // ============================================================================

  async fetchUFCFromTapology() {
    try {
      const urlInput = document.getElementById('tapology-url-input');
      const statusDiv = document.getElementById('ufc-scraper-status');
      const fetchBtn = document.getElementById('fetch-ufc-btn');
      
      if (!urlInput || !urlInput.value.trim()) {
        this.showScraperStatus('Please enter a Tapology event URL', 'error');
        return;
      }
      
      const eventUrl = urlInput.value.trim();
      
      if (!eventUrl.includes('tapology.com/fightcenter/events/')) {
        this.showScraperStatus('Invalid Tapology URL format', 'error');
        return;
      }
      
      fetchBtn.disabled = true;
      fetchBtn.textContent = '⏳ Scraping...';
      this.showScraperStatus('Fetching UFC event data from Tapology...', 'loading');
      
      this.debugLog('requests', `Scraping UFC event from: ${eventUrl}`);
      
      const TapologyUFCScraper321 = require('./tapologyUFCScraper321');
      const scraper = new TapologyUFCScraper321();
      
      const eventData = await scraper.scrapeEvent(eventUrl);
      
      this.debugLog('data', 'UFC event scraped successfully', eventData);
      
      if (eventData && eventData.totalFights > 0) {
        this.ufcMainCard = eventData.mainCard || [];
        this.ufcPrelimCard = eventData.prelimCard || [];
        this.ufcEarlyPrelimCard = eventData.earlyPrelimCard || [];
        
        const ufcEvent = {
          title: eventData.title,
          date: eventData.date,
          location: eventData.location,
          venue: eventData.location,
          mainCard: this.ufcMainCard,
          prelimCard: this.ufcPrelimCard,
          earlyPrelimCard: this.ufcEarlyPrelimCard,
          totalFights: eventData.totalFights,
          scrapedAt: eventData.scrapedAt,
          source: 'tapology_321',
          sourceUrl: eventUrl,
          apiSource: 'tapology_321_scraper'
        };
        
        this.ufcEvents = [ufcEvent];
        this.lastUFCFetch = new Date().toISOString();
        
        await this.saveMatchData();
        
        this.updateUFCDisplay(eventData);
        this.renderUFCFights();
        
        this.showScraperStatus(
          `✅ Successfully scraped ${eventData.totalFights} fights from ${eventData.title}`, 
          'success'
        );
        
        this.debugLog('data', 'UFC data updated and saved from Tapology', {
          title: eventData.title,
          totalFights: eventData.totalFights
        });
        
      } else {
        this.showScraperStatus(
          '⚠️ No fights found - keeping existing event data', 
          'error'
        );
      }
      
    } catch (error) {
      this.debugLog('requests', `UFC scraping error: ${error.message}`);
      this.showScraperStatus(`❌ Error: ${error.message}`, 'error');
      console.error('UFC scraping failed:', error);
    } finally {
      const fetchBtn = document.getElementById('fetch-ufc-btn');
      if (fetchBtn) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = '🥊 Get UFC Event';
      }
    }
  }

  updateUFCDisplay(eventData) {
    const titleEl = document.querySelector('.ufc-title');
    if (titleEl) {
      titleEl.textContent = eventData.title + ' 🔍';
    }
    
    const dateEl = document.getElementById('ufc-date');
    if (dateEl) {
      dateEl.textContent = eventData.date;
    }
    
    const locationEl = document.getElementById('ufc-location');
    if (locationEl) {
      locationEl.textContent = eventData.location;
    }
    
    const ukTimesTitle = document.querySelector('.uk-times .times-title');
    if (ukTimesTitle) {
      ukTimesTitle.textContent = 'UK Start Times (From Scraped Data)';
    }
  }

  showScraperStatus(message, type = 'info') {
    const statusDiv = document.getElementById('ufc-scraper-status');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `scraper-status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'scraper-status';
      }, 5000);
    }
  }

  // ============================================================================
  // END OF UFC 321 INTEGRATION METHODS
  // ============================================================================
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM loaded, initializing Sports App...');
  const app = new SportsApp();
  
  window.sportsApp = app;
  
  window.fetchSportsData = () => app.fetchNewSportsData();
  window.fetchFootball = () => app.matchFetcher?.updateMatchData();
  window.fetchUFC = () => app.ufcFetcher?.updateUFCData();
  window.manualCleanup = () => app.manualCleanup();
  window.addMatch = (match) => app.addFootballMatch(match);
});

window.addEventListener('error', (e) => {
  console.error('❌ Sports App Error:', e.error);
});

console.log('📺 Sports App script loaded successfully!');
