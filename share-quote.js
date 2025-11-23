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

    // 1. Helper: Parse HTML to find which words should be italicized
    extractStyledTokens(node) {
        let tokens = [];
        
        const traverse = (currentNode, style) => {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                const text = currentNode.textContent;
                if (!text) return;
                
                // Split text to handle wrapping, but keep formatting info
                const parts = text.split(/(\s+)/);
                
                parts.forEach(part => {
                    if (part.length === 0) return;
                    // Treat newlines as spaces
                    const cleanText = part.replace(/[\n\r]+/g, ' ');
                    const isWhitespace = /^\s+$/.test(part);
                    
                    tokens.push({
                        text: cleanText,
                        isItalic: style.italic,
                        isSpace: isWhitespace,
                        isBreak: false
                    });
                });
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const tagName = currentNode.tagName.toLowerCase();
                const newStyle = { ...style };
                
                // Detect italic tags
                if (tagName === 'i' || tagName === 'em') {
                    newStyle.italic = true;
                }
                
                // Handle line breaks
                if (tagName === 'br') {
                    tokens.push({ text: '', isBreak: true });
                }
                
                // Handle paragraphs (double break)
                if (tagName === 'p' && tokens.length > 0) {
                     tokens.push({ text: '', isBreak: true });
                     tokens.push({ text: '', isBreak: true });
                }

                currentNode.childNodes.forEach(child => traverse(child, newStyle));
            }
        };

        traverse(node, { italic: false });
        return tokens;
    }

    // 2. Helper: Calculate line wrapping for mixed fonts
    calculateLines(ctx, tokens, maxWidth, baseFontFamily) {
        const lines = [];
        let currentLine = [];
        let currentLineWidth = 0;
        
        const normalFont = `42px ${baseFontFamily}`;
        const italicFont = `italic 42px ${baseFontFamily}`;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token.isBreak) {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = [];
                    currentLineWidth = 0;
                } else {
                     lines.push([]); // Empty line for spacing
                }
                continue;
            }

            // Set font to measure accurate width
            ctx.font = token.isItalic ? italicFont : normalFont;
            const metrics = ctx.measureText(token.text);
            const tokenWidth = metrics.width;

            if (token.isSpace) {
                if (currentLine.length > 0) {
                    currentLine.push({ ...token, width: tokenWidth });
                    currentLineWidth += tokenWidth;
                }
            } else {
                if (currentLineWidth + tokenWidth > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine); // Wrap
                    currentLine = [];
                    currentLineWidth = 0;
                    currentLine.push({ ...token, width: tokenWidth });
                    currentLineWidth += tokenWidth;
                } else {
                    currentLine.push({ ...token, width: tokenWidth });
                    currentLineWidth += tokenWidth;
                }
            }
        }
        
        if (currentLine.length > 0) lines.push(currentLine);
        return lines;
    }

    // 3. Main Generator Function (Replaces the old one)
    async generateQuoteImage(quoteEntry) {
        const blockquote = quoteEntry.querySelector('blockquote');
        const source = quoteEntry.querySelector('.source');
        
        // Use the new helper to get tokens instead of plain text
        const tokens = blockquote ? this.extractStyledTokens(blockquote) : [];
        const sourceText = source ? source.innerText.trim() : '';

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#252525');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Configuration
        const maxWidth = 880;
        const lineHeight = 65;
        const baseFontFamily = 'Georgia, serif';
        const normalFont = `42px ${baseFontFamily}`;
        const italicFont = `italic 42px ${baseFontFamily}`;

        // Calculate lines using the new helper
        const quoteLines = this.calculateLines(ctx, tokens, maxWidth, baseFontFamily);

        const quoteHeight = quoteLines.length * lineHeight;
        const attributionHeight = 32;
        const spacingBetween = 100;
        const totalContentHeight = quoteHeight + spacingBetween + attributionHeight;
        
        const availableHeight = canvas.height - 120;
        const startY = (availableHeight - totalContentHeight) / 2 + 60;

        // Draw accent line
        const accentStartY = startY - 40;
        const accentHeight = totalContentHeight + 80;
        ctx.fillStyle = '#8b4c42';
        ctx.fillRect(80, accentStartY, 6, accentHeight);

        // Draw quote text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        const startX = 120;
        let currentY = startY + 42; 
        
        quoteLines.forEach((line) => {
            let currentX = startX;
            line.forEach(token => {
                ctx.fillStyle = '#e8e6e3';
                // Switch font based on the token's style
                ctx.font = token.isItalic ? italicFont : normalFont;
                ctx.fillText(token.text, currentX, currentY);
                currentX += token.width;
            });
            currentY += lineHeight;
        });

        // Attribution
        let attribY = startY + quoteHeight + spacingBetween;
        ctx.fillStyle = '#b8b5b2';
        ctx.font = '32px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText(sourceText, canvas.width - 120, attribY);

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
