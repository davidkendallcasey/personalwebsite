// Dynamic Search Functionality
class DynamicSearch {
    constructor() {
        this.searchIndex = [];
        this.isIndexed = false;
        this.setupSearch();
        this.loadIndex();
    }

    async loadIndex() {
        try {
            // Fetch the auto-generated index from the server
            const response = await fetch('search-index.json');
            if (response.ok) {
                this.searchIndex = await response.json();
                this.isIndexed = true;
                console.log(`Loaded index with ${this.searchIndex.length} entries`);
            }
        } catch (error) {
            console.error('Error loading search index:', error);
        }
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async search(query) {
        if (!this.isIndexed) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!this.isIndexed) return [];
        }

        if (!query || query.length < 2) return [];

        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
        const results = [];

        for (const entry of this.searchIndex) {
            let score = 0;
            const highlightedText = { quote: entry.quoteText, source: entry.sourceText };
            let hasMatch = false;

            for (const term of searchTerms) {
                if (entry.fullText.includes(term)) {
                    hasMatch = true;
                    if (entry.sourceText.toLowerCase().includes(term)) score += 3;
                    if (entry.quoteText.toLowerCase().includes(term)) score += 2;
                    if (entry.pageTitle.toLowerCase().includes(term)) score += 1;

                    const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
                    highlightedText.quote = highlightedText.quote.replace(regex, '<mark>$1</mark>');
                    if (highlightedText.source) {
                        highlightedText.source = highlightedText.source.replace(regex, '<mark>$1</mark>');
                    }
                }
            }

            if (hasMatch) {
                results.push({
                    ...entry,
                    score: score,
                    highlightedQuote: highlightedText.quote,
                    highlightedSource: highlightedText.source
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 20);
    }

    setupSearch() {
        this.createSearchInterface();
        
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

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchResults.style.display = 'none';
                }
            });

            searchInput.addEventListener('focus', (e) => {
                if (e.target.value.trim().length >= 2) {
                    searchResults.style.display = 'block';
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === '/' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    searchInput.focus();
                }
                if (e.key === 'Escape') {
                    searchResults.style.display = 'none';
                    searchInput.blur();
                }
            });
        }
    }

    createSearchInterface() {
        if (document.getElementById('search-input')) return;

        const nav = document.querySelector('nav');
        if (!nav) return;

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

        nav.insertAdjacentElement('afterend', searchContainer);
    }

    async performSearch(query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        try {
            const results = await this.search(query);
            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displayResults(results, query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="result-item">No results found</div>';
            searchResults.style.display = 'block';
            return;
        }

        const resultsHTML = results.map(result => `
            <div class="result-item" onclick="window.location.href='${result.url}'">
                <div class="result-title">${result.pageTitle}</div>
                <div class="result-preview">${result.highlightedQuote}</div>
                ${result.highlightedSource ? `<div class="result-source">— ${result.highlightedSource}</div>` : ''}
            </div>
        `).join('');

        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dynamicSearch = new DynamicSearch();
});