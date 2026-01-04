// Optimized Dynamic Search Functionality
class DynamicSearch {
    constructor() {
        this.searchIndex = [];
        this.isIndexed = false;
        this.isIndexing = false; // Indexing lock
        this.knownPages = [];
        this.cache = new Map();
        this.setupSearch();
    }

    async discoverPages() {
        try {
            const response = await fetch('commonplace.html');
            if (!response.ok) throw new Error('Failed to fetch commonplace.html');
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            const links = doc.querySelectorAll('.category-link');
            return Array.from(links)
                .map(link => link.getAttribute('href'))
                .filter(href => href && href.endsWith('.html') && href.startsWith('on-'));
        } catch (error) {
            console.error('Page discovery failed:', error);
            return [];
        }
    }

    async buildIndex() {
        // Prevent multiple simultaneous indexing operations
        if (this.isIndexed || this.isIndexing) return;
        
        this.isIndexing = true;
        console.log('Building search index...');
        
        const pages = await this.discoverPages();
        const newIndex = [];

        // Fetch pages in parallel for significantly better performance
        await Promise.all(pages.map(async (page) => {
            try {
                const response = await fetch(page);
                if (!response.ok) return;
                
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                const titleElement = doc.querySelector('h2') || doc.querySelector('h1') || doc.querySelector('title');
                const pageTitle = titleElement ? titleElement.textContent.trim() : page;
                
                const quoteEntries = doc.querySelectorAll('.quote-entry');
                quoteEntries.forEach((entry, index) => {
                    const blockquote = entry.querySelector('blockquote');
                    const source = entry.querySelector('.source');
                    
                    if (blockquote) {
                        const quoteText = this.cleanText(blockquote.textContent);
                        const sourceText = source ? this.cleanText(source.textContent) : '';
                        
                        newIndex.push({
                            url: `${page}#quote-${index}`,
                            pageTitle: pageTitle,
                            quoteText: quoteText,
                            sourceText: sourceText,
                            // Combined text for easier searching, including title
                            fullSearchText: `${pageTitle} ${quoteText} ${sourceText}`.toLowerCase(),
                            index: index
                        });
                    }
                });
            } catch (error) {
                console.warn(`Failed to index ${page}:`, error);
            }
        }));

        this.searchIndex = newIndex;
        this.isIndexed = true;
        this.isIndexing = false;
        console.log(`Index built with ${this.searchIndex.length} quotes.`);
    }

    cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    async search(query) {
        if (!this.isIndexed) await this.buildIndex();
        if (!query || query.length < 2) return [];

        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
        const results = [];

        for (const entry of this.searchIndex) {
            let score = 0;
            let foundTerms = 0;

            for (const term of terms) {
                if (entry.fullSearchText.includes(term)) {
                    foundTerms++;
                    // Weighting
                    if (entry.pageTitle.toLowerCase().includes(term)) score += 5;
                    if (entry.sourceText.toLowerCase().includes(term)) score += 3;
                    if (entry.quoteText.toLowerCase().includes(term)) score += 1;
                }
            }

            // Only return results that match at least one term
            if (foundTerms > 0) {
                results.push({
                    ...entry,
                    score: score + (foundTerms * 10), // Multi-term matches rank higher
                    highlightedQuote: this.highlight(entry.quoteText, terms),
                    highlightedSource: this.highlight(entry.sourceText, terms)
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 15);
    }

    highlight(text, terms) {
        let highlighted = text;
        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        return highlighted;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    setupSearch() {
        this.createSearchInterface();
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            debounceTimer = setTimeout(async () => {
                searchResults.innerHTML = '<div class="result-item">Searching...</div>';
                searchResults.style.display = 'block';
                const results = await this.search(query);
                this.displayResults(results);
            }, 250);
        });

        // UI Interactions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) searchResults.style.display = 'none';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape') searchResults.style.display = 'none';
        });
    }

    createSearchInterface() {
        if (document.getElementById('search-input')) return;
        const nav = document.querySelector('nav');
        if (!nav) return;

        const container = document.createElement('div');
        container.className = 'search-container';
        container.innerHTML = `
            <input type="text" id="search-input" class="search-input" placeholder="Search (Press '/' to focus)..." autocomplete="off">
            <div id="search-results" class="search-results"></div>
        `;
        nav.insertAdjacentElement('afterend', container);
    }

    displayResults(results) {
        const searchResults = document.getElementById('search-results');
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="result-item">No results found</div>';
            return;
        }

        searchResults.innerHTML = results.map(r => `
            <div class="result-item" onclick="window.location.href='${r.url}'">
                <div class="result-title">${r.pageTitle}</div>
                <div class="result-preview">${r.highlightedQuote}</div>
                <div class="result-source">— ${r.highlightedSource}</div>
            </div>
        `).join('');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.dynamicSearch = new DynamicSearch();
});