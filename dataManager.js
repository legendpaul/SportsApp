const fs = require('fs');
const path = require('path');

class DataManager {
  constructor() {
    this.dataFile = path.join(__dirname, 'data', 'matches.json');
    this.ensureDataFile();
  }

  ensureDataFile() {
    if (!fs.existsSync(this.dataFile)) {
      const defaultData = {
        footballMatches: [],
        ufcEvents: [],
        lastCleanup: null,
        lastFetch: null,
        lastUFCFetch: null
      };
      this.saveData(defaultData);
    }
  }

  loadData() {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading data:', error);
      return {
        footballMatches: [],
        ufcEvents: [],
        lastCleanup: null,
        lastFetch: null,
        lastUFCFetch: null
      };
    }
  }

  saveData(data) {
    try {
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  addMatch(match) {
    const data = this.loadData();
    
    // Add timestamp and unique ID
    const newMatch = {
      ...match,
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        // Use ukDateTime if available (from API)
        eventEndTime = new Date(event.ukDateTime);
        // Add 5 hours for typical UFC event duration
        eventEndTime = new Date(eventEndTime.getTime() + (5 * 60 * 60 * 1000));
      } else {
        // Fallback to date field
        eventEndTime = new Date(event.date);
        // Add 5 hours for typical UFC event duration
        eventEndTime = new Date(eventEndTime.getTime() + (5 * 60 * 60 * 1000));
      }
      
      // Add 3 hours cleanup grace period
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
    
    return { success: saved, removedCount, remaining: data.footballMatches.length + data.ufcEvents.length };
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
      totalUFCEvents: data.ufcEvents.length
    };
  }
}

module.exports = DataManager;
