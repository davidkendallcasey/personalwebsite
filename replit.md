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

## Notes
- The `create-index.js` script can be run with `npm run create-index` to generate a search index, but the dynamic search works without it
- All quote pages follow the same HTML structure with `.quote-entry` classes
- The website uses localStorage for daily quote persistence and search history
