/**
 * Performance Optimization for Real Data Sports App
 * Implements caching, request throttling, and performance monitoring
 */

const fs = require('fs');
const path = require('path');

class PerformanceOptimizer {
  constructor() {
    this.cacheDir = path.join(__dirname, 'cache');
    this.requestLog = [];
    this.cacheSettings = {
      ufcEventsTTL: 30 * 60 * 1000, // 30 minutes
      footballMatchesTTL: 15 * 60 * 1000, // 15 minutes
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    };
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Smart caching system for API responses
   */
  async getCachedData(key, ttl = this.cacheSettings.ufcEventsTTL) {
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const age = Date.now() - cacheData.timestamp;

      if (age > ttl) {
        // Cache expired
        fs.unlinkSync(cacheFile);
        return null;
      }

      console.log(`📦 Cache hit for ${key} (age: ${Math.round(age / 1000)}s)`);
      return cacheData.data;

    } catch (error) {
      console.warn(`⚠️ Cache read error for ${key}:`, error.message);
      return null;
    }
  }

  async setCachedData(key, data, metadata = {}) {
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      const cacheData = {
        timestamp: Date.now(),
        data: data,
        metadata: {
          source: metadata.source || 'unknown',
          size: JSON.stringify(data).length,
          ...metadata
        }
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached ${key} (${cacheData.metadata.size} bytes)`);

      // Cleanup if cache is getting large
      await this.cleanupCache();

    } catch (error) {
      console.warn(`⚠️ Cache write error for ${key}:`, error.message);
    }
  }

  /**
   * Request throttling to prevent API abuse
   */
  async throttleRequest(endpoint, minInterval = 2000) {
    const now = Date.now();
    const lastRequest = this.requestLog.find(r => r.endpoint === endpoint);

    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest.timestamp;
      
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        console.log(`⏳ Throttling ${endpoint} request - waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Update request log
    const existingIndex = this.requestLog.findIndex(r => r.endpoint === endpoint);
    if (existingIndex >= 0) {
      this.requestLog[existingIndex].timestamp = now;
    } else {
      this.requestLog.push({ endpoint, timestamp: now });
    }

    // Keep request log manageable
    if (this.requestLog.length > 100) {
      this.requestLog = this.requestLog.slice(-50);
    }
  }

  /**
   * Optimized UFC data fetching with caching
   */
  async getOptimizedUFCData() {
    const cacheKey = 'ufc_events_latest';
    
    // Try cache first
    let cachedData = await this.getCachedData(cacheKey, this.cacheSettings.ufcEventsTTL);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    // Throttle requests to UFC sources
    await this.throttleRequest('ufc_official', 5000);

    try {
      const UFCFetcher = require('./ufcFetcher');
      const fetcher = new UFCFetcher();
      
      console.log('🔄 Fetching fresh UFC data...');
      const events = await fetcher.fetchUpcomingUFCEvents();
      
      // Cache the results
      await this.setCachedData(cacheKey, events, {
        source: 'ufc_official',
        eventCount: events.length,
        fetchTime: new Date().toISOString()
      });

      return { data: events, source: 'fresh' };

    } catch (error) {
      console.error('❌ UFC data fetch failed:', error.message);
      
      // Try to return stale cache as fallback
      const staleData = await this.getCachedData(cacheKey, Infinity);
      if (staleData) {
        console.log('📦 Using stale cache data as fallback');
        return { data: staleData, source: 'stale_cache' };
      }
      
      throw error;
    }
  }

  /**
   * Optimized football data fetching with multiple source fallback
   */
  async getOptimizedFootballData() {
    const cacheKey = 'football_matches_today';
    
    // Try cache first
    let cachedData = await this.getCachedData(cacheKey, this.cacheSettings.footballMatchesTTL);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    const sources = [
      { name: 'web_scraping', delay: 2000 },
      { name: 'football_api', delay: 3000 },
      { name: 'api_football', delay: 3000 }
    ];

    for (const source of sources) {
      try {
        await this.throttleRequest(source.name, source.delay);
        
        console.log(`🔄 Trying football source: ${source.name}`);
        
        let matches = [];
        
        if (source.name === 'web_scraping') {
          const MatchFetcher = require('./matchFetcher');
          const fetcher = new MatchFetcher();
          matches = await fetcher.fetchTodaysMatches();
        }
        // Add other source implementations here...

        if (matches && matches.length > 0) {
          // Cache successful results
          await this.setCachedData(cacheKey, matches, {
            source: source.name,
            matchCount: matches.length,
            fetchTime: new Date().toISOString()
          });

          return { data: matches, source: source.name };
        }

      } catch (error) {
        console.warn(`⚠️ Source ${source.name} failed:`, error.message);
        continue; // Try next source
      }
    }

    // All sources failed - try stale cache
    const staleData = await this.getCachedData(cacheKey, Infinity);
    if (staleData) {
      console.log('📦 Using stale football cache as fallback');
      return { data: staleData, source: 'stale_cache' };
    }

    return { data: [], source: 'none' };
  }

  /**
   * Cache cleanup and maintenance
   */
  async cleanupCache() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let totalSize = 0;
      const fileStats = [];

      // Collect file statistics
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        fileStats.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        });
      }

      // Check if cleanup is needed
      if (totalSize > this.cacheSettings.maxCacheSize) {
        console.log(`🧹 Cache cleanup needed (${totalSize} bytes > ${this.cacheSettings.maxCacheSize})`);
        
        // Sort by modification time (oldest first)
        fileStats.sort((a, b) => a.modified - b.modified);
        
        // Remove oldest files until under size limit
        let removedSize = 0;
        for (const file of fileStats) {
          if (totalSize - removedSize <= this.cacheSettings.maxCacheSize * 0.8) {
            break;
          }
          
          fs.unlinkSync(file.path);
          removedSize += file.size;
          console.log(`🗑️ Removed old cache file: ${file.name}`);
        }
        
        console.log(`✅ Cache cleanup complete (freed ${removedSize} bytes)`);
      }

    } catch (error) {
      console.warn('⚠️ Cache cleanup error:', error.message);
    }
  }

  /**
   * Performance monitoring and reporting
   */
  generatePerformanceReport() {
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('=' .repeat(40));

    try {
      const cacheFiles = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      let totalCacheSize = 0;
      let oldestCache = Date.now();
      let newestCache = 0;

      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalCacheSize += stats.size;
        
        if (stats.mtime.getTime() < oldestCache) {
          oldestCache = stats.mtime.getTime();
        }
        if (stats.mtime.getTime() > newestCache) {
          newestCache = stats.mtime.getTime();
        }
      }

      console.log(`📦 Cache Status:`);
      console.log(`   Files: ${cacheFiles.length}`);
      console.log(`   Total size: ${Math.round(totalCacheSize / 1024)} KB`);
      console.log(`   Oldest cache: ${new Date(oldestCache).toLocaleString()}`);
      console.log(`   Newest cache: ${new Date(newestCache).toLocaleString()}`);

      console.log(`\n🔄 Request Statistics:`);
      console.log(`   Total requests logged: ${this.requestLog.length}`);
      
      if (this.requestLog.length > 0) {
        const recentRequests = this.requestLog.filter(r => 
          Date.now() - r.timestamp < 60 * 60 * 1000 // Last hour
        );
        console.log(`   Requests in last hour: ${recentRequests.length}`);
      }

      console.log(`\n💡 Optimization Tips:`);
      if (totalCacheSize < 1024 * 1024) {
        console.log(`   ✅ Cache size is optimal`);
      }
      if (cacheFiles.length > 20) {
        console.log(`   💡 Consider more aggressive cache cleanup`);
      }
      if (this.requestLog.length > 50) {
        console.log(`   💡 High request volume - ensure throttling is working`);
      }

    } catch (error) {
      console.error('❌ Error generating performance report:', error.message);
    }
  }

  /**
   * Optimize data manager settings
   */
  optimizeDataManager() {
    console.log('\n🔧 Optimizing Data Manager settings...');
    
    const optimizations = {
      // Reduce cleanup frequency for better performance
      cleanupInterval: 2 * 60 * 60 * 1000, // 2 hours instead of 3
      
      // Optimize storage for real data
      maxStoredEvents: {
        football: 50, // Enough for several days
        ufc: 10 // UFC events are less frequent
      },
      
      // Background update intervals
      updateIntervals: {
        football: 30 * 60 * 1000, // 30 minutes
        ufc: 60 * 60 * 1000 // 1 hour
      }
    };

    return optimizations;
  }
}

/**
 * Web-compatible performance optimizer
 */
class WebPerformanceOptimizer {
  constructor() {
    this.memoryCache = new Map();
    this.requestLog = [];
    this.cacheSettings = {
      ufcEventsTTL: 30 * 60 * 1000,
      footballMatchesTTL: 15 * 60 * 1000,
      maxMemoryEntries: 20
    };
  }

  getCachedData(key, ttl) {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    console.log(`📦 Memory cache hit for ${key}`);
    return cached.data;
  }

  setCachedData(key, data, metadata = {}) {
    // Implement LRU cache
    if (this.memoryCache.size >= this.cacheSettings.maxMemoryEntries) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      timestamp: Date.now(),
      data: data,
      metadata: metadata
    });

    console.log(`💾 Cached ${key} in memory`);
  }

  async throttleRequest(endpoint, minInterval = 2000) {
    const now = Date.now();
    const lastRequest = this.requestLog.find(r => r.endpoint === endpoint);

    if (lastRequest && (now - lastRequest.timestamp) < minInterval) {
      const waitTime = minInterval - (now - lastRequest.timestamp);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update request log
    this.requestLog = this.requestLog.filter(r => r.endpoint !== endpoint);
    this.requestLog.push({ endpoint, timestamp: Date.now() });

    // Keep log manageable
    if (this.requestLog.length > 20) {
      this.requestLog = this.requestLog.slice(-10);
    }
  }
}

// Main execution for testing
if (require.main === module) {
  (async () => {
    console.log('🚀 Running Performance Optimization Tests...\n');
    
    const optimizer = new PerformanceOptimizer();
    
    try {
      // Test UFC data optimization
      console.log('1️⃣ Testing UFC data optimization...');
      const ufcResult = await optimizer.getOptimizedUFCData();
      console.log(`   Result: ${ufcResult.data.length} events from ${ufcResult.source}`);
      
      // Test football data optimization
      console.log('\n2️⃣ Testing football data optimization...');
      const footballResult = await optimizer.getOptimizedFootballData();
      console.log(`   Result: ${footballResult.data.length} matches from ${footballResult.source}`);
      
      // Generate performance report
      optimizer.generatePerformanceReport();
      
      console.log('\n✅ Performance optimization test completed');
      
    } catch (error) {
      console.error('❌ Performance test error:', error.message);
    }
  })();
}

// Export for use in other modules
module.exports = { PerformanceOptimizer, WebPerformanceOptimizer };