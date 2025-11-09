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
    
    // Extract fights with weight classes from bout sections
    console.log('🔍 Extracting active fights...');
    const activeSectionHTML = cancelledSectionStart !== -1 
      ? html.substring(0, cancelledSectionStart) 
      : html;
    
    const fights = [];
    
    // Extract bouts using <li class="bout"> structure
    const boutRegex = /<li[^>]*class="[^"]*bout[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let boutMatch;
    
    while ((boutMatch = boutRegex.exec(activeSectionHTML)) !== null) {
      const boutHTML = boutMatch[1];
      
      // Extract fighter names from this bout
      const nameRegex = /<span[^>]*class="[^"]*name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/gi;
      const fighters = [];
      let nameMatch;
      
      while ((nameMatch = nameRegex.exec(boutHTML)) !== null) {
        fighters.push(nameMatch[1].trim());
      }
      
      // Extract weight class (look for patterns like "170 lbs" or "135 lbs")
      const weightRegex = /(\d+)\s*lbs/i;
      const weightMatch = boutHTML.match(weightRegex);
      const weightClass = weightMatch ? `${weightMatch[1]} lbs` : '';
      
      // Only add if we have both fighters
      if (fighters.length >= 2) {
        fights.push({
          fighter1: fighters[0],
          fighter2: fighters[1],
          weightClass: weightClass,
          result: null
        });
      }
    }
    
    console.log(`   Found ${fights.length} bouts with weight classes\n`);
    
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
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2} (${f.weightClass})`);
      });
      console.log('');
    }
    
    // Display Prelims
    const prelimStart = mainCardSize;
    const prelimSize = Math.min(4, fights.length - prelimStart);
    if (prelimSize > 0) {
      console.log('📋 PRELIMINARY CARD:');
      fights.slice(prelimStart, prelimStart + prelimSize).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2} (${f.weightClass})`);
      });
      console.log('');
    }
    
    // Display Early Prelims
    const earlyStart = prelimStart + prelimSize;
    if (earlyStart < fights.length) {
      console.log('⏰ EARLY PRELIMS:');
      fights.slice(earlyStart).forEach((f, i) => {
        console.log(`  ${i+1}. ${f.fighter1} vs ${f.fighter2} (${f.weightClass})`);
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
