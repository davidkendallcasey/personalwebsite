// Quote Sharing with Screenshot Functionality

class QuoteSharer {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM and html2canvas to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.addShareButtons());
        } else {
            this.addShareButtons();
        }
    }

    addShareButtons() {
        const quoteEntries = document.querySelectorAll('.quote-entry');
        
        quoteEntries.forEach((entry, index) => {
            // Skip if share button already exists
            if (entry.querySelector('.share-quote-btn')) return;
            
            // Create share button with network icon
            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-quote-btn';
            shareBtn.setAttribute('aria-label', 'Share quote');
            shareBtn.setAttribute('title', 'Share to Instagram or save');
            shareBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
            `;
            
            // Add click handler
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareQuote(entry, index);
            });
            
            // Insert button after the source or at the end
            const sourceEl = entry.querySelector('.source');
            if (sourceEl && sourceEl.parentElement) {
                sourceEl.parentElement.appendChild(shareBtn);
            } else {
                entry.appendChild(shareBtn);
            }
        });
    }

    async shareQuote(quoteEntry, index) {
        try {
            const shareBtn = quoteEntry.querySelector('.share-quote-btn');
            const originalHTML = shareBtn.innerHTML;
            shareBtn.innerHTML = '<span style="font-size: 0.9em;">...</span>';
            shareBtn.disabled = true;

            // Create a styled container for the screenshot
            const canvas = await this.generateQuoteImage(quoteEntry);
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            
            // Try Web Share API first (works on mobile)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'quote.png', { type: 'image/png' })] })) {
                const file = new File([blob], 'quote.png', { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Quote',
                    text: 'Check out this quote!'
                });
            } else {
                // Fallback: Download the image
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quote-${index + 1}.png`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Show a helpful message
                setTimeout(() => {
                    alert('Image saved! You can now upload it to Instagram from your photo gallery.');
                }, 100);
            }

            shareBtn.innerHTML = originalHTML;
            shareBtn.disabled = false;
        } catch (error) {
            console.error('Error sharing quote:', error);
            alert('Could not share quote. Please try again.');
            const shareBtn = quoteEntry.querySelector('.share-quote-btn');
            if (shareBtn) {
                shareBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
                shareBtn.disabled = false;
            }
        }
    }

    async generateQuoteImage(quoteEntry) {
        // Get quote text and source
        const blockquote = quoteEntry.querySelector('blockquote');
        const source = quoteEntry.querySelector('.source');
        const pageTitle = document.querySelector('h2')?.textContent || 'Quote';
        
        const quoteText = blockquote ? blockquote.innerText.trim() : '';
        const sourceText = source ? source.innerText.trim() : '';

        // Create a styled container for screenshot
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 1080px;
            padding: 80px 60px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%);
            color: #e8e6e3;
            font-family: 'Neuton', Georgia, serif;
            box-sizing: border-box;
        `;

        container.innerHTML = `
            <div style="max-width: 960px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h2 style="color: #f5f3f0; font-size: 36px; margin: 0; font-style: italic;">
                        ${pageTitle}
                    </h2>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 50px; border-radius: 12px; border-left: 4px solid #8b4c42;">
                    <blockquote style="
                        font-size: 28px;
                        line-height: 1.6;
                        margin: 0 0 30px 0;
                        color: #e8e6e3;
                        font-style: italic;
                    ">
                        ${quoteText}
                    </blockquote>
                    <p style="
                        font-size: 24px;
                        color: #b8b5b2;
                        margin: 0;
                        text-align: right;
                    ">
                        ${sourceText}
                    </p>
                </div>
                <div style="margin-top: 50px; text-align: center; opacity: 0.6;">
                    <p style="font-size: 18px; color: #888; margin: 0;">David Kendall Casey's Commonplace Book</p>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Generate canvas using html2canvas
        const canvas = await html2canvas(container, {
            backgroundColor: '#1a1a1a',
            scale: 2,
            logging: false,
            width: 1080,
            windowWidth: 1080
        });

        // Remove temporary container
        document.body.removeChild(container);

        return canvas;
    }
}

// Styles for share button
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

@media (max-width: 768px) {
    .share-quote-btn {
        width: 40px;
        height: 40px;
    }
}
</style>`;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.head.insertAdjacentHTML('beforeend', shareButtonStyles);
        window.quoteSharer = new QuoteSharer();
    });
} else {
    document.head.insertAdjacentHTML('beforeend', shareButtonStyles);
    window.quoteSharer = new QuoteSharer();
}
