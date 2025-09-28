// Web-compatible Data Manager - Uses localStorage instead of file system
class WebDataManager {
  constructor() {
    this.storageKey = 'sportsApp_data';
    this.ensureData();
  }

  ensureData() {
    if (!localStorage.getItem(this.storageKey)) {
      const defaultData = {
        footballMatches: [],
        ufcEvents: [],
        lastCleanup: null,
        lastFetch: null,
        lastUFCFetch: null,
        version: '1.0.0'
      };
      this.saveData(defaultData);
    }
  }

  loadData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return this.getDefaultData();
      }
      
      const parsed = JSON.parse(data);
      
      // Ensure all required fields exist
      const footballMatches = (parsed.footballMatches || []).map(match => ({
        ...match,
        trafficLightState: match.trafficLightState || 0, // Default to 0 (no color)
        ignored: match.ignored || false, // Default to false
      }));

      return {
        footballMatches: footballMatches,
        ufcEvents: parsed.ufcEvents || [],
        lastCleanup: parsed.lastCleanup || null,
        lastFetch: parsed.lastFetch || null,
        lastUFCFetch: parsed.lastUFCFetch || null,
        version: parsed.version || '1.0.0'
      };
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return this.getDefaultData();
    }
  }

  getDefaultData() {
    return {
      footballMatches: [],
      ufcEvents: [],
      lastCleanup: null,
      lastFetch: null,
      lastUFCFetch: null,
      version: '1.0.0'
    };
  }

  saveData(data) {
    try {
      data.lastSaved = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      
      // Handle storage quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...');
        this.emergencyCleanup();
        
        // Try saving again after cleanup
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(data));
          return true;
        } catch (secondError) {
          console.error('Still unable to save after cleanup:', secondError);
          return false;
        }
      }
      
      return false;
    }
  }

  emergencyCleanup() {
    try {
      const data = this.loadData();
      
      // Keep only today's matches
      const today = new Date().toISOString().split('T')[0];
      data.footballMatches = data.footballMatches.filter(match => 
        match.matchDate === today
      );
      
      // Keep only future UFC events
      const now = new Date();
      data.ufcEvents = data.ufcEvents.filter(event => {
        const eventDate = new Date(event.ukDateTime || event.date);
        return eventDate > now;
      });
      
      this.saveData(data);
      console.log('Emergency cleanup completed');
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  addMatch(match) {
    const data = this.loadData();
    
    // Add timestamp and unique ID
    const newMatch = {
      ...match,
      id: `web_match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      matchDate: match.matchDate || new Date().toISOString().split('T')[0]
    };
    
    data.footballMatches.push(newMatch);
    return this.saveData(data);
  }

  getMatches() {
    const data = this.loadData();
    return data.footballMatches || [];
  }

  getUFCEvents() {
    const data = this.loadData();
    return data.ufcEvents || [];
  }

  updateMatchTrafficLightState(matchId, newState) {
    try {
      const data = this.loadData();
      const matchIndex = data.footballMatches.findIndex(match => match.id === matchId);

      if (matchIndex !== -1) {
        data.footballMatches[matchIndex].trafficLightState = newState;
        this.saveData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating traffic light state:', error);
      return false;
    }
  }

  ignoreMatch(matchId) {
    try {
      const data = this.loadData();
      const matchIndex = data.footballMatches.findIndex(match => match.id === matchId);

      if (matchIndex !== -1) {
        data.footballMatches[matchIndex].ignored = true;
        this.saveData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error ignoring match:', error);
      return false;
    }
  }

  cleanupOldMatches() {
    const data = this.loadData();
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    let removedCount = 0;
    
    // Filter out matches that started more than 3 hours ago
    const filteredMatches = data.footballMatches.filter(match => {
      const matchDateTime = this.getMatchDateTime(match);
      
      if (matchDateTime < threeHoursAgo) {
        console.log(`🗑️  Removing old match: ${match.teamA} vs ${match.teamB} (${match.time})`);
        removedCount++;
        return false;
      }
      return true;
    });

    // Filter out old UFC events (events that ended more than 3 hours ago)
    const filteredUFC = data.ufcEvents.filter(event => {
      let eventEndTime;
      
      if (event.ukDateTime) {
        eventEndTime = new Date(event.ukDateTime);
        eventEndTime = new Date(eventEndTime.getTime() + (5 * 60 * 60 * 1000));
      } else {
        eventEndTime = new Date(event.date);
        eventEndTime = new Date(eventEndTime.getTime() + (5 * 60 * 60 * 1000));
      }
      
      const eventEndPlusCleanup = new Date(eventEndTime.getTime() + (3 * 60 * 60 * 1000));
      
      if (eventEndPlusCleanup < now) {
        console.log(`🗑️  Removing old UFC event: ${event.title || 'UFC Event'} (${event.date})`);
        removedCount++;
        return false;
      }
      return true;
    });

    // Update data with filtered results
    data.footballMatches = filteredMatches;
    data.ufcEvents = filteredUFC;
    data.lastCleanup = now.toISOString();

    // Save updated data
    const saved = this.saveData(data);
    
    if (saved) {
      console.log(`✅ Cleanup completed: Removed ${removedCount} old events`);
      console.log(`📊 Remaining: ${data.footballMatches.length} football matches, ${data.ufcEvents.length} UFC events`);
    }
    
    return { 
      success: saved, 
      removedCount, 
      remaining: data.footballMatches.length + data.ufcEvents.length 
    };
  }

  getMatchDateTime(match) {
    // Convert match time and date to full datetime
    const [hours, minutes] = match.time.split(':');
    const matchDate = new Date(match.matchDate || new Date().toISOString().split('T')[0]);
    matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return matchDate;
  }

  getCleanupStatus() {
    const data = this.loadData();
    return {
      lastCleanup: data.lastCleanup,
      lastFetch: data.lastFetch,
      lastUFCFetch: data.lastUFCFetch,
      totalMatches: data.footballMatches.length,
      totalUFCEvents: data.ufcEvents.length,
      storageUsed: this.getStorageUsage()
    };
  }

  getStorageUsage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      const bytes = new Blob([data || '']).size;
      const kb = Math.round(bytes / 1024 * 100) / 100;
      return `${kb} KB`;
    } catch (error) {
      return 'Unknown';
    }
  }

  clearAllData() {
    try {
      localStorage.removeItem(this.storageKey);
      this.ensureData();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  exportData() {
    try {
      const data = this.loadData();
      const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sports-app-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  }

  async importData(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data structure
      if (!importData.footballMatches || !Array.isArray(importData.footballMatches)) {
        throw new Error('Invalid data format: missing footballMatches array');
      }
      
      if (!importData.ufcEvents || !Array.isArray(importData.ufcEvents)) {
        throw new Error('Invalid data format: missing ufcEvents array');
      }
      
      // Save imported data
      const saved = this.saveData({
        footballMatches: importData.footballMatches,
        ufcEvents: importData.ufcEvents,
        lastCleanup: importData.lastCleanup || null,
        lastFetch: importData.lastFetch || null,
        lastUFCFetch: importData.lastUFCFetch || null,
        version: '1.0.0'
      });
      
      if (saved) {
        console.log('✅ Data imported successfully');
        return {
          success: true,
          matches: importData.footballMatches.length,
          events: importData.ufcEvents.length
        };
      } else {
        throw new Error('Failed to save imported data');
      }
      
    } catch (error) {
      console.error('Error importing data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Make it available globally for web environment
window.WebDataManager = WebDataManager;
