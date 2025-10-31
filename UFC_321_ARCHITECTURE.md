# UFC 321 Tapology Scraper - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SportsApp                                │
│                     UFC Data Pipeline                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│                 │      │                  │      │             │
│   UFC.com       │─────▶│  ufcFetcher.js   │─────▶│  matches.   │
│   (Current)     │      │  (Existing)      │      │  json       │
│                 │      │                  │      │             │
└─────────────────┘      └──────────────────┘      └─────────────┘
                                  │
                                  │ Enhanced with
                                  ▼
                         ┌──────────────────┐
                         │                  │
                         │ tapologyUFC      │◀─────┐
                         │ Scraper.js       │      │
                         │ (NEW)            │      │
                         │                  │      │
                         └──────────────────┘      │
                                  │                │
                                  │                │
                         ┌────────▼────────┐       │
                         │                 │       │
                         │  Tapology.com   │───────┘
                         │  UFC 321        │  Fetch
                         │                 │
                         └─────────────────┘

                         ┌──────────────────┐
                         │                  │
                         │ ufcDataIntegrator│
                         │ .js (NEW)        │
                         │                  │
                         │ Combines both    │
                         │ data sources     │
                         │                  │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Enhanced        │
                         │  UFC Events      │
                         │  with full       │
                         │  fight cards     │
                         └──────────────────┘
```

## Data Flow

```
1. FETCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [Tapology URL]
          │
          ▼
   [HTTPS Request]
          │
          ▼
   [HTML Response]


2. PARSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [HTML Response]
          │
          ├─▶ Extract Event Title
          ├─▶ Extract Date/Venue
          ├─▶ Extract Location
          └─▶ Extract Fights
                   │
                   ├─▶ Fighter 1 Data
                   │   ├─ Name
                   │   ├─ Nickname
                   │   ├─ Record
                   │   ├─ Ranking
                   │   └─ Odds
                   │
                   ├─▶ Fighter 2 Data
                   │   ├─ Name
                   │   ├─ Nickname
                   │   ├─ Record
                   │   ├─ Ranking
                   │   └─ Odds
                   │
                   └─▶ Fight Details
                       ├─ Weight Class
                       └─ Bout Type


3. STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [Parsed Data]
          │
          ▼
   [JSON Object]
          │
          ├─▶ Event Info
          │   ├─ title
          │   ├─ date
          │   ├─ venue
          │   └─ location
          │
          └─▶ Fights Array
              └─▶ Fight Object
                  ├─ fighter1 {}
                  ├─ fighter2 {}
                  ├─ weightClass
                  └─ boutType


4. SAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [JSON Object]
          │
          ▼
   [Write to File]
          │
          ▼
   [data/ufc_321_*.json]
```

## Module Interaction

```
┌────────────────────────────────────────────────────────────┐
│  tapologyUFCScraper.js (Main Module)                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ fetchHTML()  │  │ parseEvent   │  │ extractFights│   │
│  │              │─▶│ HTML()       │─▶│ ()           │   │
│  │ HTTPS Req    │  │ Regex Parse  │  │ Fight Parse  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                            │              │
│                                            ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ saveToFile() │◀─│ parseFight   │◀─│ cleanText()  │   │
│  │              │  │ HTML()       │  │              │   │
│  │ JSON Write   │  │ Extract Data │  │ Normalize    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  test_ufc321_detailed.js (Test Script)                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Initialize   │─▶│ Run Scraper  │─▶│ Format Output│   │
│  │ Scraper      │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                            │              │
│                                            ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Save Results │◀─│ Display Stats│◀─│ Show Fights  │   │
│  │              │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ufcDataIntegrator.js (Integration)                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ UFC.com Data │  │ Tapology     │  │ Merge Data   │   │
│  │ (Existing)   │─▶│ Scraper      │─▶│ Sources      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                            │              │
│                                            ▼              │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Enhanced Event Object                     │   │
│  │  ┌────────────────────────────────────────┐     │   │
│  │  │ UFC.com: Basic event info             │     │   │
│  │  │ Tapology: Detailed fight cards        │     │   │
│  │  │ Combined: Complete event package      │     │   │
│  │  └────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────┐   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
tapologyUFCScraper.js
├── require('https')      [Built-in]
├── require('fs')         [Built-in]
└── require('path')       [Built-in]

test_ufc321_detailed.js
└── require('./tapologyUFCScraper')

ufcDataIntegrator.js
├── require('./tapologyUFCScraper')
├── require('fs')
└── require('path')

test_tapology_ufc321.bat
└── Calls: node tapologyUFCScraper.js
```

## Usage Patterns

### Pattern 1: Direct Scraping
```
User ─▶ tapologyUFCScraper.js ─▶ Tapology.com
                   │
                   ▼
           data/ufc_321.json
```

### Pattern 2: Test Script
```
User ─▶ test_ufc321_detailed.js ─▶ tapologyUFCScraper.js ─▶ Tapology.com
                                              │
                                              ▼
                                      Console Output
                                              │
                                              ▼
                                      data/ufc_321.json
```

### Pattern 3: Integration
```
User ─▶ ufcDataIntegrator.js ─┬▶ ufcFetcher.js ─▶ UFC.com
                               │
                               └▶ tapologyUFCScraper.js ─▶ Tapology.com
                                              │
                                              ▼
                                   Enhanced Event Data
                                              │
                                              ▼
                                   data/enhanced_ufc.json
```

## Component Breakdown

```
┌─────────────────────────────────────────────────────┐
│  Component Overview                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Core Scraper (tapologyUFCScraper.js)              │
│  ┌───────────────────────────────────────────┐    │
│  │ • HTTP fetching                           │    │
│  │ • HTML parsing                            │    │
│  │ • Data extraction                         │    │
│  │ • JSON serialization                      │    │
│  │ • File I/O                                │    │
│  │ • Error handling                          │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  Test Script (test_ufc321_detailed.js)             │
│  ┌───────────────────────────────────────────┐    │
│  │ • Scraper initialization                  │    │
│  │ • Formatted console output                │    │
│  │ • Color-coded logging                     │    │
│  │ • Statistics calculation                  │    │
│  │ • Result verification                     │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  Integrator (ufcDataIntegrator.js)                 │
│  ┌───────────────────────────────────────────┐    │
│  │ • Multi-source data merging               │    │
│  │ • URL mapping                             │    │
│  │ • Batch processing                        │    │
│  │ • Rate limiting                           │    │
│  │ • Enhanced output generation              │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
[Start Scraping]
       │
       ▼
[HTTP Request] ──────────────▶ [Network Error] ──▶ [Log & Throw]
       │                              ▲
       ▼                              │
[Receive HTML] ──────────────▶ [HTTP Error] ────┘
       │
       ▼
[Parse HTML] ────────────────▶ [Parse Error] ───▶ [Log & Continue]
       │                              ▲
       ▼                              │
[Extract Data] ───────────────▶ [Missing Data] ──┘
       │
       ▼
[Validate Data] ──────────────▶ [Invalid Data] ─▶ [Use Defaults]
       │
       ▼
[Save to File] ───────────────▶ [File Error] ───▶ [Log & Throw]
       │
       ▼
[Success]
```

## Data Transformation

```
RAW HTML                    PARSED DATA               FINAL JSON
─────────                   ───────────               ──────────

<h1>UFC 321</h1>     ──▶    title: "UFC 321"   ──▶   {
                                                        "title": "UFC 321",
<span>Dec 7</span>   ──▶    date: "Dec 7"      ──▶     "date": "December 7, 2025",

<div class="fighter">──▶    fighter1: {        ──▶     "fights": [{
  Tom Aspinall             name: "Tom..."            "fighter1": {
  #10 Heavyweight          ranking: "#10"              "name": "Tom Aspinall",
  -340 Favorite            odds: "-340"                "ranking": "#10"
</div>                     }                           }
                                                      }]
                                                    }
```

---

**Created:** October 25, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
