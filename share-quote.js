// Quote Sharing with Text-Based Functionality

class QuoteSharer {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.addShareButtons());
        } else {
            this.addShareButtons();
        }
    }

    addShareButtons() {
        const quoteEntries = document.querySelectorAll('.quote-entry');
        
        quoteEntries.forEach((entry, index) => {
            if (entry.querySelector('.share-quote-btn')) return;
            
            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-quote-btn';
            shareBtn.setAttribute('aria-label', 'Share quote');
            shareBtn.setAttribute('title', 'Share quote');
            shareBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
            `;
            
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareQuote(entry);
            });
            
            const sourceEl = entry.querySelector('.source');
            if (sourceEl && sourceEl.parentElement) {
                sourceEl.parentElement.appendChild(shareBtn);
            } else {
                entry.appendChild(shareBtn);
            }
        });
    }

    async shareQuote(quoteEntry) {
        try {
            const blockquote = quoteEntry.querySelector('blockquote');
            const source = quoteEntry.querySelector('.source');
            
            const quoteText = blockquote ? blockquote.innerText.trim() : '';
            const sourceText = source ? source.innerText.trim() : '';
            
            const shareText = `"${quoteText}"\n\n${sourceText}`;
            
            if (navigator.share) {
                await navigator.share({
                    text: shareText
                });
            } else {
                await navigator.clipboard.writeText(shareText);
                this.showCopyNotification();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing quote:', error);
                try {
                    const blockquote = quoteEntry.querySelector('blockquote');
                    const source = quoteEntry.querySelector('.source');
                    const quoteText = blockquote ? blockquote.innerText.trim() : '';
                    const sourceText = source ? source.innerText.trim() : '';
                    const shareText = `"${quoteText}"\n\n${sourceText}`;
                    
                    await navigator.clipboard.writeText(shareText);
                    this.showCopyNotification();
                } catch (clipboardError) {
                    alert('Could not share or copy quote. Please try again.');
                }
            }
        }
    }

    showCopyNotification() {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = 'Quote copied to clipboard!';
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

const shareButtonStyles = `
<style>
.share-quote-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: #8b4c42;
    border: 1px solid #8b4c42;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    margin-left: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0;
    vertical-align: middle;
}

.share-quote-btn:hover {
    background: #8b4c42;
    color: #fff;
    transform: scale(1.1);
}

.share-quote-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.share-quote-btn svg {
    width: 18px;
    height: 18px;
}

.copy-notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: #8b4c42;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10000;
    pointer-events: none;
}

.copy-notification.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

@media (max-width: 768px) {
    .share-quote-btn {
        width: 40px;
        height: 40px;
    }
}
</style>`;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.head.insertAdjacentHTML('beforeend', shareButtonStyles);
        window.quoteSharer = new QuoteSharer();
    });
} else {
    document.head.insertAdjacentHTML('beforeend', shareButtonStyles);
    window.quoteSharer = new QuoteSharer();
}
