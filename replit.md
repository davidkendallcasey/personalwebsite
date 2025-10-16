# David Kendall Casey's Commonplace Book

## Overview
This is a static website that serves as a digital commonplace book - a collection of quotes and passages organized by theme. The site features a daily quote selection, dynamic search functionality, and text-to-speech capabilities.

## Project Architecture

### Technology Stack
- **Frontend**: Static HTML/CSS/JavaScript
- **Server**: Node.js HTTP server
- **Dependencies**: jsdom (for search index generation)

### File Structure
- `index.html` - Homepage with daily quote feature
- `commonplace.html` - Index page with categories grid
- `on-*.html` - Topic-specific quote pages
- `stylesheet.css` - Global styles
- `dynamic-search.js` - Client-side search functionality
- `create-index.js` - Search index generator (Node.js)
- `server.js` - Static file server

### Key Features
1. **Daily Quote Selection**: Displays a random quote from the collection, stored in localStorage to persist through the day
2. **Dynamic Search**: Client-side search across all quotes and sources with highlighting
3. **Text-to-Speech**: Audio playback of quotes using Web Speech API
4. **Responsive Design**: Dark theme optimized for reading

## Setup & Configuration

### Development
- Server runs on port 5000 (configured for Replit environment)
- Static files served with cache-control headers to prevent caching issues
- No build process required - direct HTML/CSS/JS

### Deployment
- Configured for autoscale deployment
- Uses Node.js HTTP server to serve static files
- No external dependencies beyond jsdom

## Recent Changes
- 2025-10-16: Initial Replit setup
  - Created package.json and server.js
  - Configured workflow for development server on port 5000
  - Set up deployment configuration for autoscale
  - Added .gitignore for Node.js project

- 2025-10-16: Major Feature Enhancements
  - **Universal Search**: Added search bar to all pages (homepage and quote pages) with auto-discovery of new content
  - **Auto-Discovery**: Search automatically discovers pages from commonplace.html - no manual rebuilds needed when adding quotes
  - **Enhanced Text-to-Speech**: Improved voice selection with priority for British male voices (deeper, more comforting sound)
  - **Keyboard Shortcuts**: Added "/" to focus search and "Escape" to close results
  - **Quote Image Sharing**: Canvas-generated images for Instagram
    - Network share icon on each quote
    - Generates clean 1080x1080 images using Canvas API (not screenshots)
    - Beautiful gradient background with accent styling
    - Web Share API on mobile, download fallback on desktop
    - No rendering issues or unwanted elements
  - **Removed**: Deleted unused on-art.html file and html2canvas dependency

## Key Features

### Search Functionality
- Available on all pages via dynamic search bar
- Automatically discovers new pages from the index
- Real-time search with highlighted results
- Keyboard shortcuts: "/" to search, "Escape" to close

### Text-to-Speech
- Prioritizes British/UK English male voices
- Falls back gracefully to other English voices
- Configurable rate (0.85) and pitch (0.9) for deeper, more pleasant sound
- Shows selected voice in console

### Quote Sharing
- Share button with network icon on each quote
- Generates beautiful 1080x1080 images using Canvas API
- Clean gradient backgrounds with styled text
- Web Share API on mobile (share directly to Instagram)
- Download fallback on desktop
- No screenshot rendering issues - pure canvas drawing

## Notes
- The `create-index.js` script is no longer needed - search auto-discovers pages
- All quote pages follow the same HTML structure with `.quote-entry` classes
- The website uses localStorage for daily quote persistence and search history
- Mobile-optimized with responsive fonts and touch-friendly buttons
