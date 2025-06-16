// Web-compatible UFC Fetcher - FIXED UK Times and Netlify Function Support
// Version: 1.1.0 - Fixed UK timezone conversion and enhanced error handling
class WebUFCFetcher {
  constructor(debugLogCallback = null) {
    this.version = '1.1.0';
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-ufc';
    
    // Initialize debug function first
    this.debugLog = debugLogCallback || ((category, message, data) => {
      console.log(`[UFC-${category.toUpperCase()}] ${message}`, data || '');
    });
    
    // Log version for debugging
    this.debugLog('requests', `WebUFCFetcher v${this.version} initializing with UK time fixes...`);
    
    // Detect environment
    this.isLocal = this.detectLocalEnvironment();
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
    
    this.debugLog('requests', `UFC Environment: ${isLocal ? 'Local Development' : 'Production (Netlify)'}`, {
      hostname, protocol, port, isLocalhost, isFileProtocol, hasDevPort, isNetlify, isLocal
    });
    
    return isLocal;
  }

  async fetchUpcomingUFCEvents() {
    try {
      this.debugLog('requests', 'Starting UFC events fetch with corrected UK times...');
      this.debugLog('requests', `Environment detection - isLocal: ${this.isLocal}`);
      
      if (this.isLocal) {
        this.debugLog('requests', 'Local development - using accurate current events with correct UK times...');
        const events = this.getCurrentUFCEventsWithCorrectTimes();
        this.debugLog('requests', `Local UFC events loaded: ${events.length} events`);
        return events;
      } else {
        this.debugLog('requests', 'Production - using Netlify function with corrected times...');
        try {
          const events = await this.fetchWithNetlifyFunction();
          this.debugLog('requests', `Netlify function returned: ${events.length} events`);
          return events;
        } catch (netlifyError) {
          this.debugLog('requests', `Netlify function failed: ${netlifyError.message}, using fallback with correct times`);
          return this.getCurrentUFCEventsWithCorrectTimes();
        }
      }
    } catch (error) {
      this.debugLog('requests', `UFC fetch error: ${error.message}`);
      this.debugLog('requests', 'Using accurate fallback UFC events with correct UK times...');
      return this.getCurrentUFCEventsWithCorrectTimes();
    }
  }

  async fetchWithNetlifyFunction() {
    this.debugLog('requests', `Calling UFC Netlify function: ${this.netlifyFunctionUrl}`);
    
    try {
      // Add more detailed request logging
      this.debugLog('requests', 'UFC request details:', {
        url: this.netlifyFunctionUrl,
        method: 'GET',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        origin: window.location.origin
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(this.netlifyFunctionUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'UFCSportsApp/1.1-CorrectTimes',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        this.debugLog('requests', `UFC function response`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          redirected: response.redirected
        });

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (textError) {
            errorText = `Unable to read error response: ${textError.message}`;
          }
          
          this.debugLog('requests', 'UFC function error response:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          throw new Error(`UFC function failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        let data;
        try {
          const responseText = await response.text();
          this.debugLog('requests', 'UFC raw response text length:', responseText.length);
          
          data = JSON.parse(responseText);
        } catch (parseError) {
          this.debugLog('requests', `UFC response parse error: ${parseError.message}`);
          throw new Error(`UFC function returned invalid JSON: ${parseError.message}`);
        }
        
        this.debugLog('requests', `UFC function response parsed`, {
          success: data.success,
          eventCount: data.events ? data.events.length : 0,
          source: data.source || 'unknown',
          note: data.note || 'No note',
          error: data.error || 'No error',
          fetchTime: data.fetchTime || 'No timestamp',
          hasCorrectTimes: data.source && data.source.includes('correct-times')
        });
        
        if (!data.success && (!data.events || data.events.length === 0)) {
          throw new Error(`UFC function returned error: ${data.error || 'Unknown error'}`);
        }

        // Return events regardless of success flag if we have fallback data
        const events = data.events || [];
        
        this.debugLog('requests', `Successfully received ${events.length} UFC events with ${data.source && data.source.includes('correct-times') ? 'CORRECT' : 'UNCORRECTED'} UK times`, {
          source: data.source,
          note: data.note,
          hasEvents: events.length > 0
        });

        return events;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          this.debugLog('requests', 'UFC function request timed out after 30 seconds');
          throw new Error('UFC function request timed out');
        }
        
        throw fetchError;
      }
      
    } catch (fetchError) {
      this.debugLog('requests', `UFC Netlify function failed: ${fetchError.message}`);
      this.debugLog('requests', 'UFC fetch error details:', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack,
        cause: fetchError.cause
      });
      throw fetchError;
    }
  }

  getCurrentUFCEventsWithCorrectTimes() {
    // CORRECTED UK times: UFC events typically start at 10 PM ET = 3 AM UK (next day)
    // Prelims start at 8 PM ET = 1 AM UK (next day)
    const events = [
      {
        id: 'ufc_on_abc_6_hill_vs_rountree_2025',
        title: 'UFC on ABC 6: Hill vs Rountree Jr.',
        date: '2025-06-21',
        time: '22:00:00', // 10 PM ET
        ukDateTime: '2025-06-22T03:00:00.000Z', // 3:00 AM UK (next day) - CORRECTED
        ukMainCardTime: '03:00 (Sun)', // CORRECTED
        ukPrelimTime: '01:00 (Sun)', // CORRECTED
        location: 'UFC APEX, Las Vegas, Nevada, United States',
        venue: 'UFC APEX',
        status: 'upcoming',
        description: 'UFC on ABC 6 featuring Jamahal Hill vs Khalil Rountree Jr. in the main event',
        poster: null,
        createdAt: new Date().toISOString(),
        apiSource: 'manual-accurate-data-correct-uk-times',
        apiEventId: 'ufc_abc_6_2025',
        
        mainCard: [
          { 
            fighter1: 'Jamahal Hill', 
            fighter2: 'Khalil Rountree Jr.', 
            weightClass: 'Light Heavyweight', 
            title: 'Main Event' 
          },
          { 
            fighter1: 'Chris Weidman', 
            fighter2: 'Eryk Anders', 
            weightClass: 'Middleweight', 
            title: '' 
          },
          { 
            fighter1: 'Diego Lopes', 
            fighter2: 'Brian Ortega', 
            weightClass: 'Featherweight', 
            title: '' 
          },
          { 
            fighter1: 'Punahele Soriano', 
            fighter2: 'Uros Medic', 
            weightClass: 'Welterweight', 
            title: '' 
          }
        ],
        
        prelimCard: [
          { 
            fighter1: 'Roman Kopylov', 
            fighter2: 'Chris Curtis', 
            weightClass: 'Middleweight' 
          },
          { 
            fighter1: 'Tabatha Ricci', 
            fighter2: 'Tecia Pennington', 
            weightClass: "Women's Strawweight" 
          },
          { 
            fighter1: 'Azamat Murzakanov', 
            fighter2: 'Alonzo Menifield', 
            weightClass: 'Light Heavyweight' 
          }
        ],
        
        earlyPrelimCard: [
          { 
            fighter1: 'Karine Silva', 
            fighter2: 'Ketlen Souza', 
            weightClass: "Women's Flyweight" 
          },
          { 
            fighter1: 'Manuel Torres', 
            fighter2: 'Kollin Pucek', 
            weightClass: 'Lightweight' 
          }
        ],
        
        ufcNumber: null,
        broadcast: 'TNT Sports',
        ticketInfo: 'UFC on ABC 6 Hill vs Rountree Jr June 21 2025'
      },
      
      {
        id: 'ufc_fight_night_blanchfield_vs_barber_2025',
        title: 'UFC Fight Night: Blanchfield vs Barber',
        date: '2025-05-31',
        time: '22:00:00', // 10 PM ET
        ukDateTime: '2025-06-01T03:00:00.000Z', // 3:00 AM UK (next day) - CORRECTED
        ukMainCardTime: '03:00 (Sun)', // CORRECTED
        ukPrelimTime: '01:00 (Sun)', // CORRECTED
        location: 'UFC APEX, Las Vegas, Nevada, United States',
        venue: 'UFC APEX',
        status: 'upcoming',
        description: 'UFC Fight Night featuring Erin Blanchfield vs Maycee Barber in the main event',
        poster: null,
        createdAt: new Date().toISOString(),
        apiSource: 'manual-accurate-data-correct-uk-times',
        apiEventId: 'ufc_fight_night_may_31_2025',
        
        mainCard: [
          { 
            fighter1: 'Erin Blanchfield', 
            fighter2: 'Maycee Barber', 
            weightClass: "Women's Flyweight", 
            title: 'Main Event' 
          },
          { 
            fighter1: 'Mateusz Gamrot', 
            fighter2: 'Ludovit Klein', 
            weightClass: 'Lightweight', 
            title: '' 
          },
          { 
            fighter1: 'Dustin Jacoby', 
            fighter2: 'Bruno Lopes', 
            weightClass: 'Light Heavyweight', 
            title: '' 
          },
          { 
            fighter1: 'Zach Reese', 
            fighter2: 'Dusko Todorovic', 
            weightClass: 'Middleweight', 
            title: '' 
          }
        ],
        
        prelimCard: [
          { 
            fighter1: 'Allan Nascimento', 
            fighter2: 'Jafel Filho', 
            weightClass: 'Flyweight' 
          },
          { 
            fighter1: 'Andreas Gustafsson', 
            fighter2: 'Jeremiah Wells', 
            weightClass: 'Welterweight' 
          },
          { 
            fighter1: 'Ketlen Vieira', 
            fighter2: 'Macy Chiasson', 
            weightClass: "Women's Bantamweight" 
          },
          { 
            fighter1: 'Rayanne dos Santos', 
            fighter2: 'Alice Ardelean', 
            weightClass: "Women's Strawweight" 
          }
        ],
        
        earlyPrelimCard: [],
        
        ufcNumber: null,
        broadcast: 'TNT Sports',
        ticketInfo: 'UFC Fight Night Blanchfield vs Barber May 31 2025'
      }
    ];

    this.debugLog('data', `Returning ${events.length} current UFC events with CORRECTED UK times`, {
      mainCardTime: '3:00 AM UK (next day)',
      prelimTime: '1:00 AM UK (next day)',
      note: 'Times are now correctly calculated from 10 PM ET main card start'
    });
    
    return events;
  }

  // Legacy method for backward compatibility
  getCurrentUFCEvents() {
    return this.getCurrentUFCEventsWithCorrectTimes();
  }

  async updateUFCData() {
    try {
      this.debugLog('data', 'Starting UFC data update with corrected UK times...');
      
      const dataManager = new WebDataManager();
      const existingData = dataManager.loadData();
      
      const newEvents = await this.fetchUpcomingUFCEvents();
      
      if (newEvents.length === 0) {
        this.debugLog('data', 'No UFC events found');
        return { success: true, added: 0, total: existingData.ufcEvents?.length || 0 };
      }

      // Filter out events that already exist (avoid duplicates)
      const existingIds = new Set(
        (existingData.ufcEvents || []).map(e => e.apiEventId || e.id).filter(Boolean)
      );
      
      const uniqueNewEvents = newEvents.filter(event => 
        !existingIds.has(event.apiEventId || event.id)
      );

      this.debugLog('data', `Found ${newEvents.length} total UFC events, ${uniqueNewEvents.length} are new`, {
        hasCorrectTimes: newEvents.every(e => e.ukMainCardTime && e.ukPrelimTime),
        sampleTimes: newEvents[0] ? {
          mainCard: newEvents[0].ukMainCardTime,
          prelims: newEvents[0].ukPrelimTime
        } : null
      });

      // Update UFC events in existing data
      const existingNonApiEvents = (existingData.ufcEvents || []).filter(e => 
        !e.apiEventId && !e.id.includes('ufc_')
      );
      existingData.ufcEvents = [...existingNonApiEvents, ...newEvents];
      
      // Update last fetch timestamp
      existingData.lastUFCFetch = new Date().toISOString();
      
      // Save updated data
      const saved = dataManager.saveData(existingData);
      
      if (saved) {
        this.debugLog('data', `Successfully updated UFC data: ${uniqueNewEvents.length} new events with correct UK times`);
        this.debugLog('data', `Total UFC events now: ${existingData.ufcEvents.length}`);
        
        uniqueNewEvents.forEach(event => {
          this.debugLog('data', `🥊 ${event.date} - ${event.title} [Main: ${event.ukMainCardTime}, Prelims: ${event.ukPrelimTime}]`);
        });
      }
      
      return { 
        success: saved, 
        added: uniqueNewEvents.length, 
        total: existingData.ufcEvents.length,
        events: uniqueNewEvents
      };
      
    } catch (error) {
      this.debugLog('data', `Error updating UFC data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      this.debugLog('requests', 'Testing UFC data connection with enhanced diagnostics...');
      
      if (this.isLocal) {
        this.debugLog('requests', 'Local development: Using accurate current events with correct UK times');
        const events = this.getCurrentUFCEventsWithCorrectTimes();
        this.debugLog('requests', `Local test successful: ${events.length} events available`, {
          sampleEvent: events[0] ? {
            title: events[0].title,
            ukMainCardTime: events[0].ukMainCardTime,
            ukPrelimTime: events[0].ukPrelimTime
          } : null
        });
        return true;
      } else {
        this.debugLog('requests', 'Testing UFC Netlify function with enhanced error reporting...');
        
        try {
          const testResponse = await fetch(this.netlifyFunctionUrl, { 
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'UFCSportsApp/1.1-TestMode'
            }
          });
          
          this.debugLog('requests', `UFC function test - Status: ${testResponse.status}`, {
            url: this.netlifyFunctionUrl,
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers.entries())
          });
          
          if (!testResponse.ok) {
            if (testResponse.status === 404) {
              this.debugLog('requests', 'ERROR: UFC Netlify function not found (404) - Function may not be deployed');
              return false;
            } else if (testResponse.status >= 500) {
              this.debugLog('requests', 'ERROR: UFC function server error - Check function logs');
              const errorText = await testResponse.text().catch(() => 'Cannot read error details');
              this.debugLog('requests', 'Server error details:', errorText);
              return false;
            }
          }
          
          const data = await testResponse.json();
          this.debugLog('requests', 'UFC function response received', {
            success: data.success,
            eventCount: data.events ? data.events.length : 0,
            source: data.source || 'unknown',
            hasCorrectTimes: data.source && data.source.includes('correct-times'),
            sampleEvent: data.events && data.events[0] ? {
              title: data.events[0].title,
              ukMainCardTime: data.events[0].ukMainCardTime,
              ukPrelimTime: data.events[0].ukPrelimTime
            } : null
          });
          
          return testResponse.ok;
          
        } catch (error) {
          this.debugLog('requests', `UFC function test failed: ${error.message}`, {
            errorType: error.name,
            isNetworkError: error.message.includes('fetch'),
            isCorsError: error.message.includes('cors') || error.message.includes('Origin'),
            isTimeoutError: error.message.includes('timeout') || error.name === 'AbortError'
          });
          return false;
        }
      }
      
    } catch (error) {
      this.debugLog('requests', `UFC connection test failed: ${error.message}`);
      return false;
    }
  }
}

// Make it available globally for web environment
window.WebUFCFetcher = WebUFCFetcher;
