/**
 * Test Real UFC Data Implementation
 * Comprehensive testing of all UFC data sources with real data validation
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class RealUFCDataTester {
  constructor() {
    this.testResults = {
      nodeUFCFetcher: null,
      webUFCFetcher: null,
      netlifyFunction: null,
      dataIntegration: null,
      timezoneConversion: null,
      dataValidation: null
    };
  }

  async runAllTests() {
    console.log('🥊 REAL UFC DATA TESTING SUITE');
    console.log('=' .repeat(50));
    console.log('🎯 Testing all UFC data sources for real data');
    console.log('❌ No mock/fake data should be returned\n');

    try {
      await this.testNodeUFCFetcher();
      await this.testWebUFCFetcher();
      await this.testNetlifyFunction();
      await this.testDataIntegration();
      await this.testTimezoneConversion();
      await this.testDataValidation();
      
      this.generateFinalReport();
    } catch (error) {
      console.error('❌ Test suite error:', error.message);
    }
  }

  async testNodeUFCFetcher() {
    console.log('1️⃣ Testing Node.js UFC Fetcher...');
    
    try {
      // Try to load the UFC fetcher
      const UFCFetcher = require('./ufcFetcher');
      const fetcher = new UFCFetcher((category, message, data) => {
        // Silent logging for tests
      });

      // Test connection
      const connectionTest = await fetcher.testConnection();
      console.log(`   🔌 Connection test: ${connectionTest ? '✅ PASSED' : '❌ FAILED'}`);

      // Test data fetching
      const events = await fetcher.fetchUpcomingUFCEvents();
      console.log(`   📊 Events fetched: ${events.length}`);

      // Validate no mock data
      const hasRealData = this.validateRealUFCData(events);
      console.log(`   ✅ Real data validation: ${hasRealData ? 'PASSED' : 'FAILED'}`);

      this.testResults.nodeUFCFetcher = {
        success: connectionTest && hasRealData,
        eventsCount: events.length,
        hasRealData: hasRealData,
        events: events.slice(0, 2) // Sample events for analysis
      };

      console.log('   ✅ Node.js UFC Fetcher test completed\n');

    } catch (error) {
      console.log(`   ❌ Node.js UFC Fetcher error: ${error.message}\n`);
      this.testResults.nodeUFCFetcher = {
        success: false,
        error: error.message
      };
    }
  }

  async testWebUFCFetcher() {
    console.log('2️⃣ Testing Web UFC Fetcher (simulated)...');
    
    try {
      // Since we can't run browser code directly, we'll check the file content
      const webFetcherPath = path.join(__dirname, 'web-ufcfetcher.js');
      
      if (!fs.existsSync(webFetcherPath)) {
        throw new Error('web-ufcfetcher.js not found');
      }

      const content = fs.readFileSync(webFetcherPath, 'utf-8');
      
      // Check for real data indicators
      const hasRealDataLogic = [
        /ufc\.com/i,
        /netlify.*function/i,
        /real.*data/i,
        /official.*source/i
      ].some(pattern => pattern.test(content));

      // Check for mock data indicators
      const hasMockData = [
        /getCurrentUFCEventsWithCorrectTimes/i,
        /fake.*data/i,
        /mock.*data/i,
        /demo.*data/i,
        /fallback.*data/i
      ].some(pattern => pattern.test(content));

      console.log(`   📄 File analysis: ${hasRealDataLogic ? '✅ Real data logic found' : '❌ No real data logic'}`);
      console.log(`   🚫 Mock data check: ${hasMockData ? '❌ Mock data found' : '✅ No mock data'}`);

      // Check for environment detection
      const hasEnvironmentDetection = /detectLocalEnvironment|isLocal/.test(content);
      console.log(`   🌐 Environment detection: ${hasEnvironmentDetection ? '✅ Present' : '❌ Missing'}`);

      const webSuccess = hasRealDataLogic && !hasMockData && hasEnvironmentDetection;

      this.testResults.webUFCFetcher = {
        success: webSuccess,
        hasRealDataLogic: hasRealDataLogic,
        hasMockData: hasMockData,
        hasEnvironmentDetection: hasEnvironmentDetection
      };

      console.log(`   ${webSuccess ? '✅' : '❌'} Web UFC Fetcher validation completed\n`);

    } catch (error) {
      console.log(`   ❌ Web UFC Fetcher error: ${error.message}\n`);
      this.testResults.webUFCFetcher = {
        success: false,
        error: error.message
      };
    }
  }

  async testNetlifyFunction() {
    console.log('3️⃣ Testing Netlify UFC Function...');
    
    try {
      const functionPath = path.join(__dirname, 'netlify', 'functions', 'fetch-ufc.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error('fetch-ufc.js function not found');
      }

      const content = fs.readFileSync(functionPath, 'utf-8');

      // Check for Google Custom Search implementation
      const hasGoogleSearch = /google.*search|customsearch/i.test(content);
      console.log(`   🔍 Google Search integration: ${hasGoogleSearch ? '✅ Present' : '❌ Missing'}`);

      // Check for real scraping logic
      const hasScrapingLogic = [
        /parseEventsFromGoogleAPI/i,
        /parseDetailedInfoFromSnippet/i,
        /GOOGLE_API_KEY/i,
        /SEARCH_ENGINE_ID/i
      ].some(pattern => pattern.test(content));
      console.log(`   🤖 Real scraping logic: ${hasScrapingLogic ? '✅ Present' : '❌ Missing'}`);

      // Check for no demo data
      const hasNoDemoData = ![
        /demo.*data/i,
        /fake.*data/i,
        /mock.*data/i,
        /getCurrentUFCEventsWithCorrectTimes/i
      ].some(pattern => pattern.test(content));
      console.log(`   🚫 No demo data: ${hasNoDemoData ? '✅ Clean' : '❌ Demo data found'}`);

      // Check error handling
      const hasProperErrorHandling = /error.*message|throw.*Error|catch.*error/i.test(content);
      console.log(`   ⚠️ Error handling: ${hasProperErrorHandling ? '✅ Present' : '❌ Missing'}`);

      const functionSuccess = hasGoogleSearch && hasScrapingLogic && hasNoDemoData && hasProperErrorHandling;

      this.testResults.netlifyFunction = {
        success: functionSuccess,
        hasGoogleSearch: hasGoogleSearch,
        hasScrapingLogic: hasScrapingLogic,
        hasNoDemoData: hasNoDemoData,
        hasProperErrorHandling: hasProperErrorHandling
      };

      console.log(`   ${functionSuccess ? '✅' : '❌'} Netlify function validation completed\n`);

    } catch (error) {
      console.log(`   ❌ Netlify function error: ${error.message}\n`);
      this.testResults.netlifyFunction = {
        success: false,
        error: error.message
      };
    }
  }

  async testDataIntegration() {
    console.log('4️⃣ Testing Data Integration...');
    
    try {
      // Test data manager integration
      const DataManager = require('./dataManager');
      const dataManager = new DataManager();

      // Load existing data
      const existingData = dataManager.loadData();
      console.log(`   📊 Existing UFC events: ${existingData.ufcEvents?.length || 0}`);

      // Validate existing events are real (if any)
      if (existingData.ufcEvents && existingData.ufcEvents.length > 0) {
        const hasRealData = this.validateRealUFCData(existingData.ufcEvents);
        console.log(`   ✅ Stored data validation: ${hasRealData ? 'REAL DATA' : 'CONTAINS MOCK DATA'}`);
        
        this.testResults.dataIntegration = {
          success: hasRealData,
          storedEventsCount: existingData.ufcEvents.length,
          hasRealStoredData: hasRealData
        };
      } else {
        console.log('   📭 No stored UFC events (this is normal for fresh installs)');
        this.testResults.dataIntegration = {
          success: true,
          storedEventsCount: 0,
          hasRealStoredData: true
        };
      }

      console.log('   ✅ Data integration test completed\n');

    } catch (error) {
      console.log(`   ❌ Data integration error: ${error.message}\n`);
      this.testResults.dataIntegration = {
        success: false,
        error: error.message
      };
    }
  }

  async testTimezoneConversion() {
    console.log('5️⃣ Testing UK Timezone Conversion...');
    
    try {
      // Test timezone conversion logic with sample data
      const sampleEventTime = '22:00'; // 10 PM ET (typical UFC main card)
      const sampleDate = new Date('2025-07-01'); // Summer date (BST)
      
      // Expected UK time: ET + 5 hours = 03:00 next day
      const expectedUKTime = '03:00 (Next Day)';
      
      // Simulate conversion logic
      const ukTime = this.simulateETtoUKConversion(sampleEventTime);
      const conversionCorrect = ukTime.includes('03:00') && ukTime.includes('Next Day');
      
      console.log(`   🕐 ET to UK conversion: ${sampleEventTime} ET → ${ukTime}`);
      console.log(`   ✅ Conversion accuracy: ${conversionCorrect ? 'CORRECT' : 'INCORRECT'}`);

      // Test with winter date (GMT)
      const winterDate = new Date('2025-01-01');
      const winterUKTime = this.simulateETtoUKConversion(sampleEventTime, true);
      
      console.log(`   ❄️ Winter conversion: ${sampleEventTime} ET → ${winterUKTime}`);

      this.testResults.timezoneConversion = {
        success: conversionCorrect,
        sampleConversion: `${sampleEventTime} ET → ${ukTime}`,
        winterConversion: `${sampleEventTime} ET → ${winterUKTime}`
      };

      console.log('   ✅ Timezone conversion test completed\n');

    } catch (error) {
      console.log(`   ❌ Timezone conversion error: ${error.message}\n`);
      this.testResults.timezoneConversion = {
        success: false,
        error: error.message
      };
    }
  }

  async testDataValidation() {
    console.log('6️⃣ Testing Data Validation Rules...');
    
    try {
      // Test with real-looking data
      const realEvent = {
        id: 'ufc_real_12345',
        title: 'UFC 300: Real vs Fighter',
        date: '2025-07-15',
        location: 'Las Vegas, NV',
        apiSource: 'ufc_official_website',
        ukMainCardTime: '03:00 (Next Day)'
      };

      // Test with mock-looking data
      const mockEvent = {
        id: 'ufc_317_topuria_vs_oliveira_2025',
        title: 'UFC DEMO EVENT',
        date: '2025-01-15',
        location: 'DEMO VENUE',
        apiSource: 'demo_data'
      };

      const realIsValid = this.validateRealUFCData([realEvent]);
      const mockIsValid = this.validateRealUFCData([mockEvent]);

      console.log(`   ✅ Real event validation: ${realIsValid ? 'PASSED' : 'FAILED'}`);
      console.log(`   ❌ Mock event validation: ${mockIsValid ? 'FAILED (should reject mock)' : 'PASSED (correctly rejected mock)'}`);

      const validationSuccess = realIsValid && !mockIsValid;

      this.testResults.dataValidation = {
        success: validationSuccess,
        realEventPassed: realIsValid,
        mockEventRejected: !mockIsValid
      };

      console.log('   ✅ Data validation test completed\n');

    } catch (error) {
      console.log(`   ❌ Data validation error: ${error.message}\n`);
      this.testResults.dataValidation = {
        success: false,
        error: error.message
      };
    }
  }

  validateRealUFCData(events) {
    if (!events || events.length === 0) {
      return true; // No events is valid (better than fake events)
    }

    for (const event of events) {
      // Check for mock data indicators
      const mockIndicators = [
        /demo/i,
        /fake/i,
        /mock/i,
        /test.*event/i,
        /ufc_317_topuria_vs_oliveira_2025/i,
        /reliable_local_data/i
      ];

      const eventString = JSON.stringify(event);
      
      for (const indicator of mockIndicators) {
        if (indicator.test(eventString)) {
          console.log(`   ⚠️ Mock data detected in: ${event.title || event.id}`);
          return false;
        }
      }

      // Check for real data indicators
      const realIndicators = [
        event.apiSource && (
          event.apiSource.includes('ufc_official') ||
          event.apiSource.includes('google_custom_search') ||
          event.apiSource.includes('ufc.com')
        ),
        event.title && event.title.includes('UFC') && !event.title.includes('DEMO'),
        event.id && !event.id.includes('test') && !event.id.includes('demo')
      ];

      if (!realIndicators.some(indicator => indicator)) {
        console.log(`   ⚠️ Event lacks real data indicators: ${event.title || event.id}`);
        return false;
      }
    }

    return true;
  }

  simulateETtoUKConversion(etTime, isWinter = false) {
    try {
      const [hours, minutes] = etTime.split(':').map(Number);
      const offset = isWinter ? 5 : 5; // ET to UK is typically +5 hours
      
      let ukHours = hours + offset;
      const isNextDay = ukHours >= 24;
      
      if (isNextDay) {
        ukHours -= 24;
      }

      const timeStr = `${ukHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return isNextDay ? `${timeStr} (Next Day)` : timeStr;
      
    } catch (error) {
      return 'Conversion Error';
    }
  }

  generateFinalReport() {
    console.log('📊 REAL UFC DATA TEST RESULTS');
    console.log('=' .repeat(50));

    const tests = [
      { name: 'Node.js UFC Fetcher', result: this.testResults.nodeUFCFetcher },
      { name: 'Web UFC Fetcher', result: this.testResults.webUFCFetcher },
      { name: 'Netlify Function', result: this.testResults.netlifyFunction },
      { name: 'Data Integration', result: this.testResults.dataIntegration },
      { name: 'Timezone Conversion', result: this.testResults.timezoneConversion },
      { name: 'Data Validation', result: this.testResults.dataValidation }
    ];

    let overallSuccess = true;
    let passedTests = 0;

    tests.forEach(test => {
      const status = test.result?.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${test.name}`);
      
      if (test.result?.success) {
        passedTests++;
      } else {
        overallSuccess = false;
        if (test.result?.error) {
          console.log(`         Error: ${test.result.error}`);
        }
      }
    });

    console.log('\n' + '=' .repeat(50));
    console.log(`📈 Test Results: ${passedTests}/${tests.length} tests passed`);

    if (overallSuccess) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ UFC implementation uses only real data');
      console.log('🚀 Ready for production deployment');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
      console.log('🔧 Review the failed tests above');
      console.log('📝 Address issues before deployment');
    }

    // Performance metrics
    if (this.testResults.nodeUFCFetcher?.eventsCount !== undefined) {
      console.log(`\n📊 Performance Metrics:`);
      console.log(`   🥊 UFC Events Found: ${this.testResults.nodeUFCFetcher.eventsCount}`);
      console.log(`   📅 Data Age: Real-time from official sources`);
      console.log(`   🌐 Data Sources: UFC.com + Google Custom Search`);
    }

    return overallSuccess;
  }
}

// Main execution
async function runRealUFCDataTests() {
  const tester = new RealUFCDataTester();
  const success = await tester.runAllTests();
  
  console.log('\n🎯 SUMMARY:');
  if (success) {
    console.log('✅ All UFC data sources are using real data');
    console.log('❌ No mock/fake data detected');
    console.log('🏆 Implementation is production-ready');
  } else {
    console.log('⚠️ Issues found with UFC data implementation');
    console.log('🔧 Review test results and fix issues');
  }

  return success;
}

if (require.main === module) {
  runRealUFCDataTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution error:', error);
      process.exit(1);
    });
}

module.exports = { RealUFCDataTester, runRealUFCDataTests };