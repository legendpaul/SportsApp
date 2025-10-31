// Web-compatible Sports App JavaScript - Fixed initialization issue
// Version: 2.1.0 - Fixed Netlify environment detection
class WebSportsApp {
  constructor() {
    this.version = '2.1.0';
    this.footballMatches = [];
    this.ufcMainCard = [];
    this.ufcPrelimCard = [];
    this.ufcEarlyPrelimCard = [];
    this.ufcEvents = [];
    this.dataManager = null;
    this.matchFetcher = null;
    this.lastFetchTime = null;
    this.lastUFCFetch = null;
    this.enableAutoFetch = true; // Renamed to avoid any conflicts
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
      this.debugLog('data', 'Initializing web data manager and fetchers...');
      
      // Detect environment first
      this.isLocal = this.detectLocalEnvironment();
      this.debugLog('data', `Environment detected: ${this.isLocal ? 'Local Development' : 'Production'}`);
      
      this.dataManager = new WebDataManager();
      this.matchFetcher = new WebMatchFetcher((category, message, data) => {
        this.debugLog(category, message, data);
      });
      this.ufcFetcher = new WebUFCFetcher((category, message, data) => {
        this.debugLog(category, message, data);
      });
      
      this.debugLog('data', 'Web fetchers initialized successfully (Football + UFC)');
      
      await this.loadMatchData();
      
      // Fixed: Clear method call without naming conflicts
      if (this.enableAutoFetch) {
        await this.performAutoFetch();
      }
    } catch (error) {
      this.debugLog('data', `Failed to initialize data manager: ${error.message}`);
      console.error('Failed to initialize data manager:', error);
      this.loadFallbackData();
    }
  }

  detectLocalEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    const isFileProtocol = protocol === 'file:';
    const hasDevPort = port && (port === '3000' || port === '8080' || port === '5000' || port === '8000');
    const isNetlify = hostname.includes('.netlify.app') || hostname.includes('.netlify.com');
    
    const isLocal = (isLocalhost || isFileProtocol || hasDevPort) && !isNetlify;
    
    this.debugLog('data', `Environment detection details:`, {
      hostname, protocol, port, isLocalhost, isFileProtocol, hasDevPort, isNetlify, 
      finalResult: isLocal ? 'Local Development' : 'Production'
    });
    
    return isLocal;
  }

  async performAutoFetch() {
    try {
      this.debugLog('requests', 'Auto-fetching sports data on startup...');
      
      const shouldFetchFootball = this.shouldAutoFetch('football');
      const shouldFetchUFC = this.shouldAutoFetch('ufc');
      
      this.debugLog('requests', `Should fetch football: ${shouldFetchFootball}, Should fetch UFC: ${shouldFetchUFC}`);
      
      if (shouldFetchFootball || shouldFetchUFC) {
        this.debugLog('requests', 'Fetching fresh sports data...');
        this.showStartupFetchingState();
        
        let footballResult = { success: true, added: 0 };
        let ufcResult = { success: true, added: 0 };
        
        if (shouldFetchFootball) {
          try {
            this.debugLog('requests', 'Starting football fetch...');
            footballResult = await this.matchFetcher.updateMatchData();
            this.debugLog('requests', `Football fetch result: ${footballResult.success ? 'Success' : 'Failed'} - ${footballResult.added} new matches`);
          } catch (error) {
            this.debugLog('requests', `Football fetch error: ${error.message}`);
            window.lastError = `Football: ${error.message}`;
            footballResult = { success: false, error: error.message };
          }
        }
        
        if (shouldFetchUFC) {
          try {
            this.debugLog('requests', 'Starting UFC fetch...');
            ufcResult = await this.ufcFetcher.updateUFCData();
            this.debugLog('requests', `UFC fetch result: ${ufcResult.success ? 'Success' : 'Failed'} - ${ufcResult.added} new events`);
          } catch (error) {
            this.debugLog('requests', `UFC fetch error: ${error.message}`);
            window.lastError = `UFC: ${error.message}`;
            ufcResult = { success: false, error: error.message };
          }
        }
        
        const totalNew = (footballResult.added || 0) + (ufcResult.added || 0);
        this.debugLog('requests', `Total new items: ${totalNew} (Football: ${footballResult.added || 0}, UFC: ${ufcResult.added || 0})`);
        
        if (totalNew > 0) {
          if (footballResult.success) this.lastFetchTime = new Date().toISOString();
          if (ufcResult.success) this.lastUFCFetch = new Date().toISOString();
          
          await this.loadMatchData();
          this.showStartupFetchResult(`📥 Found ${footballResult.added || 0} football matches, ${ufcResult.added || 0} UFC events!`);
        } else if (footballResult.success || ufcResult.success) {
          this.showStartupFetchResult('✅ Sports data is up to date');
        } else {
          this.showStartupFetchResult('⚠️ Using cached/demo sports data - check debug for details');
        }
        
        await this.startupCleanup();
      } else {
        this.debugLog('requests', 'Skipping startup fetch (data is recent)');
        // Still ensure we have UFC data for local development
        if (this.isLocal && this.ufcEvents.length === 0) {
          this.debugLog('requests', 'Local dev: Loading current UFC events...');
          try {
            const currentEvents = this.ufcFetcher.getCurrentUFCEvents();
            this.ufcEvents = currentEvents;
            this.lastUFCFetch = new Date().toISOString();
            await this.saveMatchData();
            this.debugLog('requests', `Local dev: Loaded ${currentEvents.length} current UFC events`);
          } catch (error) {
            this.debugLog('requests', `Local dev UFC load error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.debugLog('requests', `Error during startup fetch: ${error.message}`);
      window.lastError = `Startup: ${error.message}`;
      this.showStartupFetchResult('⚠️ Using cached/demo data - check debug for details');
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
      const result = this.dataManager.cleanupOldMatches();
      
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
    this.debugLog('data', 'Loading match data from localStorage...');
    
    try {
      const data = this.dataManager.loadData();
      this.footballMatches = data.footballMatches || [];
      this.ufcEvents = data.ufcEvents || [];
      this.lastFetchTime = data.lastFetch || null;
      this.lastUFCFetch = data.lastUFCFetch || null;
      
      this.debugLog('data', `Loaded data from localStorage: ${this.footballMatches.length} football matches, ${this.ufcEvents.length} UFC events`);
      
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
        this.loadFallbackUFCData();
        this.debugLog('data', 'Using fallback UFC data');
      }
      
      console.log(`📊 Loaded ${this.footballMatches.length} football matches and ${this.ufcEvents.length} UFC events`);
    } catch (error) {
      this.debugLog('data', `Error loading match data: ${error.message}`);
      this.loadFallbackData();
    }
  }

  loadFallbackData() {
    // Only load fallback data if explicitly needed for testing
    // In production, we rely on live data from Netlify functions
    this.footballMatches = [];
    this.loadFallbackUFCData();
    this.debugLog('data', 'No fallback data loaded - using live data only');
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
      }
    ];

    this.ufcPrelimCard = [
      { fighter1: "Allan Nascimento", fighter2: "Jafel Filho", weightClass: "Flyweight" },
      { fighter1: "Andreas Gustafsson", fighter2: "Jeremiah Wells", weightClass: "Welterweight" }
    ];
    
    this.ufcEarlyPrelimCard = [];
  }

  init() {
    this.debugLog('display', `Initializing Web Sports App v${this.version}...`);
    
    this.updateClock();
    this.renderFootballMatches();
    
    // Ensure UFC data is properly initialized before rendering
    if (!this.ufcMainCard || this.ufcMainCard.length === 0) {
      this.loadFallbackUFCData();
    }
    this.safeRenderUFC();
    
    this.renderChannelFilter();
    this.addFetchButton();
    this.initDebugWindow();
    this.addDataManagementButtons();
    this.updateFooterForEnvironment();
    
    setInterval(() => this.updateClock(), 1000);
    setInterval(() => this.updateMatchStatuses(), 60000);
    setInterval(() => this.autoRefreshIfNeeded(), 2 * 60 * 60 * 1000);
    
    this.debugLog('display', `Web Sports App v${this.version} initialized successfully!`);
    console.log(`🚀 Web Sports App v${this.version} initialized successfully!`);
  }

  updateFooterForEnvironment() {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname === '' ||
                   window.location.protocol === 'file:';
    
    const footer = document.querySelector('.footer p');
    if (footer) {
      if (isLocal) {
        footer.textContent = 'Local Development • Live data via CORS proxy • Fallback demo data';
      } else {
        footer.textContent = 'Live data from live-footballontv.com • Times shown in UK timezone • Powered by Netlify Functions';
      }
    }
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
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname === '' ||
                     window.location.protocol === 'file:';
      
      const controls = document.createElement('div');
      controls.id = 'fetch-controls';
      controls.className = 'fetch-controls';
      
      if (isLocal) {
        controls.innerHTML = `
          <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn" title="Fetch live data via CORS proxy (local development)">
            📥 Refresh Live Data
          </button>
          <button onclick="window.sportsApp.manualCleanup()" class="cleanup-btn" title="Remove old matches and events">
            🧹 Cleanup
          </button>
          <div class="auto-fetch-indicator" title="Local development with CORS proxy + demo fallback">
            🔄 Local Dev
          </div>
        `;
      } else {
        controls.innerHTML = `
          <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn" title="Fetch live matches from live-footballontv.com via Netlify Functions">
            📥 Refresh Live Data
          </button>
          <button onclick="window.sportsApp.manualCleanup()" class="cleanup-btn" title="Remove old matches and events">
            🧹 Cleanup
          </button>
          <div class="auto-fetch-indicator" title="Auto-fetches live football data on startup via Netlify Functions">
            🔄 Auto-fetch: LIVE
          </div>
        `;
      }
      
      header.appendChild(controls);
    }
  }

  addDataManagementButtons() {
    const footer = document.querySelector('.footer');
    if (footer && !document.getElementById('data-management')) {
      const dataControls = document.createElement('div');
      dataControls.id = 'data-management';
      dataControls.className = 'data-management';
      dataControls.innerHTML = `
        <div class="data-management-controls">
          <button onclick="window.sportsApp.showIgnoredMatches()" class="data-btn" title="View and manage ignored matches">
            👁️ View Ignored Matches
          </button>
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
      
      // Update storage info
      this.updateStorageInfo();
    }
  }

  updateStorageInfo() {
    const storageInfo = document.getElementById('storage-info');
    if (storageInfo) {
      const status = this.dataManager.getCleanupStatus();
      storageInfo.textContent = `Storage: ${status.storageUsed || 'Unknown'} | ${status.totalMatches} matches, ${status.totalUFCEvents} events`;
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

    const currentMatches = this.footballMatches.filter(match => {
      const matchDateTime = this.getMatchDateTime(match);
      const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000));
      return matchDateTime > threeHoursAgo && !match.ignored;
    });
    
    this.debugLog('filtering', `Filtered old matches: ${this.footballMatches.length} total -> ${currentMatches.length} current`);

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
            Live data from live-footballontv.com via Netlify Functions
            <br>
            <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn">
              📥 Refresh live data now
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

    this.debugLog('display', `Rendering ${filteredMatches.length} football match cards`);

    filteredMatches.forEach(match => {
      const status = this.getMatchStatus(match);
      const statusClass = this.getStatusClass(status);
      const isApiMatch = match.apiSource === 'live-footballontv.com' ? '🌐' : '✏️';

      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.setAttribute('data-match-id', match.id);

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
            <span class="match-source" title="${match.apiSource === 'live-footballontv.com' ? 'From live-footballontv.com' : 'Demo/fallback data'}">${isApiMatch}</span>
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

      matchCard.addEventListener('click', (e) => {
        if (e.target.classList.contains('ignore-btn')) {
          return;
        }
        this.onMatchCardClick(match.id);
      });

      const ignoreBtn = matchCard.querySelector('.ignore-btn');
      ignoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onIgnoreButtonClick(match.id);
      });

      container.appendChild(matchCard);
    });

    this.updateMatchesCount(filteredMatches.length, currentMatches.length);
  }

  onMatchCardClick(matchId) {
    const match = this.footballMatches.find(m => m.id === matchId);
    if (!match) return;

    // Cycle through states: 0 -> 1 -> 2 -> 0
    const currentState = match.trafficLightState || 0;
    const nextState = (currentState + 1) % 3;

    // Update local data
    match.trafficLightState = nextState;

    // Update persisted data
    this.dataManager.updateMatchTrafficLightState(matchId, nextState);

    // Update the UI
    this.renderFootballMatches();
  }

  onIgnoreButtonClick(matchId) {
    const match = this.footballMatches.find(m => m.id === matchId);
    if (!match) return;
    
    // Show confirmation
    if (confirm(`Hide "${match.teamA} vs ${match.teamB}"?\n\nThis match will be hidden from your view.`)) {
      this.dataManager.ignoreMatch(matchId);
      match.ignored = true;
      this.renderFootballMatches();
      this.showFetchResult(`✓ Match hidden: ${match.teamA} vs ${match.teamB}`);
      this.debugLog('filtering', `Match ignored: ${match.teamA} vs ${match.teamB} (ID: ${matchId})`);
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
    try {
      // Ensure we have valid UFC data before rendering
      if (!this.ufcMainCard || !Array.isArray(this.ufcMainCard)) {
        this.ufcMainCard = [];
      }
      if (!this.ufcPrelimCard || !Array.isArray(this.ufcPrelimCard)) {
        this.ufcPrelimCard = [];
      }
      if (!this.ufcEarlyPrelimCard || !Array.isArray(this.ufcEarlyPrelimCard)) {
        this.ufcEarlyPrelimCard = [];
      }
      
      this.renderMainCard();
      this.renderPrelimCard();
      this.renderEarlyPrelimCard();
      this.updateUFCTitle();
      
      this.debugLog('display', 'UFC fights rendered successfully', {
        mainCard: this.ufcMainCard.length,
        prelims: this.ufcPrelimCard.length,
        earlyPrelims: this.ufcEarlyPrelimCard.length
      });
    } catch (error) {
      this.debugLog('display', `Error rendering UFC fights: ${error.message}`);
      console.error('Error rendering UFC fights:', error);
      
      // Clear any potentially corrupted display and show fallback
      this.clearUFCSection();
      this.showUFCErrorState();
    }
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

    // Completely clear any existing content, including potential debug data
    container.innerHTML = '';
    
    // Validate we have actual fight data
    if (!this.ufcMainCard || !Array.isArray(this.ufcMainCard) || this.ufcMainCard.length === 0) {
      container.innerHTML = '<div class="no-fights">No main card fights available</div>';
      return;
    }

    this.ufcMainCard.forEach((fight, index) => {
      try {
        // Validate individual fight data
        if (!fight || !fight.fighter1 || !fight.fighter2) {
          this.debugLog('display', `Skipping invalid fight at index ${index}`, fight);
          return;
        }
        
        const fightCard = document.createElement('div');
        fightCard.className = 'fight-main';
        
        // Sanitize fighter names to prevent any injection
        const fighter1 = this.sanitizeForDisplay(fight.fighter1).toString();
        const fighter2 = this.sanitizeForDisplay(fight.fighter2).toString();
        const weightClass = this.sanitizeForDisplay(fight.weightClass || 'Unknown').toString();
        const title = fight.title ? this.sanitizeForDisplay(fight.title).toString() : '';
        
        fightCard.innerHTML = `
          <div class="fight-header">
            <div class="fighters">
              <div class="fighter fighter-1">${fighter1}</div>
              <div class="vs-separator">vs</div>
              <div class="fighter fighter-2">${fighter2}</div>
            </div>
            ${title ? `<div class="title-fight">${title}</div>` : ''}
          </div>
          <div class="weight-class">
            <span class="weight-badge">${weightClass}</span>
          </div>
        `;

        container.appendChild(fightCard);
      } catch (error) {
        this.debugLog('display', `Error rendering main card fight: ${error.message}`);
      }
    });
  }

  renderPrelimCard() {
    const container = document.getElementById('prelim-card-fights');
    if (!container) return;

    // Completely clear any existing content, including potential debug data
    container.innerHTML = '';
    
    // Validate we have actual fight data
    if (!this.ufcPrelimCard || !Array.isArray(this.ufcPrelimCard) || this.ufcPrelimCard.length === 0) {
      container.innerHTML = '<div class="no-fights">No preliminary fights available</div>';
      return;
    }

    this.ufcPrelimCard.forEach((fight, index) => {
      try {
        // Validate individual fight data
        if (!fight || !fight.fighter1 || !fight.fighter2) {
          this.debugLog('display', `Skipping invalid prelim fight at index ${index}`, fight);
          return;
        }
        
        const fightCard = document.createElement('div');
        fightCard.className = 'fight-prelim';
        
        // Sanitize fighter names to prevent any injection
        const fighter1 = this.sanitizeForDisplay(fight.fighter1).toString();
        const fighter2 = this.sanitizeForDisplay(fight.fighter2).toString();
        const weightClass = this.sanitizeForDisplay(fight.weightClass || 'Unknown').toString();
        
        fightCard.innerHTML = `
          <div class="prelim-fighters">
            <div class="prelim-fighter fighter-1">${fighter1}</div>
            <div class="vs-separator">vs</div>
            <div class="prelim-fighter fighter-2">${fighter2}</div>
          </div>
          <div class="prelim-weight">${weightClass}</div>
        `;

        container.appendChild(fightCard);
      } catch (error) {
        this.debugLog('display', `Error rendering prelim fight: ${error.message}`);
      }
    });
  }
  
  renderEarlyPrelimCard() {
    const container = document.getElementById('early-prelim-card-fights');
    if (!container) return;

    container.innerHTML = '';
    
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

  clearUFCSection() {
    try {
      // Clear all UFC display containers
      const containers = [
        'main-card-fights',
        'prelim-card-fights', 
        'early-prelim-card-fights'
      ];
      
      containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
        }
      });
      
      this.debugLog('display', 'UFC section cleared');
    } catch (error) {
      console.error('Error clearing UFC section:', error);
    }
  }

  showUFCErrorState() {
    try {
      const mainCardContainer = document.getElementById('main-card-fights');
      if (mainCardContainer) {
        mainCardContainer.innerHTML = `
          <div class="ufc-error-state">
            <div class="error-icon">⚠️</div>
            <div class="error-message">Unable to load UFC event data</div>
            <div class="error-suggestion">
              <button onclick="window.sportsApp.fetchNewSportsData()" class="fetch-btn">🔄 Try Refresh</button>
            </div>
          </div>
        `;
      }
      
      this.debugLog('display', 'UFC error state displayed');
    } catch (error) {
      console.error('Error showing UFC error state:', error);
    }
  }

  // Prevent raw JSON or debug data from being accidentally displayed
  sanitizeForDisplay(data) {
    if (typeof data !== 'string') {
      return String(data || 'Unknown');
    }
    
    const trimmed = data.trim();
    
    // Check if it looks like JSON and prevent display
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      this.debugLog('display', 'Prevented raw JSON from being displayed in UI');
      return 'Loading...';
    }
    
    // Check for debug patterns
    const debugPatterns = [
      'debugInfo', 'googleHtml', 'apiResponse', 'null,null',
      'Schedule\u003c', 'ESPN', 'google.com', 'AsBtn',
      // Removed 'origin\u003' as it was causing a SyntaxError and is an unlikely debug pattern.
      '\u003c/b\u003e', 'related_questions'
    ];
    
    if (debugPatterns.some(pattern => trimmed.includes(pattern))) {
      this.debugLog('display', 'Prevented debug data from being displayed in UI');
      return 'Loading...';
    }
    
    // Check for excessively long strings (likely debug data)
    if (trimmed.length > 200) {
      this.debugLog('display', 'Prevented overly long string from being displayed');
      return 'Event data';
    }
    
    // Check for multiple underscores (common in debug data)
    if (trimmed.includes('___') || trimmed.match(/_{3,}/)) {
      this.debugLog('display', 'Prevented debug underscore data from being displayed');
      return 'Loading...';
    }
    
    return trimmed;
  }

  // Enhanced error boundary for UFC section
  safeRenderUFC() {
    try {
      // Clear any existing content that might be corrupted
      this.clearUFCSection();
      
      // Validate data before rendering
      if (!this.ufcEvents || this.ufcEvents.length === 0) {
        this.loadFallbackUFCData();
      }
      
      // Render with error protection
      this.renderUFCFights();
      
    } catch (error) {
      this.debugLog('display', `Safe UFC render failed: ${error.message}`);
      this.showUFCErrorState();
    }
  }

  async updateMatchStatuses() {
    await this.loadMatchData();
    this.renderFootballMatches();
    this.safeRenderUFC();
    this.renderChannelFilter();
    this.updateStorageInfo();
    this.debugLog('display', 'Sports data statuses updated');
  }

  async fetchNewSportsData() {
    try {
      this.debugLog('requests', 'Fetching new sports data...');
      
      this.showFetchingState(true);
      
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
        this.safeRenderUFC();
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
        btn.textContent = '⏳ Fetching Live Data...';
        btn.disabled = true;
      } else {
        btn.textContent = '📥 Refresh Live Data';
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
      
      const result = this.dataManager.cleanupOldMatches();
      
      if (result.success) {
        this.debugLog('data', `Manual cleanup completed: Removed ${result.removedCount} old events`);
        this.showFetchResult(`🧹 Removed ${result.removedCount} old events`);
        
        await this.loadMatchData();
        this.renderFootballMatches();
        this.safeRenderUFC();
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

  // Data management methods
  exportData() {
    try {
      this.debugLog('data', 'Exporting sports data...');
      const success = this.dataManager.exportData();
      
      if (success) {
        this.showFetchResult('💾 Data exported successfully!');
        this.debugLog('data', 'Data export completed');
      } else {
        this.showFetchResult('❌ Failed to export data');
      }
    } catch (error) {
      this.debugLog('data', `Error exporting data: ${error.message}`);
      this.showFetchResult(`❌ Export error: ${error.message}`);
    }
  }

  async importData(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      this.debugLog('data', `Importing data from file: ${file.name}`);
      
      const result = await this.dataManager.importData(file);
      
      if (result.success) {
        this.showFetchResult(`📁 Imported ${result.matches} matches, ${result.events} events!`);
        this.debugLog('data', 'Data import completed', result);
        
        // Reload and re-render everything
        await this.loadMatchData();
        this.renderFootballMatches();
        this.safeRenderUFC();
        this.renderChannelFilter();
        this.updateStorageInfo();
      } else {
        this.showFetchResult(`❌ Import failed: ${result.error}`);
      }
      
      // Clear the file input
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
        
        const success = this.dataManager.clearAllData();
        
        if (success) {
          this.showFetchResult('🗑️ All data cleared successfully!');
          this.debugLog('data', 'All data cleared');
          
          // Reset app state
          this.footballMatches = [];
          this.ufcEvents = [];
          this.lastFetchTime = null;
          this.lastUFCFetch = null;
          
          // Load fallback data and re-render
          this.loadFallbackData();
          this.renderFootballMatches();
          this.safeRenderUFC();
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

  showIgnoredMatches() {
    const ignoredMatches = this.footballMatches.filter(m => m.ignored);
    
    if (ignoredMatches.length === 0) {
      alert('No ignored matches found.');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'ignored-matches-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 16px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
      <h3 style="margin: 0; color: #333; font-size: 20px; font-weight: 700;">👁️ Ignored Matches (${ignoredMatches.length})</h3>
      <button onclick="this.closest('.ignored-matches-modal').remove()" 
              style="background: #f44336; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
        ✕ Close
      </button>
    `;
    
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
    
    ignoredMatches.forEach(match => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 4px solid #ff9800;
      `;
      
      item.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 15px; color: #333; margin-bottom: 4px;">
            ${match.teamA} vs ${match.teamB}
          </div>
          <div style="font-size: 13px; color: #666;">
            ${match.time} • ${match.channel} • ${match.competition}
          </div>
        </div>
        <button onclick="window.sportsApp.unignoreMatch('${match.id}')" 
                style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;">
          ↩️ Restore
        </button>
      `;
      
      list.appendChild(item);
    });
    
    content.appendChild(header);
    content.appendChild(list);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  unignoreMatch(matchId) {
    const match = this.footballMatches.find(m => m.id === matchId);
    if (!match) return;
    
    this.dataManager.unignoreMatch(matchId);
    match.ignored = false;
    
    // Close the modal and refresh
    const modal = document.querySelector('.ignored-matches-modal');
    if (modal) modal.remove();
    
    this.renderFootballMatches();
    this.showFetchResult(`✓ Match restored: ${match.teamA} vs ${match.teamB}`);
    this.debugLog('filtering', `Match unignored: ${match.teamA} vs ${match.teamB} (ID: ${matchId})`);
  }

  addFootballMatch(match) {
    const newMatch = {
      ...match,
      id: `web_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      matchDate: match.matchDate || new Date().toISOString().split('T')[0]
    };
    
    this.footballMatches.push(newMatch);
    this.renderFootballMatches();
    this.saveMatchData();
  }

  async saveMatchData() {
    try {
      const data = {
        footballMatches: this.footballMatches,
        ufcEvents: this.ufcEvents,
        lastCleanup: null,
        lastFetch: this.lastFetchTime,
        lastUFCFetch: this.lastUFCFetch
      };
      
      const saved = this.dataManager.saveData(data);
      
      if (saved) {
        this.debugLog('data', 'Sports data saved successfully to localStorage');
        this.updateStorageInfo();
      } else {
        this.debugLog('data', 'Failed to save sports data to localStorage');
      }
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
    
    this.debugLog('data', `Extracted ${this.availableChannels.length} unique channels`, {
      channels: this.availableChannels
    });
    
    const container = document.getElementById('channel-checkboxes');
    if (!container) {
      this.debugLog('display', 'ERROR: channel-checkboxes container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (this.availableChannels.length === 0) {
      this.debugLog('display', 'No channels found - showing empty message');
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
      this.debugLog('filtering', 'Initialized all channels as selected on first load');
    }
    
    this.debugLog('display', `Rendering ${this.availableChannels.length} channel checkboxes`);
    
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
    this.debugLog('display', 'Channel filter rendered successfully');
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
    
    this.debugLog('display', `Debug window ${this.debugVisible ? 'shown' : 'hidden'}`);
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
    this.debugLog('display', `Switched to debug tab: ${tabName}`);
  }

  clearDebugLog() {
    Object.keys(this.debugLogs).forEach(category => {
      this.debugLogs[category] = [];
      this.updateDebugDisplay(category);
    });
    
    console.log('🧹 Debug logs cleared');
  }

  generateComprehensiveDebugReport() {
    const report = [];
    report.push('=== UK Sports TV Guide - Debug Report ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`App Version: ${this.version}`);
    report.push(`Environment: ${this.isLocal ? 'Local Development' : 'Production (Netlify)'}`);
    report.push('');

    // Football data section
    report.push('=== FOOTBALL MATCHES ===');
    report.push(`Total matches: ${this.footballMatches.length}`);
    report.push(`Last fetch: ${this.lastFetchTime || 'Never'}`);
    report.push(`Available channels: ${this.availableChannels.length}`);
    report.push(`Selected channels: ${this.selectedChannels.size}`);
    report.push('');

    // UFC data section
    report.push('=== UFC EVENTS ===');
    report.push(`Total UFC events: ${this.ufcEvents.length}`);
    report.push(`Last UFC fetch: ${this.lastUFCFetch || 'Never'}`);
    report.push(`Main card fights: ${this.ufcMainCard.length}`);
    report.push(`Prelim fights: ${this.ufcPrelimCard.length}`);
    report.push('');

    // Debug logs section
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
      this.debugLog('display', 'Generating comprehensive debug report for clipboard...');
      
      const debugContent = this.generateComprehensiveDebugReport();
      
      // Enhanced browser compatibility check
      const hasClipboardAPI = navigator.clipboard && 
                             typeof navigator.clipboard.writeText === 'function' && 
                             window.isSecureContext;
      
      const hasExecCommand = typeof document.execCommand === 'function';
      
      this.debugLog('display', 'Clipboard capabilities detected:', {
        hasClipboardAPI,
        hasExecCommand,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });

      if (hasClipboardAPI) {
        this.debugLog('display', 'Using modern Clipboard API...');
        this.copyWithClipboardAPI(debugContent);
      } else if (hasExecCommand) {
        this.debugLog('display', 'Using legacy execCommand fallback...');
        this.copyWithExecCommand(debugContent);
      } else {
        this.debugLog('display', 'No clipboard support available, showing manual copy modal...');
        this.showManualCopyModal(debugContent);
      }
      
    } catch (error) {
      this.debugLog('display', `Critical error in copy function: ${error.message}`);
      this.showFetchResult(`❌ Copy failed: ${error.message}`);
      console.error('Critical error copying debug logs:', error);
    }
  }

  async copyWithClipboardAPI(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopySuccessNotification('✅ Debug logs copied to clipboard! (Modern API)');
      this.debugLog('display', 'Debug logs successfully copied via Clipboard API');
    } catch (clipboardError) {
      this.debugLog('display', `Clipboard API failed: ${clipboardError.message}, trying fallback...`);
      
      // If clipboard API fails, try execCommand
      if (typeof document.execCommand === 'function') {
        this.copyWithExecCommand(text);
      } else {
        this.showManualCopyModal(text);
      }
    }
  }

  copyWithExecCommand(text) {
    try {
      // Create a more robust textarea for copying
      const textarea = document.createElement('textarea');
      
      // Set properties to make it as invisible and functional as possible
      textarea.value = text;
      textarea.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
        font-size: 12px;
        border: none;
        outline: none;
        background: transparent;
      `;
      
      // Ensure the textarea is not readonly
      textarea.readOnly = false;
      
      document.body.appendChild(textarea);
      
      // Focus and select with better browser support
      textarea.focus();
      textarea.select();
      
      // For iOS Safari
      if (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)) {
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textarea.setSelectionRange(0, 999999);
      } else {
        // For other browsers
        textarea.setSelectionRange(0, textarea.value.length);
      }
      
      // Attempt to copy
      const successful = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textarea);
      
      if (successful) {
        this.showCopySuccessNotification('✅ Debug logs copied to clipboard! (Legacy method)');
        this.debugLog('display', 'Debug logs successfully copied using execCommand');
      } else {
        this.debugLog('display', 'execCommand copy failed, showing manual modal...');
        this.showManualCopyModal(text);
      }
      
    } catch (execError) {
      this.debugLog('display', `execCommand copy failed: ${execError.message}`);
      this.showManualCopyModal(text);
    }
  }

  showManualCopyModal(text) {
    this.debugLog('display', 'Showing enhanced manual copy modal...');
    
    // Remove any existing modal
    const existingModal = document.querySelector('.debug-copy-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'debug-copy-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 28px;
      border-radius: 16px;
      max-width: 90%;
      max-height: 90%;
      width: 600px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;';
    header.innerHTML = `
      <div>
        <h3 style="margin: 0; color: #333; font-size: 20px; font-weight: 700;">📋 Debug Logs - Manual Copy</h3>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px; line-height: 1.4;">
          Automatic copy failed. Please manually copy the debug data below.
        </p>
      </div>
      <button onclick="this.closest('.debug-copy-modal').remove()" 
              style="background: #f44336; color: white; border: none; padding: 12px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; min-width: 70px;"
              onmouseover="this.style.background='#d32f2f'; this.style.transform='scale(1.05)'" 
              onmouseout="this.style.background='#f44336'; this.style.transform='scale(1)'">✕ Close</button>
    `;
    
    const textareaContainer = document.createElement('div');
    textareaContainer.style.cssText = 'flex: 1; min-height: 0; margin-bottom: 20px;';
    
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 400px;
      max-height: 60vh;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      resize: vertical;
      background: #f8f9fa;
      color: #333;
      outline: none;
      transition: border-color 0.2s;
    `;
    textarea.value = text;
    textarea.readOnly = true;
    
    // Enhanced focus styling
    textarea.addEventListener('focus', () => {
      textarea.style.borderColor = '#4CAF50';
      textarea.style.background = '#fff';
    });
    textarea.addEventListener('blur', () => {
      textarea.style.borderColor = '#e0e0e0';
      textarea.style.background = '#f8f9fa';
    });
    
    textareaContainer.appendChild(textarea);
    
    const instructions = document.createElement('div');
    instructions.style.cssText = 'padding: 16px; background: linear-gradient(135deg, #e3f2fd, #f0f8ff); border-radius: 10px; border-left: 5px solid #2196f3;';
    instructions.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 18px; margin-right: 8px;">📋</span>
        <h4 style="margin: 0; color: #1976d2; font-size: 15px; font-weight: 600;">Copy Instructions</h4>
      </div>
      <div style="color: #424242; font-size: 13px; line-height: 1.5;">
        <div style="margin-bottom: 8px;"><strong>Desktop:</strong></div>
        <div style="margin-left: 16px; margin-bottom: 12px;">
          1. Click in the text area above<br>
          2. Select all (Ctrl+A / Cmd+A)<br>
          3. Copy (Ctrl+C / Cmd+C)
        </div>
        <div style="margin-bottom: 8px;"><strong>Mobile:</strong></div>
        <div style="margin-left: 16px;">
          1. Tap and hold in the text area<br>
          2. Select "Select All" then "Copy"
        </div>
      </div>
    `;
    
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 12px; margin-top: 16px;';
    
    const selectAllButton = document.createElement('button');
    selectAllButton.textContent = '📝 Select All';
    selectAllButton.style.cssText = `
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    selectAllButton.onclick = () => {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
    };
    
    const tryAgainButton = document.createElement('button');
    tryAgainButton.textContent = '🔄 Try Auto-Copy';
    tryAgainButton.style.cssText = `
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    tryAgainButton.onclick = () => {
      modal.remove();
      this.copyDebugToClipboard();
    };
    
    buttonRow.appendChild(selectAllButton);
    buttonRow.appendChild(tryAgainButton);
    
    // Add animation styles
    if (!document.getElementById('modal-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-animation-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    content.appendChild(header);
    content.appendChild(textareaContainer);
    content.appendChild(instructions);
    content.appendChild(buttonRow);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Auto-select text after a brief delay
    setTimeout(() => {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
    }, 200);
    
    // Enhanced keyboard support
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        textarea.focus();
        textarea.select();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    });
  }

  fallbackCopyToClipboard(text) {
    try {
      // Method 1: Try execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.top = '0';
      textarea.style.left = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        this.showCopySuccessNotification('✅ Debug logs copied (fallback method)!');
        this.debugLog('display', 'Debug logs copied using execCommand fallback');
      } else {
        this.showCopyFallbackModal(text);
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showCopyFallbackModal(text);
    }
  }

  showCopySuccessNotification(message) {
    // Remove any existing notifications
    const existing = document.querySelector('.copy-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
      z-index: 10000;
      font-size: 14px;
      font-weight: 600;
      max-width: 300px;
      animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      cursor: pointer;
    `;
    notification.textContent = message;
    
    // Add animation styles if not already present
    if (!document.getElementById('copy-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'copy-notification-styles';
      style.textContent = `
        @keyframes slideInBounce {
          0% { transform: translateX(100%) scale(0.8); opacity: 0; }
          50% { transform: translateX(-10px) scale(1.05); opacity: 0.9; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes slideOutBounce {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(100%) scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOutBounce 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    });
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutBounce 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  showCopyFallbackModal(text) {
    this.debugLog('display', 'Showing fallback modal for manual copy');
    
    // Remove any existing modal
    const existingModal = document.querySelector('.debug-copy-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'debug-copy-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 16px;
      max-width: 90%;
      max-height: 90%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
      <div>
        <h3 style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">Debug Logs - Manual Copy</h3>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Copy failed - please manually copy the text below</p>
      </div>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" 
              style="background: #f44336; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;"
              onmouseover="this.style.background='#d32f2f'" 
              onmouseout="this.style.background='#f44336'">Close</button>
    `;
    
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      width: 100%;
      height: 400px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      resize: vertical;
      min-height: 200px;
      max-height: 60vh;
      background: #f9f9f9;
    `;
    textarea.value = text;
    textarea.readOnly = true;
    
    const instructions = document.createElement('div');
    instructions.style.cssText = 'margin: 16px 0 0 0; padding: 12px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;';
    instructions.innerHTML = `
      <p style="margin: 0; color: #1976d2; font-size: 14px; font-weight: 500;">📋 Copy Instructions:</p>
      <p style="margin: 8px 0 0 0; color: #424242; font-size: 13px; line-height: 1.4;">
        1. Click in the text area above<br>
        2. Select all text (Ctrl+A or Cmd+A)<br>
        3. Copy to clipboard (Ctrl+C or Cmd+C)
      </p>
    `;
    
    // Add animation styles
    if (!document.getElementById('modal-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-animation-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    content.appendChild(header);
    content.appendChild(textarea);
    content.appendChild(instructions);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Auto-select text
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 100);
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }

  async testUFCConnection() {
    try {
      this.debugLog('requests', '🥊 Starting comprehensive UFC API connection test...');
      
      if (!this.ufcFetcher) {
        this.debugLog('requests', 'ERROR: UFC Fetcher not available!');
        this.showFetchResult('❌ UFC Fetcher not initialized');
        return;
      }
      
      // Test 1: Basic connection test
      this.debugLog('requests', 'Test 1: Testing basic UFC connection...');
      const basicTest = await this.ufcFetcher.testConnection();
      this.debugLog('requests', `Basic connection test result: ${basicTest ? 'SUCCESS' : 'FAILED'}`);
      
      // Test 2: Environment detection
      this.debugLog('requests', 'Test 2: Checking environment configuration...');
      this.debugLog('requests', `UFC Fetcher isLocal: ${this.ufcFetcher.isLocal}`);
      this.debugLog('requests', `UFC Fetcher URL: ${this.ufcFetcher.netlifyFunctionUrl}`);
      
      // Test 3: Direct API call
      this.debugLog('requests', 'Test 3: Making direct UFC API call...');
      try {
        const testEvents = await this.ufcFetcher.fetchUpcomingUFCEvents();
        this.debugLog('requests', `Direct API call result: ${testEvents.length} events returned`);
        
        if (testEvents.length > 0) {
          this.debugLog('requests', 'Sample event data:', testEvents[0]);
        }
      } catch (apiError) {
        this.debugLog('requests', `Direct API call failed: ${apiError.message}`);
      }
      
      // Test 4: Check current stored data
      this.debugLog('requests', 'Test 4: Checking stored UFC data...');
      const storedData = this.dataManager.loadData();
      this.debugLog('requests', `Stored UFC events: ${storedData.ufcEvents?.length || 0}`);
      this.debugLog('requests', `Last UFC fetch: ${storedData.lastUFCFetch || 'Never'}`);
      
      // Test 5: Network and CORS check
      this.debugLog('requests', 'Test 5: Testing network connectivity...');
      try {
        const networkTest = await fetch('/.netlify/functions/fetch-ufc', {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        this.debugLog('requests', `Network test (OPTIONS): ${networkTest.status} ${networkTest.statusText}`);
      } catch (networkError) {
        this.debugLog('requests', `Network test failed: ${networkError.message}`);
      }
      
      // Final summary
      if (basicTest) {
        this.showFetchResult('✅ UFC API connection test completed - check debug logs for details');
      } else {
        this.showFetchResult('⚠️ UFC API connection issues detected - check debug logs');
      }
      
    } catch (error) {
      this.debugLog('requests', `UFC connection test failed: ${error.message}`);
      this.showFetchResult(`❌ UFC test error: ${error.message}`);
    }
  }

  async testNetlifyFunction(functionName = 'fetch-ufc') {
    try {
      this.debugLog('requests', `Testing Netlify function: ${functionName}`);
      
      const url = `/.netlify/functions/${functionName}`;
      this.debugLog('requests', `Function URL: ${url}`);
      
      // Test with different methods
      const methods = ['GET', 'POST', 'OPTIONS'];
      
      for (const method of methods) {
        try {
          this.debugLog('requests', `Testing ${method} request...`);
          
          const response = await fetch(url, {
            method: method,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            ...(method === 'POST' ? { body: JSON.stringify({}) } : {})
          });
          
          this.debugLog('requests', `${method} response:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          if (response.ok && method === 'GET') {
            try {
              const data = await response.json();
              this.debugLog('requests', `${method} response data:`, data);
            } catch (parseError) {
              this.debugLog('requests', `${method} response parse error: ${parseError.message}`);
            }
          }
          
        } catch (methodError) {
          this.debugLog('requests', `${method} request failed: ${methodError.message}`);
        }
      }
      
    } catch (error) {
      this.debugLog('requests', `Function test failed: ${error.message}`);
    }
  }

  initDebugWindow() {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname === '' ||
                   window.location.protocol === 'file:';
    
    this.debugLog('display', `Debug system initialized for ${isLocal ? 'local development' : 'production'} with ${isLocal ? 'CORS proxy + live data' : 'Netlify Functions'}`);
    this.debugLog('data', 'Football matches loaded', { count: this.footballMatches.length });
    this.debugLog('data', 'Available channels extracted', { channels: this.availableChannels });
    
    if (isLocal) {
      this.debugLog('requests', 'Local development: Using CORS proxy with fallback to demo data');
    } else {
      this.debugLog('requests', 'Production: Using Netlify Functions for live data fetching');
    }
    
    this.showDebugTab('requests');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM loaded, initializing Web Sports App...');
  
  try {
    const app = new WebSportsApp();
    window.sportsApp = app;
    
    window.fetchSportsData = () => app.fetchNewSportsData();
    window.fetchFootball = () => app.matchFetcher?.updateMatchData();
    window.fetchUFC = () => app.ufcFetcher?.updateUFCData();
    window.manualCleanup = () => app.manualCleanup();
    window.addMatch = (match) => app.addFootballMatch(match);
    
    console.log('✅ Web Sports App initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Web Sports App:', error);
    
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f44336; color: white; padding: 20px; border-radius: 10px; z-index: 9999; text-align: center;';
    errorDiv.innerHTML = `
      <h3>⚠️ App Initialization Error</h3>
      <p><strong>Error:</strong> ${error.message}</p>
      <p>Please refresh the page or check the console for more details.</p>
      <button onclick="window.location.reload()" style="background: white; color: #f44336; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
        🔄 Refresh Page
      </button>
    `;
    document.body.appendChild(errorDiv);
  }
});

window.addEventListener('error', (e) => {
  console.error('❌ Web Sports App Error:', e.error);
});

console.log('📺 Web Sports App script loaded successfully!');


// --- START: UFC Google Debug Button (Attempt 3) ---
(function() {
  console.log('[UFC Debug Button Attempt 3] Script block in web-app.js reached.');

  function setupUfcDebugButtonListeners() {
    console.log('[UFC Debug Button Attempt 3] setupUfcDebugButtonListeners() called.');
    const button = document.getElementById('copyUfcDebugInfoButton');
    const textbox = document.getElementById('ufcDebugOutputTextbox');

    if (!button) {
      console.error('[UFC Debug Button Attempt 3] CRITICAL: Button id="copyUfcDebugInfoButton" NOT FOUND.');
      return;
    }
    if (!textbox) {
      console.error('[UFC Debug Button Attempt 3] CRITICAL: Textarea id="ufcDebugOutputTextbox" NOT FOUND.');
      return;
    }

    console.log('[UFC Debug Button Attempt 3] Button and Textarea elements confirmed found. Adding click listener.');

    button.addEventListener('click', async () => {
      console.log('[UFC Debug Button Attempt 3] Click listener triggered.');
      textbox.value = 'Fetching UFC Debug Info... Please wait.';
      let debugDataText = '=== UFC Google Debug Info (Attempt 3) ===\n\n';
      const ufcFunctionUrl = '/.netlify/functions/fetch-ufc?debug_google_html=true';

      try {
        debugDataText += `Request URL: ${window.location.origin}${ufcFunctionUrl}\n`;
        debugDataText += `Request Timestamp: ${new Date().toISOString()}\n\n`;

        const response = await fetch(ufcFunctionUrl);
        const responseText = await response.text();

        debugDataText += `Response Status: ${response.status} ${response.statusText}\n`;
        debugDataText += `Response OK: ${response.ok}\n\n`;
        debugDataText += 'Raw JSON Response Body From Netlify Function:\n';
        debugDataText += '--------------------------------------------\n';
        debugDataText += responseText + '\n';
        debugDataText += '--------------------------------------------\n\n';

        if (response.ok) {
          try {
            const jsonData = JSON.parse(responseText);
            if (jsonData.debugInfo && jsonData.debugInfo.googleHtml) {
              debugDataText += 'Extracted Google HTML (first 20k chars from debugInfo.googleHtml):\n';
              debugDataText += '******************************************************************\n';
              debugDataText += jsonData.debugInfo.googleHtml + '\n';
              debugDataText += '******************************************************************\n\n';
            } else if (jsonData.debugInfo) {
              debugDataText += 'debugInfo object was present but did not contain googleHtml.\nFull debugInfo: ' + JSON.stringify(jsonData.debugInfo, null, 2) + '\n\n';
            } else {
              debugDataText += 'debugInfo object was NOT present in the JSON response.\n';
            }
          } catch (e) {
            debugDataText += 'Error parsing JSON response from Netlify function: ' + e.message + '\n';
            debugDataText += 'This usually means the Netlify function did not return valid JSON.\n';
          }
        }

        textbox.value = debugDataText;

        // Attempt clipboard copy as secondary action
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(debugDataText);
            alert('UFC Google Debug Info populated in textbox and copied to clipboard!');
            console.log('[UFC Debug Button Attempt 3] Info populated and copied to clipboard.');
          } else {
            throw new Error('Clipboard API not available/insecure.');
          }
        } catch (copyError) {
          alert('UFC Google Debug Info populated in textbox. Could not copy to clipboard (see console for details). Please copy from textbox.');
          console.warn('[UFC Debug Button Attempt 3] Clipboard copy failed or not available:', copyError.message);
        }

      } catch (error) {
        console.error('[UFC Debug Button Attempt 3] Error fetching/processing UFC debug info:', error);
        debugDataText += `CLIENT-SIDE Fetch Error: ${error.name} - ${error.message}\n`;
        if (error.stack) {
          debugDataText += `Client-side Stack: ${error.stack}\n`;
        }
        textbox.value = debugDataText;
        alert('Client-side error fetching UFC debug info. Check console and textarea.');
      }
    });
    console.log('[UFC Debug Button Attempt 3] Click listener ADDED.');
  }

  // Attempt to set up the button.
  // This relies on web-app.js being loaded after the button HTML element is in the DOM.
  // If web-app.js is loaded in <head> without defer, this might run too early.
  // Using DOMContentLoaded was an attempt to solve that, but if it failed,
  // a direct call or a different strategy might be needed if this also fails.
  // For now, let's try calling it directly. If it works, it means the script is loaded
  // after the DOM elements are available.
  if (document.readyState === 'loading') {
    console.log('[UFC Debug Button Attempt 3] DOM not ready, waiting for DOMContentLoaded.');
    document.addEventListener('DOMContentLoaded', setupUfcDebugButtonListeners);
  } else {
    console.log('[UFC Debug Button Attempt 3] DOM already ready, calling setup directly.');
    setupUfcDebugButtonListeners();
  }
})();
// --- END: UFC Google Debug Button (Attempt 3) ---
