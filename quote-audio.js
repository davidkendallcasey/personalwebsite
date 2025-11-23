class QuoteAudio {
    constructor() {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.selectedVoice = null;
        this.currentButton = null;
        this.init();
    }

    init() {
        // Initialize voice loading immediately
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
            this.loadVoices();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.addAudioButtons());
        } else {
            this.addAudioButtons();
        }
    }

    loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;

        // Priority: British Male -> British Female -> English Male -> Any English
        this.selectedVoice = voices.find(v => 
            (v.lang.includes('en-GB') || v.lang.includes('en-UK')) && 
            (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel'))
        ) || voices.find(v => 
            v.lang.includes('en-GB') || v.lang.includes('en-UK')
        ) || voices.find(v => 
            v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
        ) || voices.find(v => v.lang.startsWith('en'));
    }

    addAudioButtons() {
        const quoteEntries = document.querySelectorAll('.quote-entry');
        
        quoteEntries.forEach((entry) => {
            // Prevent duplicates
            if (entry.querySelector('.audio-quote-btn')) return;

            const audioBtn = document.createElement('button');
            audioBtn.className = 'audio-quote-btn';
            audioBtn.setAttribute('aria-label', 'Listen to quote');
            audioBtn.setAttribute('title', 'Listen to quote');
            
            // Play Icon SVG
            audioBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;

            audioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAudio(entry, audioBtn);
            });

            // Append to the source line if it exists, otherwise the entry itself
            const sourceEl = entry.querySelector('.source');
            if (sourceEl && sourceEl.parentElement) {
                // Insert before the share button if it exists, or append
                const shareBtn = sourceEl.parentElement.querySelector('.share-quote-btn');
                if (shareBtn) {
                    sourceEl.parentElement.insertBefore(audioBtn, shareBtn);
                } else {
                    sourceEl.parentElement.appendChild(audioBtn);
                }
            } else {
                entry.appendChild(audioBtn);
            }
        });
    }

    toggleAudio(entry, btn) {
        // If clicking the same button that's currently playing
        if (this.isPlaying && this.currentButton === btn) {
            this.stop();
            return;
        }

        // If playing something else, stop it first
        if (this.isPlaying) {
            this.stop();
        }

        const blockquote = entry.querySelector('blockquote');
        const source = entry.querySelector('.source');
        
        const text = (blockquote ? blockquote.innerText : '') + 
                     (source ? ' ... ' + source.innerText : '');

        if (!text.trim()) return;

        this.play(text, btn);
    }

    play(text, btn) {
        if (!window.speechSynthesis) return;

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        if (this.selectedVoice) {
            this.currentUtterance.voice = this.selectedVoice;
        }

        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 0.95;

        this.currentUtterance.onstart = () => {
            this.isPlaying = true;
            this.currentButton = btn;
            this.setButtonState(btn, 'playing');
        };

        this.currentUtterance.onend = () => {
            this.stop();
        };

        this.currentUtterance.onerror = (e) => {
            console.error("Speech error", e);
            this.stop();
        };

        window.speechSynthesis.speak(this.currentUtterance);
    }

    stop() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (this.currentButton) {
            this.setButtonState(this.currentButton, 'stopped');
        }
        this.isPlaying = false;
        this.currentButton = null;
        this.currentUtterance = null;
    }

    setButtonState(btn, state) {
        if (state === 'playing') {
            btn.classList.add('playing');
            // Pause/Stop Icon SVG
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
        } else {
            btn.classList.remove('playing');
            // Play Icon SVG
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
        }
    }
}

// Inject Styles
const audioStyles = `
<style>
.audio-quote-btn {
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

.audio-quote-btn:hover {
    background: #8b4c42;
    color: #fff;
    transform: scale(1.1);
}

.audio-quote-btn.playing {
    background: #8b4c42;
    color: #fff;
    animation: pulse-audio 1.5s infinite;
}

@keyframes pulse-audio {
    0% { box-shadow: 0 0 0 0 rgba(139, 76, 66, 0.7); }
    70% { box-shadow: 0 0 0 6px rgba(139, 76, 66, 0); }
    100% { box-shadow: 0 0 0 0 rgba(139, 76, 66, 0); }
}

@media (max-width: 768px) {
    .audio-quote-btn {
        width: 40px;
        height: 40px;
    }
}
</style>`;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.head.insertAdjacentHTML('beforeend', audioStyles);
        window.quoteAudio = new QuoteAudio();
    });
} else {
    document.head.insertAdjacentHTML('beforeend', audioStyles);
    window.quoteAudio = new QuoteAudio();
}