# UK Sports TV Guide

A comprehensive sports application that displays today's football matches and upcoming UFC events on UK television, available in both **desktop (Electron)** and **web** versions.

## 🚀 Quick Start

### Web Version (Netlify/Browser)
1. Open `index.html` in your browser, or
2. Deploy to Netlify for online access (with live data)

### Desktop Version (Electron)
1. `npm install`
2. `npm start`

## 📱 Two Versions Available

### 🌐 Web Version (`index.html`)
- **Runs in browsers** (Chrome, Firefox, Safari, Edge)
- **Netlify deployable** for online access
- Uses **localStorage** for data persistence
- **Real live data** via Netlify Functions (bypasses CORS)
- **No installation required**
- Compatible with mobile devices

**Files:**
- `index.html` - Main web page
- `web-app.js` - Web-compatible app logic
- `web-datamanager.js` - localStorage-based data management
- `web-matchfetcher.js` - Netlify Functions integration
- `netlify/functions/fetch-football.js` - Live data fetcher

### 🖥️ Desktop Version (`desktop-index.html`)
- **Electron desktop app** (Windows, macOS, Linux)
- Full **file system access** for data storage
- **Direct web scraping** without CORS restrictions
- **System integration** (notifications, tray icons)
- **Better performance** for data processing

**Files:**
- `desktop-index.html` - Desktop app page
- `main.js` - Electron main process
- `app.js` - Desktop app logic
- `dataManager.js` - File system-based data management
- `matchFetcher.js` - Node.js HTTPS requests

## 🔧 Key Differences

| Feature | Web Version | Desktop Version |
|---------|-------------|----------------|
| **Installation** | None required | `npm install` |
| **Data Storage** | localStorage | JSON files |
| **Data Fetching** | Real live data via Netlify Functions | Full direct access |
| **Performance** | Browser-dependent | Native performance |
| **Offline Use** | Limited | Full offline |
| **Updates** | Auto from web | Manual/auto-update |
| **Mobile Support** | ✅ Yes | ❌ No |

## 🌟 Features (Both Versions)

### Football Matches
- **Today's matches** on UK television
- **Channel filtering** (BBC, ITV, Sky Sports, TNT Sports, etc.)
- **Live status tracking** (upcoming, soon, live, finished)
- **Competition info** (Premier League, Champions League, etc.)
- **Match details** (time, teams, venue, channels)

### UFC Events
- **Next UFC event** information
- **UK start times** for prelims and main card
- **Fight cards** (main card, prelims, early prelims)
- **Fighter details** and weight classes

### General Features
- **Auto-refresh** every 2 hours
- **Manual refresh** and cleanup options
- **Debug system** with detailed logging
- **Channel filter** system
- **Responsive design** for all screen sizes
- **Real-time clock** with UK timezone

## 🚀 Deployment

### Netlify (Web Version)
1. Push code to GitHub/GitLab
2. Connect to Netlify
3. Set build command: *none* (static site)
4. Set publish directory: `.` (root)
5. `netlify.toml` handles configuration

### Local Development
```bash
# Web version
open index.html

# Desktop version
npm install
npm start

# Test web version with server
python -m http.server 8000
# Then visit: http://localhost:8000
```

## 🎨 Styling

Both versions use the same CSS files:
- `styles.css` - Main application styles
- `styles_api.css` - API and interaction styles

**Design Features:**
- **Sports-themed** color scheme (gold, green, red, blue)
- **Modern glassmorphism** effects
- **Responsive grid** layouts
- **Smooth animations** and transitions
- **Status indicators** for live matches
- **Mobile-optimized** touch interactions

## 🔧 Technical Details

### Web Version Technical Choices
- **localStorage** instead of file system for data persistence
- **Fetch API** with CORS proxy fallback for web requests
- **Demo data** when live fetching is blocked
- **Browser-compatible** vanilla JavaScript (no Node.js dependencies)
- **Progressive enhancement** approach

### Desktop Version Features
- **Node.js modules** for file system and HTTP requests
- **Electron APIs** for native desktop integration
- **Direct web scraping** from live-footballontv.com
- **JSON file storage** in `data/` directory
- **System notifications** and window management

## 📊 Data Sources

### Football Data
- **Primary**: live-footballontv.com (web scraping via Netlify Functions)
- **Web Method**: Netlify serverless functions bypass CORS
- **Desktop Method**: Direct Node.js HTTPS requests
- **Channels**: 30+ UK TV channels mapped
- **Updates**: Automatic every 2 hours during active hours

### UFC Data
- **Primary**: Currently uses static data
- **Planned**: UFC API integration
- **Events**: Upcoming fight cards with UK times
- **Details**: Fighter names, weight classes, event info

## 🛠️ Development

### File Structure
```
SportsApp/
├── Web Version Files
│   ├── web-index.html          # Web entry point
│   ├── web-app.js              # Web app logic
│   ├── web-datamanager.js      # localStorage data
│   └── web-matchfetcher.js     # Browser fetch API
├── Desktop Version Files
│   ├── index.html              # Desktop entry point
│   ├── main.js                 # Electron main process
│   ├── app.js                  # Desktop app logic
│   ├── dataManager.js          # File system data
│   └── matchFetcher.js         # Node.js requests
├── Shared Files
│   ├── styles.css              # Main styles
│   ├── styles_api.css          # API styles
│   └── assets/                 # Images and icons
├── Configuration
│   ├── package.json            # Node.js dependencies
│   ├── netlify.toml            # Netlify config
│   └── README.md               # This file
└── Data (Desktop Only)
    └── data/matches.json       # Stored match data
```

### Adding Features
1. **Both versions**: Update shared CSS files
2. **Web only**: Modify `web-*.js` files, use localStorage
3. **Desktop only**: Modify main `*.js` files, use file system
4. **New APIs**: Add to both fetcher classes

## 🎯 Usage Examples

### Channel Filtering
- Select specific TV channels to show only those matches
- Perfect for cord-cutters or specific subscription services
- Real-time filtering without page reload

### Debug System
- Four tabs: Requests, Data, Filtering, Display
- Real-time logging of all app operations
- Helpful for troubleshooting and development

### Data Management (Web Version)
- **Export**: Download your data as JSON
- **Import**: Upload previously exported data
- **Clear**: Reset all stored information
- **Storage**: Monitor localStorage usage

## 🔄 Future Enhancements

### Planned Features
- [ ] **Live scores** integration
- [ ] **Push notifications** for match starts
- [ ] **Favorite teams** filtering
- [ ] **Calendar integration** for match scheduling
- [ ] **Social sharing** of match lineups
- [ ] **Dark/light theme** toggle
- [ ] **Multiple timezone** support

### Technical Improvements
- [ ] **Service worker** for offline functionality
- [ ] **WebSocket** connections for real-time updates
- [ ] **Progressive Web App** (PWA) features
- [ ] **API optimization** for faster loading
- [ ] **Caching strategies** for better performance

## 📄 License

MIT License - Feel free to use and modify for your needs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test both web and desktop versions
4. Submit a pull request

---

**Choose your preferred version:**
- 🌐 **Web**: Perfect for quick access and mobile use
- 🖥️ **Desktop**: Best for power users and unlimited data access

Both versions provide the same core functionality with different technical approaches optimized for their platforms.
