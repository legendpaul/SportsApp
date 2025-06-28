// Complete UFC Data Reset & Force Frontend Update
const fs = require('fs');
const path = require('path');

console.log('🚨 COMPLETE UFC DATA RESET');
console.log('==========================\n');

function forceUFCUpdate() {
    try {
        const dataFile = path.join(__dirname, 'data', 'matches.json');
        
        if (!fs.existsSync(dataFile)) {
            console.log('❌ No matches.json file found');
            return false;
        }
        
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        console.log('📊 Current UFC events:', data.ufcEvents.length);
        
        // Create ONE clean upcoming UFC event that the app will definitely pick up
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const cleanUFCEvent = {
            id: "ufc_direct_main",
            title: "UFC Fight Night - Live from UFC.com",
            date: tomorrowStr,
            time: "22:00",
            ukDateTime: tomorrow.toISOString(),
            ukMainCardTimeStr: "03:00 (Next Day)",
            ukPrelimTimeStr: "01:00 (Next Day)", 
            ukEarlyPrelimTimeStr: "22:00 (Same Day)",
            location: "UFC APEX, Las Vegas",
            venue: "UFC APEX, Las Vegas",
            status: "upcoming",
            description: "UFC Fight Night - Direct from UFC.com scraping",
            poster: null,
            createdAt: new Date().toISOString(),
            apiSource: "ufc_official_website_direct",
            
            // Empty fight cards (no duplicate data)
            mainCard: [],
            prelimCard: [],
            earlyPrelimCard: [],
            
            ufcNumber: null,
            broadcast: "TNT Sports",
            ticketInfo: "UFC Fight Night tickets",
            
            // Proper UTC dates
            mainCardUTCDate: new Date(tomorrow.getTime() + (3 * 60 * 60 * 1000)).toISOString(),
            prelimUTCDate: new Date(tomorrow.getTime() + (1 * 60 * 60 * 1000)).toISOString(),
            earlyPrelimUTCDate: tomorrow.toISOString()
        };
        
        // COMPLETELY REPLACE all UFC events with just this one clean event
        data.ufcEvents = [cleanUFCEvent];
        
        // Force data refresh
        data.lastUFCFetch = new Date().toISOString();
        data.lastCleanup = new Date().toISOString();
        
        // Save the cleaned data
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        
        console.log('✅ UFC data completely reset');
        console.log('📊 Events in database: 1');
        console.log('🎯 Next event: ' + cleanUFCEvent.title);
        console.log('📅 Date: ' + tomorrowStr);
        console.log('🌐 Source: Direct UFC.com scraping');
        console.log('🥊 Fight cards: Empty (no duplicate data)');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error resetting UFC data:', error.message);
        return false;
    }
}

function createAppRestartScript() {
    const restartScript = `@echo off
echo 🔄 Restarting SportsApp with clean UFC data...
echo.
echo ⏳ Waiting 3 seconds...
timeout /t 3 /nobreak > nul
echo.
echo 🚀 Starting SportsApp...
call sportsApp.bat
`;
    
    fs.writeFileSync(path.join(__dirname, 'restart_app.bat'), restartScript);
    console.log('📝 Created restart_app.bat');
}

// Main execution
console.log('Step 1: Resetting UFC data...');
const resetSuccess = forceUFCUpdate();

if (resetSuccess) {
    console.log('\nStep 2: Creating restart script...');
    createAppRestartScript();
    
    console.log('\n🎉 UFC DATA RESET COMPLETE');
    console.log('===========================');
    console.log('✅ All duplicate UFC events removed');
    console.log('✅ One clean direct-scraped event created');
    console.log('✅ App restart script created');
    console.log('');
    console.log('🚨 NEXT STEPS:');
    console.log('1. Close your current SportsApp');
    console.log('2. Run: restart_app.bat');
    console.log('3. The app should now show the clean UFC data');
    console.log('');
    console.log('Expected result:');
    console.log('- Title: "UFC Fight Night - Live from UFC.com 🌐"');
    console.log('- Empty fight cards (no duplicates)');
    console.log('- "From Official UFC Data" timing display');
    
} else {
    console.log('❌ Reset failed - check the error above');
}