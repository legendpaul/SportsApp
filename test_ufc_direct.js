// UFC Data Cleanup & Test Script
// Run this to clean duplicate data and test the new direct UFC.com scraper

const fs = require('fs');
const path = require('path');

console.log('🥊 UFC Data Cleanup & Direct Scraper Test');
console.log('==========================================\n');

// Step 1: Clean existing duplicate UFC data
function cleanUFCData() {
    try {
        const dataFile = path.join(__dirname, 'data', 'matches.json');
        
        if (!fs.existsSync(dataFile)) {
            console.log('❌ No matches.json file found');
            return false;
        }
        
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        console.log(`📊 Current data: ${data.ufcEvents.length} UFC events`);
        
        // Remove events with duplicate fighter data (Google API artifacts)
        const cleanedEvents = data.ufcEvents.filter(event => {
            // Keep UFC 317 (has unique data)
            if (event.id === 'ufc_317_corrected') {
                console.log(`✅ Keeping: ${event.title} (has unique fight data)`);
                return true;
            }
            
            // Check if event has duplicate/template fighter data
            const hasDuplicateData = event.mainCard && event.mainCard.length > 0 && 
                event.mainCard.some(fight => 
                    fight.fighter1 === 'Jamahal Hill' && fight.fighter2 === 'Khalil Rountree Jr.'
                );
            
            if (hasDuplicateData) {
                console.log(`🗑️  Removing: ${event.title} (has duplicate Google API fighter data)`);
                return false;
            } else {
                console.log(`✅ Keeping: ${event.title} (no duplicate data detected)`);
                return true;
            }
        });
        
        // Update data
        data.ufcEvents = cleanedEvents;
        data.lastUFCFetch = null; // Reset to force fresh fetch
        
        // Save cleaned data
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        
        console.log(`\n✅ Cleaned UFC data: ${data.ufcEvents.length} events remaining`);
        console.log('🔄 Reset lastUFCFetch to force fresh data on next fetch\n');
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error cleaning UFC data: ${error.message}`);
        return false;
    }
}

// Step 2: Test the new direct UFC scraper
async function testDirectUFCScraper() {
    try {
        console.log('🔍 Testing new direct UFC.com scraper...\n');
        
        const UFCFetcher = require('./ufcFetcher');
        
        const logger = (category, message, data) => {
            console.log(`[${category.toUpperCase()}] ${message}`);
            if (data && typeof data === 'object') {
                console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
            }
        };
        
        const fetcher = new UFCFetcher(logger);
        
        // Test connection first
        console.log('🌐 Testing UFC.com connection...');
        const connected = await fetcher.testConnection();
        
        if (!connected) {
            console.log('❌ Cannot connect to UFC.com - check internet connection');
            return false;
        }
        
        console.log('✅ UFC.com connection successful\n');
        
        // Test data fetch
        console.log('📥 Testing UFC data fetch...');
        const result = await fetcher.updateUFCData();
        
        if (result.success) {
            console.log(`\n✅ UFC fetch successful!`);
            console.log(`   📊 New events added: ${result.added}`);
            console.log(`   📊 Total events: ${result.total}`);
            
            if (result.events && result.events.length > 0) {
                console.log('\n🎯 New events found:');
                result.events.forEach(event => {
                    console.log(`   • ${event.title}`);
                    console.log(`     Date: ${event.date}`);
                    console.log(`     Venue: ${event.venue}`);
                    console.log(`     Source: ${event.apiSource}`);
                    console.log('');
                });
            }
            
            return true;
        } else {
            console.log(`❌ UFC fetch failed: ${result.error}`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Error testing UFC scraper: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Step 3: Verify app integration
function verifyAppIntegration() {
    try {
        console.log('🔗 Verifying app integration...\n');
        
        const dataFile = path.join(__dirname, 'data', 'matches.json');
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        console.log(`📊 Current UFC events in database: ${data.ufcEvents.length}`);
        
        data.ufcEvents.forEach(event => {
            console.log(`   • ${event.title} (${event.apiSource})`);
            console.log(`     Main Card: ${event.mainCard.length} fights`);
            console.log(`     Prelims: ${event.prelimCard.length} fights`);
            console.log(`     Early Prelims: ${event.earlyPrelimCard.length} fights`);
            console.log('');
        });
        
        const hasDirectScrapedData = data.ufcEvents.some(event => 
            event.apiSource && event.apiSource.includes('ufc_official_website_direct')
        );
        
        if (hasDirectScrapedData) {
            console.log('✅ Direct UFC.com scraped data found in database');
        } else {
            console.log('⚠️  No direct UFC.com scraped data yet - try fetching again');
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error verifying app integration: ${error.message}`);
        return false;
    }
}

// Main execution
async function main() {
    console.log('Starting UFC cleanup and test process...\n');
    
    // Step 1: Clean data
    console.log('Step 1: Cleaning duplicate UFC data');
    console.log('==================================');
    const cleanSuccess = cleanUFCData();
    
    if (!cleanSuccess) {
        console.log('❌ Data cleanup failed - stopping');
        return;
    }
    
    // Step 2: Test scraper
    console.log('Step 2: Testing direct UFC.com scraper');
    console.log('======================================');
    const testSuccess = await testDirectUFCScraper();
    
    // Step 3: Verify integration
    console.log('Step 3: Verifying app integration');
    console.log('=================================');
    const verifySuccess = verifyAppIntegration();
    
    // Summary
    console.log('SUMMARY');
    console.log('=======');
    console.log(`Data cleanup: ${cleanSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`UFC scraper test: ${testSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`App integration: ${verifySuccess ? '✅ Success' : '❌ Failed'}`);
    
    if (cleanSuccess && testSuccess && verifySuccess) {
        console.log('\n🎉 All tests passed! Your app should now use direct UFC.com scraping.');
        console.log('💡 Restart your app and click "Refresh Sports Data" to see the changes.');
    } else {
        console.log('\n⚠️  Some issues found. Check the logs above for details.');
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { cleanUFCData, testDirectUFCScraper, verifyAppIntegration };
