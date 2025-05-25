# UK Sports TV Guide

A desktop application that displays today's football matches on UK TV and the next UFC event information.

## Features

- **Today's Football on UK TV**: Shows all matches with team names, kick-off times, and TV channels
- **Next UFC Event**: Complete fight card with main card and preliminary fights
- **Real-time Updates**: Live clock and match status updates
- **Custom Sports Background**: Merged football and MMA themed design

## Quick Start

### Option 1: Automatic Setup (Recommended)
1. Double-click `auto_setup.bat`
2. Wait for dependencies to install
3. Choose to launch the app immediately

### Option 2: Manual Setup
1. Open command prompt in the app directory
2. Run `npm install`
3. Run `npm start`

### Option 3: Simple Launch (after setup)
- Double-click `SportsApp.bat`

## Requirements

- Node.js (Download from https://nodejs.org)
- Windows operating system

## Current Data

### Today's Football (May 25, 2025)
- Girona vs Atlético Madrid (13:00 - Premier Sports 1)
- Charlton Athletic vs Leyton Orient (13:01 - Sky Sports Football)
- Glasgow City vs Rangers Women (14:00 - BBC One Scotland)
- Villarreal vs Sevilla (15:15 - Premier Sports 1)
- Liverpool vs Crystal Palace (16:00 - Sky Sports Premier League)
- Manchester United vs Aston Villa (16:00 - TNT Sports 1)
- Nottingham Forest vs Chelsea (16:00 - Sky Sports Main Event)

### Next UFC Event
**UFC 316: Dvalishvili vs O'Malley 2**
- Date: Saturday, June 7, 2025
- Location: Prudential Center, Newark, NJ
- UK Times:
  - Early Prelims: 11:00 PM (Sat) - UFC Fight Pass
  - Prelims: 1:00 AM (Sun) - TNT Sports
  - Main Card: 3:00 AM (Sun) - TNT Sports

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Desktop Framework**: Electron
- **Build Tool**: electron-builder

## Development

### Scripts
- `npm start` - Run the app in development mode
- `npm run dev` - Run with developer tools open
- `npm run build` - Build the app for distribution

### File Structure
```
SportsApp/
├── index.html          # Main HTML file
├── styles.css          # Styling with sports background
├── app.js             # Main application logic
├── main.js            # Electron main process
├── package.json       # Dependencies and scripts
├── assets/            # Icons and images
├── SportsApp.bat      # Windows launcher
├── auto_setup.bat     # Automatic setup script
└── README.md          # This file
```

## Troubleshooting

### App won't start
1. Check that Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check the log file: `C:\temp\sports_app_log.txt`

### Missing dependencies
- Run `auto_setup.bat` or `npm install`

### Display issues
- Try restarting the app
- Check your screen resolution and scaling

## Customization

### Adding New Matches
Edit the `footballMatches` array in `app.js`:
```javascript
{
  time: "18:00",
  teamA: "Arsenal",
  teamB: "Tottenham",
  competition: "Premier League",
  channel: "Sky Sports Premier League",
  status: "upcoming"
}
```

### Updating UFC Events
Edit the `ufcMainCard` and `ufcPrelimCard` arrays in `app.js`.

### Styling
Modify `styles.css` to change colors, layout, or the sports background.

## License

MIT License - Feel free to modify and distribute.

---

**Created by Minnka** - Maximum pace, maximum automation, maximum success