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
        
        const quoteText = blockquote ? blockquote.innerText.trim() : '';
        const sourceText = source ? source.innerText.trim() : '';

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Background gradient - pure neutral grays
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#252525');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate quote lines first to determine total height
        ctx.font = 'italic 42px Georgia, serif';
        const maxWidth = 880;
        const lineHeight = 65;
        const words = quoteText.split(' ');
        const quoteLines = [];
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                quoteLines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        quoteLines.push(line);

        // Calculate total content height
        const quoteHeight = quoteLines.length * lineHeight;
        const attributionHeight = 32; // font size
        const spacingBetween = 100;
        const footerHeight = 22;
        const totalContentHeight = quoteHeight + spacingBetween + attributionHeight;
        
        // Center content vertically (leaving space for footer at bottom)
        const availableHeight = canvas.height - 120; // 60px top padding + 60px bottom for footer
        const startY = (availableHeight - totalContentHeight) / 2 + 60;

        // Draw accent line centered with content
        const accentStartY = startY - 40;
        const accentHeight = totalContentHeight + 80;
        ctx.fillStyle = '#8b4c42';
        ctx.fillRect(80, accentStartY, 6, accentHeight);

        // Draw quote text (centered)
        ctx.fillStyle = '#e8e6e3';
        ctx.font = 'italic 42px Georgia, serif';
        ctx.textAlign = 'left';
        
        const x = 120;
        let y = startY;
        
        quoteLines.forEach((line) => {
            ctx.fillText(line, x, y);
            y += lineHeight;
        });

        // Attribution - right aligned with proper positioning
        y += spacingBetween;
        ctx.fillStyle = '#b8b5b2';
        ctx.font = '32px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText(sourceText, canvas.width - 120, y);

        // Footer
        ctx.fillStyle = '#666';
        ctx.font = '22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText("David Kendall Casey's Commonplace Book", canvas.width / 2, canvas.height - 60);

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
