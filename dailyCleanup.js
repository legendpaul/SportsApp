const DataManager = require('./dataManager');
const MatchFetcher = require('./matchFetcher');
const UFCFetcher = require('./ufcFetcher');
const path = require('path');

class DailyCleanup {
  constructor() {
    this.dataManager = new DataManager();
    this.matchFetcher = new MatchFetcher();
    this.ufcFetcher = new UFCFetcher();
    this.logFile = path.join(__dirname, 'logs', 'cleanup.log');
  }

  async runFullUpdate() {
    try {
      console.log('🚀 Starting daily update process (fetch football + UFC + cleanup)...');
      this.logMessage('='.repeat(60));
      this.logMessage(`Daily update started at ${new Date().toISOString()}`);
      
      let footballResult = { success: true, added: 0, total: 0 };
      let ufcResult = { success: true, added: 0, total: 0 };
      
      // Step 1: Fetch new football matches
      console.log('⚽ Step 1: Fetching new football matches...');
      this.logMessage('Step 1: Fetching new football matches from Football-Data.org');
      
      try {
        footballResult = await this.matchFetcher.updateMatchData();
        
        if (footballResult.success) {
          this.logMessage(`✅ Football: Successfully fetched ${footballResult.added} new matches`);
          this.logMessage(`📊 Total football matches after fetch: ${footballResult.total}`);
          console.log(`✅ Football: Fetched ${footballResult.added} new matches`);
        } else {
          this.logMessage(`⚠️ Football fetching failed: ${footballResult.error || 'Unknown error'}`);
          console.log(`⚠️ Football fetching failed: ${footballResult.error}`);
        }
      } catch (error) {
        this.logMessage(`❌ Football fetch error: ${error.message}`);
        console.log(`❌ Football fetch error: ${error.message}`);
        footballResult = { success: false, error: error.message };
      }

      // Step 2: Fetch new UFC events
      console.log('🥊 Step 2: Fetching new UFC events...');
      this.logMessage('Step 2: Fetching new UFC events from TheSportsDB');
      
      try {
        ufcResult = await this.ufcFetcher.updateUFCData();
        
        if (ufcResult.success) {
          this.logMessage(`✅ UFC: Successfully fetched ${ufcResult.added} new events`);
          this.logMessage(`📊 Total UFC events after fetch: ${ufcResult.total}`);
          console.log(`✅ UFC: Fetched ${ufcResult.added} new events`);
        } else {
          this.logMessage(`⚠️ UFC fetching failed: ${ufcResult.error || 'Unknown error'}`);
          console.log(`⚠️ UFC fetching failed: ${ufcResult.error}`);
        }
      } catch (error) {
        this.logMessage(`❌ UFC fetch error: ${error.message}`);
        console.log(`❌ UFC fetch error: ${error.message}`);
        ufcResult = { success: false, error: error.message };
      }

      // Step 3: Run cleanup
      console.log('🧹 Step 3: Running cleanup...');
      this.logMessage('Step 3: Running cleanup of old matches and events');
      
      const statusBefore = this.dataManager.getCleanupStatus();
      this.logMessage(`Before cleanup: ${statusBefore.totalMatches} football matches, ${statusBefore.totalUFCEvents} UFC events`);
      
      const cleanupResult = this.dataManager.cleanupOldMatches();
      
      if (cleanupResult.success) {
        this.logMessage(`✅ Cleanup successful: Removed ${cleanupResult.removedCount} old events`);
        this.logMessage(`📊 Remaining events: ${cleanupResult.remaining}`);
        console.log(`✅ Cleanup completed: Removed ${cleanupResult.removedCount} old events`);
      } else {
        this.logMessage('❌ Cleanup failed - could not save data');
        console.error('❌ Cleanup failed - could not save data');
      }
      
      // Summary
      const finalResult = {
        success: footballResult.success && ufcResult.success && cleanupResult.success,
        fetchedFootballMatches: footballResult.added || 0,
        fetchedUFCEvents: ufcResult.added || 0,
        removedEvents: cleanupResult.removedCount || 0,
        totalRemaining: cleanupResult.remaining || 0,
        errors: []
      };

      if (!footballResult.success) {
        finalResult.errors.push(`Football fetch error: ${footballResult.error}`);
      }
      if (!ufcResult.success) {
        finalResult.errors.push(`UFC fetch error: ${ufcResult.error}`);
      }
      if (!cleanupResult.success) {
        finalResult.errors.push('Cleanup error: Could not save data');
      }

      this.logMessage(`📈 SUMMARY: ⚽+${finalResult.fetchedFootballMatches} football, 🥊+${finalResult.fetchedUFCEvents} UFC, -${finalResult.removedEvents} old, ${finalResult.totalRemaining} remaining`);
      this.logMessage(`Daily update completed at ${new Date().toISOString()}`);
      this.logMessage('='.repeat(60));
      
      console.log(`🎉 Daily update completed! ⚽+${finalResult.fetchedFootballMatches} football, 🥊+${finalResult.fetchedUFCEvents} UFC, -${finalResult.removedEvents} old events`);
      
      return finalResult;
      
    } catch (error) {
      const errorMsg = `❌ Error during daily update: ${error.message}`;
      this.logMessage(errorMsg);
      console.error(errorMsg, error);
      return { success: false, error: error.message };
    }
  }

  async runCleanupOnly() {
    try {
      console.log('🧹 Starting cleanup-only process...');
      this.logMessage('='.repeat(50));
      this.logMessage(`Cleanup-only started at ${new Date().toISOString()}`);
      
      // Get current status before cleanup
      const statusBefore = this.dataManager.getCleanupStatus();
      this.logMessage(`Before cleanup: ${statusBefore.totalMatches} football matches, ${statusBefore.totalUFCEvents} UFC events`);
      
      // Run the cleanup
      const result = this.dataManager.cleanupOldMatches();
      
      if (result.success) {
        this.logMessage(`✅ Cleanup successful: Removed ${result.removedCount} old events`);
        this.logMessage(`📊 Remaining events: ${result.remaining}`);
        console.log(`✅ Cleanup completed successfully! Removed ${result.removedCount} old events.`);
      } else {
        this.logMessage('❌ Cleanup failed - could not save data');
        console.error('❌ Cleanup failed - could not save data');
      }
      
      this.logMessage(`Cleanup-only completed at ${new Date().toISOString()}`);
      this.logMessage('='.repeat(50));
      
      return result;
      
    } catch (error) {
      const errorMsg = `❌ Error during cleanup: ${error.message}`;
      this.logMessage(errorMsg);
      console.error(errorMsg, error);
      return { success: false, error: error.message };
    }
  }

  async runFetchOnly() {
    try {
      console.log('📥 Starting fetch-only process (football + UFC)...');
      this.logMessage('='.repeat(50));
      this.logMessage(`Fetch-only started at ${new Date().toISOString()}`);
      
      let footballResult = { success: true, added: 0, total: 0 };
      let ufcResult = { success: true, added: 0, total: 0 };
      
      // Fetch football matches
      try {
        footballResult = await this.matchFetcher.updateMatchData();
        if (footballResult.success) {
          this.logMessage(`✅ Football: Successfully fetched ${footballResult.added} new matches`);
          console.log(`✅ Football: Fetched ${footballResult.added} new matches`);
        }
      } catch (error) {
        footballResult = { success: false, error: error.message };
        this.logMessage(`❌ Football fetch failed: ${error.message}`);
      }
      
      // Fetch UFC events
      try {
        ufcResult = await this.ufcFetcher.updateUFCData();
        if (ufcResult.success) {
          this.logMessage(`✅ UFC: Successfully fetched ${ufcResult.added} new events`);
          console.log(`✅ UFC: Fetched ${ufcResult.added} new events`);
        }
      } catch (error) {
        ufcResult = { success: false, error: error.message };
        this.logMessage(`❌ UFC fetch failed: ${error.message}`);
      }
      
      const finalResult = {
        success: footballResult.success && ufcResult.success,
        fetchedFootballMatches: footballResult.added || 0,
        fetchedUFCEvents: ufcResult.added || 0,
        totalFootball: footballResult.total || 0,
        totalUFC: ufcResult.total || 0
      };
      
      if (finalResult.success) {
        console.log(`✅ Fetch completed! ⚽+${finalResult.fetchedFootballMatches} football, 🥊+${finalResult.fetchedUFCEvents} UFC`);
      } else {
        console.error(`❌ Some fetches failed`);
      }
      
      this.logMessage(`Fetch-only completed at ${new Date().toISOString()}`);
      this.logMessage('='.repeat(50));
      
      return finalResult;
      
    } catch (error) {
      const errorMsg = `❌ Error during fetch: ${error.message}`;
      this.logMessage(errorMsg);
      console.error(errorMsg, error);
      return { success: false, error: error.message };
    }
  }

  async runFootballOnly() {
    try {
      console.log('⚽ Starting football-only fetch...');
      this.logMessage('='.repeat(50));
      this.logMessage(`Football-only fetch started at ${new Date().toISOString()}`);
      
      const result = await this.matchFetcher.updateMatchData();
      
      if (result.success) {
        this.logMessage(`✅ Successfully fetched ${result.added} new football matches`);
        this.logMessage(`📊 Total football matches: ${result.total}`);
        console.log(`✅ Football fetch completed! Added ${result.added} new matches.`);
      } else {
        this.logMessage(`❌ Football fetch failed: ${result.error}`);
        console.error(`❌ Football fetch failed: ${result.error}`);
      }
      
      this.logMessage(`Football-only fetch completed at ${new Date().toISOString()}`);
      this.logMessage('='.repeat(50));
      
      return result;
      
    } catch (error) {
      const errorMsg = `❌ Error during football fetch: ${error.message}`;
      this.logMessage(errorMsg);
      console.error(errorMsg, error);
      return { success: false, error: error.message };
    }
  }

  async runUFCOnly() {
    try {
      console.log('🥊 Starting UFC-only fetch...');
      this.logMessage('='.repeat(50));
      this.logMessage(`UFC-only fetch started at ${new Date().toISOString()}`);
      
      const result = await this.ufcFetcher.updateUFCData();
      
      if (result.success) {
        this.logMessage(`✅ Successfully fetched ${result.added} new UFC events`);
        this.logMessage(`📊 Total UFC events: ${result.total}`);
        console.log(`✅ UFC fetch completed! Added ${result.added} new events.`);
      } else {
        this.logMessage(`❌ UFC fetch failed: ${result.error}`);
        console.error(`❌ UFC fetch failed: ${result.error}`);
      }
      
      this.logMessage(`UFC-only fetch completed at ${new Date().toISOString()}`);
      this.logMessage('='.repeat(50));
      
      return result;
      
    } catch (error) {
      const errorMsg = `❌ Error during UFC fetch: ${error.message}`;
      this.logMessage(errorMsg);
      console.error(errorMsg, error);
      return { success: false, error: error.message };
    }
  }

  logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    const fs = require('fs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Append to log file
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
    
    // Also output to console
    console.log(logEntry);
  }

  // Static methods for easy access
  static async manualFullUpdate() {
    const cleanup = new DailyCleanup();
    return await cleanup.runFullUpdate();
  }

  static async manualCleanup() {
    const cleanup = new DailyCleanup();
    return await cleanup.runCleanupOnly();
  }

  static async manualFetch() {
    const cleanup = new DailyCleanup();
    return await cleanup.runFetchOnly();
  }

  static async manualFootball() {
    const cleanup = new DailyCleanup();
    return await cleanup.runFootballOnly();
  }

  static async manualUFC() {
    const cleanup = new DailyCleanup();
    return await cleanup.runUFCOnly();
  }

  // Method to schedule daily updates
  scheduleDaily() {
    const ms = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    setInterval(async () => {
      await this.runFullUpdate();
    }, ms);
    
    console.log('📅 Daily update scheduled every 24 hours (fetch football + UFC + cleanup)');
  }
}

// If this script is run directly (not imported), execute based on arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';
  
  console.log(`🚀 Running SportsApp Daily Update (${mode} mode)...`);
  
  const cleanup = new DailyCleanup();
  
  let promise;
  switch (mode.toLowerCase()) {
    case 'fetch':
    case 'fetch-only':
      promise = cleanup.runFetchOnly();
      break;
    case 'football':
    case 'football-only':
      promise = cleanup.runFootballOnly();
      break;
    case 'ufc':
    case 'ufc-only':
      promise = cleanup.runUFCOnly();
      break;
    case 'cleanup':
    case 'cleanup-only':
      promise = cleanup.runCleanupOnly();
      break;
    case 'full':
    case 'both':
    default:
      promise = cleanup.runFullUpdate();
      break;
  }
  
  promise.then(result => {
    if (result.success) {
      console.log('🎉 Process completed successfully');
      process.exit(0);
    } else {
      console.error('💥 Process failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = DailyCleanup;
