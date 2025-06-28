# 🏈 UK Sports TV Guide - Real Data Edition

A comprehensive sports TV guide for UK viewers showing **real, live data** for football matches and UFC events. No mock or demo data - everything is sourced from official channels and APIs.

## 🎯 Features

### ⚽ Football Matches
- **Real-time data** from official football sources
- **UK TV channels** with accurate broadcast information
- **Multiple data sources** for maximum reliability
- **Today's matches** with live timing information

### 🥊 UFC Events
- **Official UFC.com** data scraping
- **Google Custom Search API** for comprehensive event details
- **UK timezone conversion** for all event times
- **Detailed fight cards** with fighter information
- **Multiple card types** (Main Card, Prelims, Early Prelims)

### 🌐 Deployment Options
- **Web version** for browsers (Netlify deployment)
- **Desktop app** using Electron
- **Local development** with CORS proxy support

## 🚀 Quick Start

### Web Deployment (Recommended)
1. **Deploy to Netlify:**
   ```bash
   # Connect your repository to Netlify
   # Enable automatic deployments
   ```

2. **Configure environment variables** (optional but recommended):
   ```
   GOOGLE_API_KEY=your_google_api_key
   SEARCH_ENGINE_ID=your_search_engine_id
   FOOTBALL_DATA_API_KEY=your_football_api_key
   ```

3. **Access your app:**
   - Main app: `https://your-site.netlify.app/`
   - Test page: `https://your-site.netlify.app/test-real-data.html`

### Local Development
1. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd SportsApp
   npm install
   ```

2. **Start development server:**
   ```bash
   # Web version
   npm run serve
   # or
   python -m http.server 8000

   # Desktop version
   npm run desktop
   ```

3. **Test the setup:**
   ```bash
   # Test all systems
   node verify_no_mock_data.js
   
   # Test UFC data specifically
   node test_real_ufc_data.js
   
   # Test web functionality
   open http://localhost:8000/test-real-data.html
   ```

## 📊 Data Sources

### 🏈 Football Data
| Source | Type | Coverage |
|--------|------|----------|
| **live-footballontv.com** | Web Scraping | UK TV Schedules |
| **Football-Data.org** | REST API | Professional Leagues |
| **API-Football** | REST API | Global Competitions |
| **OpenLigaDB** | REST API | German Bundesliga |

### 🥊 UFC Data
| Source | Type | Coverage |
|--------|------|----------|
| **UFC.com/events** | Web Scraping | Official Event Pages |
| **Google Custom Search** | API | Event Details & Times |
| **UFC.com Event Details** | Direct Scraping | Fight Cards & Timing |

## 🔧 Configuration

### Environment Variables
Create a `.env` file for enhanced functionality:

```env
# Google Custom Search (for UFC data)
GOOGLE_API_KEY=your_google_api_key_here
SEARCH_ENGINE_ID=your_search_engine_id_here

# Optional Football APIs
FOOTBALL_DATA_API_KEY=your_football_data_key
API_FOOTBALL_KEY=your_api_football_key
```

### Getting API Keys

#### Google Custom Search (UFC Events)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Custom Search API"
4. Create credentials (API Key)
5. Set up Custom Search Engine at [cse.google.com](https://cse.google.com/)

#### Football-Data.org (Optional)
1. Register at [football-data.org](https://www.football-data.org/client/register)
2. Get your free API key
3. Supports Premier League, Championship, and major European leagues

#### API-Football (Alternative)
1. Register at [api-football.com](https://www.api-football.com/)
2. Get API key from dashboard
3. Comprehensive football data worldwide

## 🧪 Testing & Validation

### Automated Testing
```bash
# Verify no mock data exists
node verify_no_mock_data.js

# Test UFC data fetching
node test_real_ufc_data.js

# Test football data
node test_fetch.js

# Run comprehensive tests
npm run test
```

### Manual Testing
1. **Web Interface Test:**
   - Visit `/test-real-data.html`
   - Test all data sources
   - Verify no demo data appears

2. **API Endpoint Tests:**
   - `/.netlify/functions/fetch-football`
   - `/.netlify/functions/fetch-football-api`
   - `/.netlify/functions/fetch-ufc`

3. **Error Handling:**
   - Disconnect internet
   - Verify graceful error messages
   - Confirm no fallback to fake data

## 📁 Project Structure

```
SportsApp/
├── 🌐 Web Files
│   ├── index.html              # Main web interface
│   ├── web-matchfetcher.js     # Football data fetching
│   ├── web-ufcfetcher.js       # UFC data fetching
│   ├── web-datamanager.js      # Browser storage
│   └── test-real-data.html     # Testing interface
│
├── 🖥️ Desktop Files
│   ├── main.js                 # Electron main process
│   ├── desktop-index.html      # Desktop interface
│   ├── matchFetcher.js         # Node.js football fetcher
│   └── ufcFetcher.js          # Node.js UFC fetcher
│
├── ☁️ Netlify Functions
│   ├── fetch-football.js       # Web scraping function
│   ├── fetch-football-api.js   # API aggregation function
│   └── fetch-ufc.js           # UFC data function
│
├── 🧪 Testing & Validation
│   ├── verify_no_mock_data.js  # Mock data verification
│   ├── test_real_ufc_data.js   # UFC testing suite
│   └── test-real-data.html     # Web testing interface
│
└── 📊 Data & Config
    ├── data/matches.json       # Persistent storage
    ├── .env                    # Environment variables
    └── dataManager.js          # Data persistence
```

## 🎯 Real Data Guarantee

### ✅ What You Get
- **100% real data** from official sources
- **No mock or demo events** ever displayed
- **Live updates** from actual sports schedules
- **Accurate UK timings** for all events
- **Real fight cards** and athlete information

### ❌ What's Removed
- All demo/mock data functions
- Fallback fake events
- Test event placeholders
- Hardcoded event data
- Simulated match information

### 🔍 Validation
The app includes comprehensive validation to ensure only real data is displayed:
- Source verification for all events
- Pattern matching to reject mock data
- API source validation
- Real-time data freshness checks

## 🌍 UK-Specific Features

### 📺 TV Channel Mapping
- **TNT Sports** (formerly BT Sport)
- **Sky Sports** (Main Event, Football, Premier League)
- **BBC iPlayer** and **BBC Red Button**
- **ITV** and **ITV4**
- **Amazon Prime Video** (Premier League)

### 🕐 Time Conversion
- **Automatic timezone conversion** to UK time
- **BST/GMT handling** for seasonal changes
- **"Next day" indicators** for late-night events
- **Multiple time formats** (12/24 hour)

### 🏆 Sports Coverage
- **Premier League** and **Championship**
- **Champions League** and **Europa League**
- **FA Cup** and **Carabao Cup**
- **International matches** (England, Scotland, Wales)
- **UFC events** with UK broadcast times

## 🚨 Troubleshooting

### No Data Displayed
1. **This is normal behavior** - no fake data is shown
2. Check the test page: `/test-real-data.html`
3. Review browser console for detailed logs
4. Verify network connectivity

### UFC Events Missing
1. Check Google API configuration
2. Verify UFC.com accessibility
3. Review Netlify function logs
4. No events might mean no scheduled UFC events

### Football Matches Missing
1. May be no matches scheduled for today
2. Check multiple data sources via test page
3. Verify API keys if using premium sources
4. Check Netlify function deployment

### Local Development Issues
1. **CORS errors are expected** - use test page
2. Consider using CORS proxy for development
3. Deploy to Netlify for full functionality
4. Desktop app avoids CORS issues

## 📈 Performance & Reliability

### Caching Strategy
- **Smart caching** to reduce API calls
- **Automatic cleanup** of old events
- **Persistent storage** across sessions
- **Background updates** every 30 minutes

### Error Handling
- **Graceful degradation** when sources fail
- **Multiple fallback sources** for reliability
- **Clear error messages** for users
- **Detailed logging** for debugging

### Rate Limiting
- **Respectful API usage** within limits
- **Request throttling** to prevent blocking
- **Automatic retry** with exponential backoff
- **Source rotation** for load distribution

## 🛠️ Development

### Adding New Data Sources
1. Create new fetcher function
2. Add to source rotation
3. Update validation rules
4. Add comprehensive tests

### Extending Sports Coverage
1. Identify official data sources
2. Implement parsing logic
3. Add UK timezone conversion
4. Update UI components

### Contributing
1. Fork the repository
2. Create feature branch
3. Ensure all tests pass
4. No mock data in commits
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

### Getting Help
- Check the test page first: `/test-real-data.html`
- Review browser console logs
- Check Netlify function logs
- Verify environment variable configuration

### Reporting Issues
Include this information:
- Environment (web/desktop/local)
- Browser/OS details
- Console error messages
- Steps to reproduce
- Expected vs actual behavior

---

**🎯 Remember: This app shows only real, live sports data. If no events are displayed, it means there are genuinely no events scheduled - not a bug!** 🏆