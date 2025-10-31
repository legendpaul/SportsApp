const https = require('https');
const fs = require('fs');

console.log('\n🥊 UFC FIGHT CARD EXTRACTOR\n');

async function extractFights() {
  try {
    const eventUrl = process.argv[2] || 'https://www.tapology.com/fightcenter/events/132058-ufc-fight-night';
    
    console.log('📡 Fetching from Tapology...');
    console.log(`   ${eventUrl}\n`);
    
    const html = await fetch(eventUrl);
    console.log('✅ HTML received\n');
    
    // Extract event title
    const titleMatch = html.match(/<title>([^<|]+)/i);
    const eventTitle = titleMatch ? titleMatch[1].trim() : 'UFC Event';
    
    // Extract date
    const dateMatch = html.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
    const eventDate = dateMatch ? dateMatch[0] : 'TBD';
    
    // Extract location
    const locationMatch = html.match(/at\s+([^<]+?)\s+in\s+([^<\.]+)/i);
    const eventLocation = locationMatch ? `${locationMatch[1].trim()}, ${locationMatch[2].trim()}` : 'TBD';
    
    console.log('🔍 Finding cancelled section...');
    
    // Find the cancelled section by its ID
    const cancelledSectionStart = html.indexOf("id='sectionCancelled'");
    
    const cancelledFighters = new Set();
    
    if (cancelledSectionStart !== -1) {
      // Get everything after the cancelled header until the next major section
      const cancelledSectionEnd = html.indexOf('<section', cancelledSectionStart + 1000);
      const cancelledHTML = html.substring(cancelledSectionStart, cancelledSectionEnd);
      
      // Extract fighters from cancelled section
      const fighterRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-[^"]*"[^>]*>([^<]+)<\/a>/gi;
      let match;
      
      while ((match = fighterRegex.exec(cancelledHTML)) !== null) {
        const name = match[1].trim();
        cancelledFighters.add(name.toLowerCase());
      }
      
      console.log(`   Found ${cancelledFighters.size} cancelled fighters:`);
      Array.from(cancelledFighters).forEach(name => {
        console.log(`   ❌ ${name}`);
      });
      console.log('');
    } else {
      console.log('   No cancelled section found\n');
    }
    
    // Extract all fighters BEFORE the cancelled section
    console.log('🔍 Extracting active fighters...');
    const activeSectionHTML = cancelledSectionStart !== -1 
      ? html.substring(0, cancelledSectionStart) 
      : html;
    
    const fighterLinkRegex = /<a[^>]*href="\/fightcenter\/fighters\/\d+-([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const allFighters = [];
    let match;
    
    while ((match = fighterLinkRegex.exec(activeSectionHTML)) !== null) {
      const name = match[2].trim();
      allFighters.push(name);
    }
    
    console.log(`   Found ${allFighters.length} fighter mentions in active section\n`);
    
    // Deduplicate using last name
    const uniqueFighters = [];
    const seenLastNames = new Map();
    
    for (const name of allFighters) {
      const parts = name.split(/\s+/);
      const lastName = parts[parts.length - 1].toLowerCase().replace(/[.]/g, '');
      
      if (seenLastNames.has(lastName)) {
        const existingName = seenLastNames.get(lastName);
        if (name.length > existingName.length) {
          const idx = uniqueFighters.indexOf(existingName);
          if (idx !== -1) {
            uniqueFighters[idx] = name;
            seenLastNames.set(lastName, name);
          }
        }
        continue;
      }
      
      seenLastNames.set(lastName, name);
      uniqueFighters.push(name);
    }
    
    console.log(`   ${uniqueFighters.length} unique active fighters\n`);
    
    // Pair consecutive fighters
    const fights = [];
    for (let i = 0; i < uniqueFighters.length - 1; i += 2) {
      fights.push({
        fighter1: uniqueFighters[i],
        fighter2: uniqueFighters[i + 1],
        weightClass: '',
        result: null
      });
    }
    
    console.log('╔════════════════════════════════════════════╗');
    console.log(`║  ${eventTitle.substring(0, 42).padEnd(42)}  ║`);
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log(`📅 Date: ${eventDate}`);
    console.log(`📍 Location: ${eventLocation}\n`);
    console.log(`🥊 Total Fights: ${fights.length}\n`);
    
    // Display Main Card
    const mainCardSize = Math.min(6, fights.length);
    if (mainCardSize > 0) {
      console.log('🏆 MAIN CARD:');
      fights.slice(0, mainCardSize).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2}`);
      });
      console.log('');
    }
    
    // Display Prelims
    const prelimStart = mainCardSize;
    const prelimSize = Math.min(4, fights.length - prelimStart);
    if (prelimSize > 0) {
      console.log('📋 PRELIMINARY CARD:');
      fights.slice(prelimStart, prelimStart + prelimSize).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2}`);
      });
      console.log('');
    }
    
    // Display Early Prelims
    const earlyStart = prelimStart + prelimSize;
    if (earlyStart < fights.length) {
      console.log('⏰ EARLY PRELIMS:');
      fights.slice(earlyStart).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2}`);
      });
      console.log('');
    }
    
    // Save to JSON
    const eventSlug = eventUrl.split('/').pop().replace(/-/g, '_');
    const output = {
      event: eventTitle,
      date: eventDate,
      location: eventLocation,
      totalFights: fights.length,
      mainCard: fights.slice(0, mainCardSize),
      prelimCard: fights.slice(prelimStart, prelimStart + prelimSize),
      earlyPrelimCard: fights.slice(earlyStart),
      allFights: fights
    };
    
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    const filename = `${eventSlug}_${Date.now()}.json`;
    fs.writeFileSync(`./data/${filename}`, JSON.stringify(output, null, 2));
    
    console.log(`✅ Saved to: data/${filename}`);
    console.log(`\n📊 Fight Card Summary:`);
    console.log(`   • Main Card: ${output.mainCard.length} fights`);
    console.log(`   • Preliminary Card: ${output.prelimCard.length} fights`);
    console.log(`   • Early Prelims: ${output.earlyPrelimCard.length} fights`);
    console.log(`   • TOTAL: ${output.totalFights} fights\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

extractFights();