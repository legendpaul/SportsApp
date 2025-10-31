# Tapology UFC Event Scraper

## Overview
This scraper extracts detailed UFC event information from Tapology.com, specifically designed to scrape UFC 321 (Aspinall vs. Gane) event details.

## Files Created

### 1. `tapologyUFCScraper.js`
Main scraper module that fetches and parses UFC event data from Tapology.

**Features:**
- Fetches event details (title, date, venue, location)
- Extracts complete fight card with fighter details
- Parses fighter information including:
  - Names and nicknames
  - Fight records
  - Rankings
  - Betting odds
  - Weight classes
  - Bout types
- Saves data to JSON format

### 2. `test_tapology_ufc321.bat`
Windows batch script to easily run the scraper.

## Usage

### Option 1: Run with Batch File (Windows)
```batch
test_tapology_ufc321.bat
```

### Option 2: Run with Node.js Directly
```bash
node tapologyUFCScraper.js
```

### Option 3: Scrape Different Event
```bash
node tapologyUFCScraper.js "https://www.tapology.com/fightcenter/events/YOUR-EVENT-ID"
```

### Option 4: Use as Module
```javascript
const TapologyUFCScraper = require('./tapologyUFCScraper');

const scraper = new TapologyUFCScraper();

scraper.scrapeEvent('https://www.tapology.com/fightcenter/events/130325-ufc-321')
  .then(eventData => {
    console.log('Event:', eventData.title);
    console.log('Fights:', eventData.fights.length);
    
    // Access fight data
    eventData.fights.forEach(fight => {
      console.log(`${fight.fighter1.name} vs ${fight.fighter2.name}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## Output Structure

The scraper returns a JSON object with the following structure:

```json
{
  "title": "UFC 321: Aspinall vs. Gane",
  "subtitle": "Ultimate Fighting Championship",
  "date": "December 7, 2025",
  "venue": "Arena Name",
  "location": "City, Country",
  "promotion": "UFC",
  "fights": [
    {
      "fighter1": {
        "name": "Tom Aspinall",
        "nickname": "The Clean Monster",
        "record": "15-3-0",
        "ranking": "#1",
        "odds": "-340 (Moderate Favorite)"
      },
      "fighter2": {
        "name": "Ciryl Gane",
        "nickname": "The Vanilla Gorilla",
        "record": "12-2-0",
        "ranking": "#10",
        "odds": "+260 (Moderate Underdog)"
      },
      "weightClass": "Heavyweight",
      "boutType": "Main Event",
      "cardType": "Main Card"
    }
  ]
}
```

## Output Files

The scraper automatically saves event data to:
```
C:\svn\git\SportsApp\data\ufc_321_[timestamp].json
```

## Integration with Existing UFC Fetcher

This scraper can be integrated into your existing `ufcFetcher.js` workflow:

```javascript
// In ufcFetcher.js or a new integration file
const TapologyUFCScraper = require('./tapologyUFCScraper');

async function enhanceUFCEventWithTapology(ufcEvent) {
  const scraper = new TapologyUFCScraper();
  
  // Search for the event on Tapology
  const tapologyUrl = `https://www.tapology.com/fightcenter/events/${ufcEvent.tapologyId}`;
  
  try {
    const tapologyData = await scraper.scrapeEvent(tapologyUrl);
    
    // Merge Tapology data with existing UFC data
    return {
      ...ufcEvent,
      fights: tapologyData.fights,
      tapologyData: tapologyData
    };
  } catch (error) {
    console.error('Could not fetch Tapology data:', error.message);
    return ufcEvent;
  }
}
```

## Data Extracted

### Event Level
- Event title
- Event subtitle/promotion
- Event date
- Venue name
- Location (city, country)

### Fight Level
- Fighter names
- Fighter nicknames
- Fighter records (W-L-D)
- UFC rankings
- Betting odds
- Weight class
- Bout type (Main Event, Co-Main Event, etc.)
- Card placement (Main Card, Prelims, Early Prelims)

## Error Handling

The scraper includes comprehensive error handling:
- Network request failures
- HTML parsing errors
- Missing data fields (gracefully handles incomplete information)
- File save errors

## Logging

Debug logging is built-in and can be customized:
```javascript
const scraper = new TapologyUFCScraper((category, message, data) => {
  // Custom logging function
  console.log(`[${category}] ${message}`, data);
});
```

## Requirements

- Node.js (already installed in your project)
- https module (built-in)
- fs module (built-in)
- path module (built-in)

No additional npm packages required!

## Troubleshooting

### No fights found
- The HTML structure may have changed
- Check the debug logs for parsing errors
- Verify the Tapology URL is correct

### HTTP errors
- Check internet connection
- Tapology may be blocking requests (try again later)
- Verify the event URL exists

### File save errors
- Ensure write permissions for the data directory
- Check disk space

## Future Enhancements

Potential improvements:
1. Add caching to avoid re-fetching same events
2. Implement rate limiting for multiple events
3. Add fighter profile scraping
4. Include historical event data
5. Add retry logic for network failures
6. Support for other MMA promotions on Tapology

## UFC 321 Event Details

Target event: **UFC 321: Aspinall vs. Gane**
- URL: https://www.tapology.com/fightcenter/events/130325-ufc-321
- Main Event: Tom Aspinall vs. Ciryl Gane
- Heavyweight bout

Run the scraper to get the complete fight card with all bout details!

## License

Part of the SportsApp project.

---

**Note:** This scraper respects Tapology's website structure as of October 2025. Website changes may require updates to the parsing logic.
