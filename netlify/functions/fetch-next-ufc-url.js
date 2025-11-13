const https = require('https');

/**
 * Netlify Function to scrape the next UFC event URL from Tapology
 * Fetches https://www.tapology.com/fightcenter?group=ufc
 * and extracts the first event link from the fightcenterEvents class
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Fetching Tapology fight center page...');
    const html = await fetchHTML('https://www.tapology.com/fightcenter?group=ufc');

    // Extract the first event URL from fightcenterEvents class
    const eventUrl = extractFirstEventUrl(html);

    if (!eventUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No UFC event found in fightcenterEvents'
        })
      };
    }

    console.log('Found next UFC event URL:', eventUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: eventUrl
      })
    };
  } catch (error) {
    console.error('Error fetching next UFC URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Fetch HTML content from a URL
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const req = https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Extract the first event URL from the fightcenterEvents class
 * Looks for links within elements with class="fightcenterEvents"
 */
function extractFirstEventUrl(html) {
  // Find the fightcenterEvents section
  // Pattern: <div class="fightcenterEvents">...</div> or similar
  const fightcenterEventsMatch = html.match(/class="fightcenterEvents"[^>]*>([\s\S]*?)(?=<div class="(?!fightCard)|<\/div>\s*<\/div>)/);

  if (!fightcenterEventsMatch) {
    console.log('Could not find fightcenterEvents section');
    // Try alternative pattern - find first event link in the page
    const linkPattern = /href="(\/fightcenter\/events\/\d+-[^"]+)"/;
    const match = html.match(linkPattern);
    if (match) {
      return `https://www.tapology.com${match[1]}`;
    }
    return null;
  }

  const fightcenterContent = fightcenterEventsMatch[1];

  // Extract the first event URL
  // Pattern: href="/fightcenter/events/132653-ufc-322"
  const linkPattern = /href="(\/fightcenter\/events\/\d+-[^"]+)"/;
  const match = fightcenterContent.match(linkPattern);

  if (match) {
    const relativeUrl = match[1];
    return `https://www.tapology.com${relativeUrl}`;
  }

  return null;
}
