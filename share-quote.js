// Quote Sharing with Canvas-Generated Images

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
            shareBtn.setAttribute('title', 'Share quote as image');
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
                this.shareQuote(entry, index);
            });
            
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

            const blob = await this.generateQuoteImage(quoteEntry);
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'quote.png', { type: 'image/png' })] })) {
                const file = new File([blob], 'quote.png', { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Quote',
                    text: 'Check out this quote!'
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quote-${index + 1}.png`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.showNotification('Image saved! You can now upload it to Instagram.');
            }

            shareBtn.innerHTML = originalHTML;
            shareBtn.disabled = false;
        } catch (error) {
            console.error('Error sharing quote:', error);
            const shareBtn = quoteEntry.querySelector('.share-quote-btn');
            if (shareBtn) {
                shareBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
                shareBtn.disabled = false;
            }
        }
    }

    async generateQuoteImage(quoteEntry) {
        const blockquote = quoteEntry.querySelector('blockquote');
        const source = quoteEntry.querySelector('.source');
        
        // 1. GET CLEAN TEXT
        // We strip out newlines to let the canvas handle wrapping cleanly
        const quoteText = blockquote ? blockquote.innerText.replace(/\s+/g, ' ').trim() : '';
        const sourceText = source ? source.innerText.trim() : '';

        // 2. SETUP CANVAS CONTEXT FOR MEASURING
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Base Configuration
        const width = 1080;
        const padding = 100; // Margins on sides
        const textMaxWidth = width - (padding * 2);
        const footerHeight = 80; // Space for "Commonplace Book" at bottom
        const topPadding = 80;
        
        // Dynamic Variables
        let height = 1080; // Start with standard square
        let fontSize = 42; // Start with ideal large font
        let minFontSize = 24; // Don't go smaller than this
        let lineHeightMultiplier = 1.4;
        let attributionFontSize = 32;
        let spacingBetween = 60; // Space between quote and author

        // Helper: Calculate lines based on current font size
        const getLines = (text, size) => {
            ctx.font = `italic ${size}px Georgia, serif`;
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + " " + word).width;
                if (width < textMaxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
            return lines;
        };

        // 3. DYNAMIC SIZING LOGIC
        // First, try to fit text in 1080x1080 by shrinking font
        let quoteLines = [];
        let quoteBlockHeight = 0;
        let totalContentHeight = 0;
        
        // Available vertical space in a square image
        const maxSafeHeightSquare = 1080 - topPadding - footerHeight - 100; 

        do {
            quoteLines = getLines(quoteText, fontSize);
            quoteBlockHeight = quoteLines.length * (fontSize * lineHeightMultiplier);
            
            // Calculate total height including attribution
            // Attribution scales slightly with main font
            attributionFontSize = Math.max(22, Math.floor(fontSize * 0.75));
            const attributionHeight = attributionFontSize * 1.5;
            
            totalContentHeight = quoteBlockHeight + spacingBetween + attributionHeight;
            
            // If it fits, break. If not, shrink font.
            if (totalContentHeight <= maxSafeHeightSquare) {
                break;
            }
            
            if (fontSize > minFontSize) {
                fontSize -= 2; // Shrink font step by step
            } else {
                break; // Can't shrink anymore, will need to resize canvas
            }
        } while (true);

        // 4. CANVAS RESIZING LOGIC
        // If text is still too tall (even at small font), grow the canvas
        const requiredHeight = totalContentHeight + topPadding + footerHeight + 60; // +60 buffer
        
        if (requiredHeight > 1080) {
            // Try 4:5 Aspect Ratio (Standard Instagram Portrait)
            if (requiredHeight <= 1350) {
                height = 1350;
            } else {
                // If HUGE, just grow to fit exactly
                height = requiredHeight;
            }
        }

        // Apply final dimensions
        canvas.width = width;
        canvas.height = height;

        // 5. DRAWING
        
        // Background - Solid Color (Matches website base exactly)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Add subtle noise effect using simple random dots
        // Mimics website texture without needing complex SVG filters
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = 0; i < width * height * 0.05; i++) {
             const x = Math.random() * width;
             const y = Math.random() * height;
             ctx.fillRect(x, y, 1, 1);
        }
       
        // Calculate Vertical Centering
        // We center the "content block" within the available space between top and footer
        const availableVerticalSpace = height - topPadding - footerHeight;
        const startY = topPadding + (availableVerticalSpace - totalContentHeight) / 2;

        // Draw Accent Line (vertical red line on left)
        const accentX = padding - 40;
        const accentHeight = totalContentHeight;
        ctx.fillStyle = '#8b4c42';
        ctx.fillRect(accentX, startY, 6, accentHeight);

        // Draw Quote Text
        ctx.fillStyle = '#e8e6e3';
        ctx.font = `italic ${fontSize}px Georgia, serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let currentY = startY;
        quoteLines.forEach((line) => {
            ctx.fillText(line, padding, currentY);
            currentY += (fontSize * lineHeightMultiplier);
        });

        // Draw Attribution
        // Positioned relative to end of quote
        const attributionY = startY + quoteBlockHeight + (spacingBetween / 2); 
        ctx.fillStyle = '#b8b5b2';
        ctx.font = `${attributionFontSize}px Georgia, serif`;
        ctx.textAlign = 'right';
        ctx.fillText(sourceText, width - padding, attributionY);

        // Draw Footer
        ctx.fillStyle = '#666';
        ctx.font = '22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText("David Kendall Casey's Commonplace Book", width / 2, height - 30);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'share-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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

.share-notification {
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

.share-notification.show {
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
