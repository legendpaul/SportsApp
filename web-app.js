// Web-compatible Sports App JavaScript - No Electron dependencies
class WebSportsApp {
  constructor() {
    this.footballMatches = [];
    this.ufcMainCard = [];
    this.ufcPrelimCard = [];
    this.ufcEarlyPrelimCard = [];
    this.ufcEvents = [];
    this.dataManager = null;
    this.matchFetcher = null;
    this.lastFetchTime = null;
    this.lastUFCFetch = null;
    this.autoFetchOnStartup = true;
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
      
      this.dataManager = new WebDataManager();
      this.matchFetcher = new WebMatchFetcher((category, message, data) => {
        this.debugLog(category, message, data);
      });
      
      this.debugLog('data', 'Web fetchers initialized successfully');
      
      await this.loadMatchData();
      
      if (this.autoFetchOnStartup) {
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
      
      if (shouldFetchFootball) {
        this.debugLog('requests', 'Fetching fresh sports data...');
        this.showStartupFetchingState();
        
        let footballResult = { success: true, added: 0 };
        
        try {
          footballResult = await this.matchFetcher.updateMatchData();
          this.debugLog('requests', `Football fetch result: ${footballResult.success ? 'Success' : 'Failed'} - ${footballResult.added} new matches`);
        } catch (error) {
          this.debugLog('requests', `Football fetch error: ${error.message}`);
          footballResult = { success: false, error: error.message };
        }
        
        const totalNew = footballResult.added || 0;
        if (totalNew > 0) {
          await this.loadMatchData();
          this.showStartupFetchResult(`📥 Found ${footballResult.added || 0} football matches!`);
        } else if (footballResult.success) {
          this.showStartupFetchResult('✅ Sports data is up to date');
        } else {
          this.showStartupFetchResult('⚠️ Using cached/demo sports data');
        }
        
        await this.startupCleanup();
      } else {
        this.debugLog('requests', 'Skipping startup fetch (data is recent)');
      }
    } catch (error) {
      this.debugLog('requests', `Error during startup fetch: ${error.message}`);
      this.showStartupFetchResult('⚠️ Using cached/demo data');
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
    this.debugLog('display', 'Initializing Web Sports App...');
    
    this.updateClock();
    this.renderFootballMatches();
    this.renderUFCFights();
    this.renderChannelFilter();
    this.addFetchButton();
    this.initDebugWindow();
    this.addDataManagementButtons();
    this.updateFooterForEnvironment();
    
    setInterval(() => this.updateClock(), 1000);
    setInterval(() => this.updateMatchStatuses(), 60000);
    setInterval(() => this.autoRefreshIfNeeded(), 2 * 60 * 60 * 1000);
    
    this.debugLog('display', 'Web Sports App initialized successfully!');
    console.log('🚀 Web Sports App initialized successfully!');
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
      return matchDateTime > threeHoursAgo;
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
      `;

      container.appendChild(matchCard);
    });

    this.updateMatchesCount(filteredMatches.length, currentMatches.length);
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
      
      const footballResult = await this.matchFetcher.updateMatchData();
      
      this.debugLog('requests', 'Fetch results received', { footballResult });
      
      const totalNew = footballResult.added || 0;
      
      if (totalNew > 0) {
        this.lastFetchTime = new Date().toISOString();
        
        await this.loadMatchData();
        this.renderFootballMatches();
        this.renderUFCFights();
        this.renderChannelFilter();
        this.updateStorageInfo();
        
        this.showFetchResult(`✅ Added ${footballResult.added || 0} football matches!`);
      } else if (footballResult.success) {
        this.showFetchResult('✅ Sports data is up to date');
      } else {
        this.showFetchResult(`❌ Failed to fetch: ${footballResult.error || 'Unknown error'}`);
      }
      
      this.showFetchingState(false);
      return { 
        success: footballResult.success, 
        football: footballResult
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
        this.renderUFCFights();
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
  const app = new WebSportsApp();
  
  window.sportsApp = app;
  
  window.fetchSportsData = () => app.fetchNewSportsData();
  window.fetchFootball = () => app.matchFetcher?.updateMatchData();
  window.manualCleanup = () => app.manualCleanup();
  window.addMatch = (match) => app.addFootballMatch(match);
});

window.addEventListener('error', (e) => {
  console.error('❌ Web Sports App Error:', e.error);
});

console.log('📺 Web Sports App script loaded successfully!');
