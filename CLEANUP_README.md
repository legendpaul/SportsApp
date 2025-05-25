# SportsApp Daily Cleanup System

This document explains the automatic daily cleanup system for removing old matches from your SportsApp.

## Overview

The system automatically removes:
- **Football matches** that started more than 3 hours ago
- **UFC events** that ended more than 3 hours ago

## Files Added

### Core Files
- `dataManager.js` - Handles data loading/saving and cleanup logic
- `dailyCleanup.js` - Main cleanup script that can be run manually or scheduled
- `data/matches.json` - JSON file storing all match and event data
- `logs/` - Directory for cleanup logs

### Automation Scripts
- `cleanup.bat` - Windows batch script to run the cleanup
- `setup_scheduler.bat` - Sets up Windows Task Scheduler for automatic daily runs

### Updated Files
- `app.js` - Updated to use the new data management system

## Setup Instructions

### 1. Install Dependencies
```bash
cd C:\svn\bitbucket\SportsApp
npm install
```

### 2. Set Up Automatic Daily Cleanup
**Run as Administrator:**
```cmd
setup_scheduler.bat
```

This will:
- Create a Windows Task Scheduler task
- Schedule cleanup to run daily at 2:00 AM
- Log all cleanup activities

### 3. Test the System
```cmd
# Test manual cleanup
cleanup.bat manual

# Or run directly with Node.js
node dailyCleanup.js
```

## Usage

### Automatic Operation
Once set up, the system runs automatically every day at 2:00 AM.

### Manual Cleanup
```cmd
# Using batch script
cleanup.bat manual

# Using Node.js directly
node dailyCleanup.js

# From within the app (browser console)
window.manualCleanup()
```

### Adding New Matches
```javascript
// From the app's browser console
window.sportsApp.addFootballMatch({
    time: "18:00",
    teamA: "Arsenal",
    teamB: "Chelsea", 
    competition: "Premier League",
    channel: "Sky Sports",
    matchDate: "2025-05-25"
});
```

## Data Structure

### Football Matches
```json
{
  "id": "match_12345",
  "time": "15:00",
  "teamA": "Liverpool", 
  "teamB": "Manchester City",
  "competition": "Premier League",
  "channel": "Sky Sports",
  "status": "upcoming",
  "createdAt": "2025-05-25T10:00:00.000Z",
  "matchDate": "2025-05-25"
}
```

### UFC Events
```json
{
  "id": "ufc_001",
  "title": "UFC 316: Main Event",
  "date": "2025-06-07",
  "location": "Arena Name, City",
  "mainCard": [...],
  "prelimCard": [...]
}
```

## Cleanup Logic

### Football Matches
- Removes matches where `matchDate + time` is more than 3 hours in the past
- Example: Match at 15:00 gets removed after 18:00 the same day

### UFC Events  
- Removes events where `event date + 8 hours` is in the past
- Assumes 5-hour event duration + 3-hour grace period

## Monitoring

### Log Files
- `logs/cleanup.log` - Detailed cleanup logs with timestamps
- `logs/task_scheduler.log` - Windows Task Scheduler logs (if applicable)

### Check Cleanup Status
```javascript
// From browser console
window.sportsApp.checkCleanupStatus()
```

### View Recent Logs
```cmd
type "C:\svn\bitbucket\SportsApp\logs\cleanup.log"
```

## Troubleshooting

### Common Issues

**1. Task Scheduler Setup Failed**
- Ensure you're running `setup_scheduler.bat` as Administrator
- Check Windows Event Viewer for Task Scheduler errors

**2. Node.js Not Found**
- Install Node.js from https://nodejs.org
- Ensure Node.js is in your system PATH

**3. Data File Issues**
- Check if `data/matches.json` exists and is valid JSON
- App will create the file automatically if missing

**4. Permission Issues**
- Ensure the app has write permissions to the data and logs directories

### Manual Troubleshooting

**Check Scheduled Task:**
```cmd
schtasks /query /tn "SportsApp-DailyCleanup"
```

**Run Task Manually:**
```cmd
schtasks /run /tn "SportsApp-DailyCleanup"
```

**Remove Scheduled Task:**
```cmd
schtasks /delete /tn "SportsApp-DailyCleanup" /f
```

## Configuration

### Change Cleanup Schedule
Edit the time in `setup_scheduler.bat`:
```cmd
/st 02:00  REM Change to desired time (24-hour format)
```

### Change Cleanup Threshold  
Edit `dataManager.js`, line with `3 * 60 * 60 * 1000`:
```javascript
const threeHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000)); // 4 hours
```

### Disable Automatic Cleanup
```cmd
schtasks /delete /tn "SportsApp-DailyCleanup" /f
```

## Backup and Recovery

### Backup Data
```cmd
copy "C:\svn\bitbucket\SportsApp\data\matches.json" "backup_location\"
```

### Restore Data
```cmd
copy "backup_location\matches.json" "C:\svn\bitbucket\SportsApp\data\"
```

## Integration Notes

- The app now loads data from `data/matches.json` instead of hardcoded arrays
- Old matches are filtered out in real-time during rendering
- Manual cleanup can be triggered from the browser console
- All operations are logged for audit purposes

## Performance

- Cleanup typically processes hundreds of matches in under 1 second
- JSON file size remains manageable with regular cleanup
- Minimal impact on app startup time

---

For support or questions, check the logs first, then review this documentation.
