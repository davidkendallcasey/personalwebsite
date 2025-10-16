// Dynamic Search Functionality
class DynamicSearch {
    constructor() {
        this.searchIndex = [];
        this.isIndexed = false;
        this.knownPages = [];
        this.cache = new Map();
        this.setupSearch();
    }

    async discoverPages() {
        try {
            const response = await fetch('commonplace.html');
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            const links = doc.querySelectorAll('.category-link');
            const pages = Array.from(links)
                .map(link => link.getAttribute('href'))
                .filter(href => href && href.endsWith('.html') && href.startsWith('on-'));
            
            console.log('Discovered pages for search:', pages);
            return pages;
        } catch (error) {
            console.error('Could not discover pages from commonplace.html:', error);
            return [];
        }
    }

    async buildIndex() {
        if (this.isIndexed) return;
        
        console.log('Building search index...');
        this.searchIndex = [];
        
        if (this.knownPages.length === 0) {
            this.knownPages = await this.discoverPages();
        }
        
        for (const page of this.knownPages) {
            try {
                await this.indexPage(page);
            } catch (error) {
                console.warn(`Could not index ${page}:`, error);
            }
        }
        
        this.isIndexed = true;
        console.log(`Search index built with ${this.searchIndex.length} entries`);
    }

    async indexPage(pageUrl) {
        // Check cache first
        if (this.cache.has(pageUrl)) {
            const cachedData = this.cache.get(pageUrl);
            this.searchIndex.push(...cachedData);
            return;
        }

        try {
            const response = await fetch(pageUrl);
            if (!response.ok) return;
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Get page title
            const titleElement = doc.querySelector('h2') || doc.querySelector('h1') || doc.querySelector('title');
            const pageTitle = titleElement ? titleElement.textContent.trim() : pageUrl;
            
            // Index each quote entry
            const quoteEntries = doc.querySelectorAll('.quote-entry');
            const pageEntries = [];
            
            quoteEntries.forEach((entry, index) => {
                const blockquote = entry.querySelector('blockquote');
                const source = entry.querySelector('.source');
                
                if (blockquote) {
                    const quoteText = this.cleanText(blockquote.textContent);
                    const sourceText = source ? this.cleanText(source.textContent) : '';
                    const fullText = `${quoteText} ${sourceText}`.toLowerCase();
                    
                    const searchEntry = {
                        url: pageUrl,
                        pageTitle: pageTitle,
                        quoteText: quoteText,
                        sourceText: sourceText,
                        fullText: fullText,
                        preview: this.createPreview(quoteText),
                        index: index
                    };
                    
                    this.searchIndex.push(searchEntry);
                    pageEntries.push(searchEntry);
                }
            });
            
            // Cache the results
            this.cache.set(pageUrl, pageEntries);
            
        } catch (error) {
            console.warn(`Error indexing ${pageUrl}:`, error);
        }
    }

    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-'".,;:!?]/g, ' ')
            .trim();
    }

    createPreview(text, maxLength = 150) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    async search(query) {
        if (!this.isIndexed) {
            await this.buildIndex();
        }

        if (!query || query.length < 2) return [];

        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
        const results = [];

        for (const entry of this.searchIndex) {
            let score = 0;
            const highlightedText = { quote: entry.quoteText, source: entry.sourceText };

            // Check each search term
            for (const term of searchTerms) {
                if (entry.fullText.includes(term)) {
                    // Score based on where the term appears
                    if (entry.sourceText.toLowerCase().includes(term)) score += 3;
                    if (entry.quoteText.toLowerCase().includes(term)) score += 2;
                    if (entry.pageTitle.toLowerCase().includes(term)) score += 1;

                    // Highlight the terms
                    const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
                    highlightedText.quote = highlightedText.quote.replace(regex, '<mark>$1</mark>');
                    highlightedText.source = highlightedText.source.replace(regex, '<mark>$1</mark>');
                }
            }

            if (score > 0) {
                results.push({
                    ...entry,
                    score: score,
                    highlightedQuote: highlightedText.quote,
                    highlightedSource: highlightedText.source
                });
            }
        }

        // Sort by score (highest first)
        return results.sort((a, b) => b.score - a.score).slice(0, 20);
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    setupSearch() {
        // Create search interface if it doesn't exist
        this.createSearchInterface();
        
        // Set up event listeners
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput && searchResults) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    searchResults.style.display = 'none';
                    return;
                }
                
                searchTimeout = setTimeout(async () => {
                    await this.performSearch(query);
                }, 300);
            });

            // Hide results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchResults.style.display = 'none';
                }
            });

            // Show results when focusing on input (if there's a query)
            searchInput.addEventListener('focus', (e) => {
                if (e.target.value.trim().length >= 2) {
                    searchResults.style.display = 'block';
                }
            });
        }
    }

    createSearchInterface() {
        // Check if search interface already exists
        if (document.getElementById('search-input')) return;

        // Find the nav element to add search after it
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <form class="search-form" onsubmit="return false;">
                <input 
                    type="text" 
                    id="search-input" 
                    class="search-input" 
                    placeholder="Search quotes and sources..."
                    autocomplete="off"
                >
            </form>
            <div id="search-results" class="search-results"></div>
        `;

        // Insert after nav
        nav.insertAdjacentElement('afterend', searchContainer);
    }

    async performSearch(query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        // Show loading state
        searchResults.innerHTML = '<div class="result-item">Searching...</div>';
        searchResults.style.display = 'block';

        try {
            const results = await this.search(query);
            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="result-item">Search error occurred</div>';
        }
    }

    displayResults(results, query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="result-item">No results found</div>';
            return;
        }

        const resultsHTML = results.map(result => `
            <div class="result-item" onclick="window.open('${result.url}', '_blank')">
                <div class="result-title">${result.pageTitle}</div>
                <div class="result-preview">${result.highlightedQuote}</div>
                ${result.highlightedSource ? `<div class="result-source">— ${result.highlightedSource}</div>` : ''}
            </div>
        `).join('');

        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';
    }

    // Method to manually add new pages without rebuilding entire index
    async addPage(pageUrl) {
        if (!this.knownPages.includes(pageUrl)) {
            this.knownPages.push(pageUrl);
        }
        
        // Remove from cache to force re-indexing
        this.cache.delete(pageUrl);
        
        // Remove existing entries for this page
        this.searchIndex = this.searchIndex.filter(entry => entry.url !== pageUrl);
        
        // Re-index this specific page
        await this.indexPage(pageUrl);
        
        console.log(`Added/updated page: ${pageUrl}`);
    }

    // Method to refresh the entire index
    async refreshIndex() {
        this.isIndexed = false;
        this.searchIndex = [];
        this.cache.clear();
        await this.buildIndex();
    }
}

// CSS styles for search (add to your stylesheet or include here)
const searchStyles = `
<style>
.search-container {
    margin-top: 1.5rem;
    position: relative;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
}

.search-form {
    margin: 0;
}

.search-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1.1em;
    border: 2px solid #444;
    border-radius: 6px;
    background-color: #2a2a2a;
    color: #e8e6e3;
    outline: none;
    transition: border-color 0.3s ease;
    box-sizing: border-box;
}

.search-input:focus {
    border-color: #8b4c42;
}

.search-input::placeholder {
    color: #888;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 6px;
    margin-top: 0.25rem;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.result-item {
    padding: 1rem;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.result-item:hover {
    background-color: #333;
}

.result-item:last-child {
    border-bottom: none;
}

.result-title {
    font-weight: bold;
    color: #f5f3f0;
    margin-bottom: 0.25rem;
    font-size: 1.0em;
}

.result-preview {
    color: #e8e6e3;
    font-size: 0.95em;
    line-height: 1.4;
    margin-bottom: 0.25rem;
}

.result-source {
    color: #b8b5b2;
    font-size: 0.9em;
    font-style: italic;
}

.result-preview mark,
.result-source mark {
    background-color: #8b4c42;
    color: #fff;
    padding: 0 0.2rem;
    border-radius: 2px;
    font-weight: bold;
}

@media (max-width: 768px) {
    .search-container {
        max-width: 100%;
        margin-top: 1rem;
    }
}
</style>`;

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', searchStyles);
    
    // Initialize search
    window.dynamicSearch = new DynamicSearch();
    
    console.log('Dynamic search initialized');
});

// Export for manual control
window.DynamicSearch = DynamicSearch;