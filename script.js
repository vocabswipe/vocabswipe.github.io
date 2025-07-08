// State variables
let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
let audioUnlocked = false;
let audioEnabled = true;
let maxFreq = 0;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;
let totalSentences = 0;
let isContentLoaded = false;
let lastAudioPlayTime = 0;
let lastSwipeTime = 0;
let swipeCount = 0;
let swipeWindowStart = 0;

const MAX_CACHE_SIZE = 12;
const AUDIO_DEBOUNCE_MS = 500;
const SWIPE_DEBOUNCE_MS = 300;
const MAX_SWIPES_PER_WINDOW = 10;
const SWIPE_WINDOW_MS = 5000;

const fallbackWord = {
    word: "example",
    rank: 1,
    freq: 1000,
    word_audio_file: null,
    back_cards: [{ definition_en: "A representative form or pattern", example_en: "This is an example sentence.", audio_file: null }]
};

// DOM elements
const elements = {
    themeToggle: document.querySelector('.theme-toggle'),
    audioBtn: document.querySelector('.audio-btn'),
    infoBtn: document.querySelector('.info-btn'),
    shuffleBtn: document.querySelector('.shuffle-btn'),
    resetBtn: document.querySelector('.reset-btn'),
    donateBtn: document.querySelector('.donate-btn'),
    tooltipClose: document.querySelector('.tooltip-close'),
    tooltipRetry: document.querySelector('.tooltip-retry'),
    cardSlider: document.querySelector('#card-slider'),
    tooltipOverlay: document.querySelector('.tooltip-overlay'),
    flashcard: document.querySelector('.flashcard'),
    loadingOverlay: document.querySelector('.loading-overlay'),
    totalWords: document.querySelector('#total-words'),
    totalSentences: document.querySelector('#total-sentences'),
    rateLimitWarning: document.querySelector('.rate-limit-warning')
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.dataset.theme = savedTheme;
    updateIcons(savedTheme);
    loadWords();
    setupEventListeners();
});

// Unlock audio on first interaction
document.body.addEventListener('touchstart', () => { audioUnlocked = true; }, { once: true });
document.body.addEventListener('click', () => { audioUnlocked = true; }, { once: true });

// Update button icons based on theme
function updateIcons(theme) {
    const icons = {
        theme: document.querySelector('.theme-icon'),
        audio: document.querySelector('.audio-icon'),
        info: document.querySelector('.info-icon'),
        shuffle: document.querySelector('.shuffle-icon'),
        reset: document.querySelector('.reset-icon'),
        donate: document.querySelector('.donate-icon'),
        loading: document.querySelector('.loading-icon')
    };
    if (icons.theme) icons.theme.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    if (icons.audio) icons.audio.src = theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg');
    if (icons.info) icons.info.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    if (icons.shuffle) icons.shuffle.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    if (icons.reset) icons.reset.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    if (icons.donate) icons.donate.src = theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg';
    if (icons.loading) icons.loading.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
}

// Toggle theme
function toggleTheme(e) {
    e.preventDefault();
    const newTheme = document.body.dataset.theme === 'bright' ? 'dark' : 'bright';
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    updateIcons(newTheme);
}

// Toggle audio
function toggleAudio(e) {
    e.preventDefault();
    audioEnabled = !audioEnabled;
    updateIcons(document.body.dataset.theme);
    if (!audioEnabled) stopAudio();
}

// Toggle tooltip
function toggleTooltip(type, errorMessage = '') {
    const tooltipText = document.querySelector('#tooltip-text');
    if (!elements.tooltipOverlay || !tooltipText) return;

    if (isTooltipVisible && type === null) {
        isTooltipVisible = false;
        elements.tooltipOverlay.hidden = true;
        elements.tooltipRetry.hidden = true;
        return;
    }

    isTooltipVisible = true;
    elements.tooltipOverlay.hidden = false;
    elements.tooltipRetry.hidden = type !== 'error';

    const theme = document.body.dataset.theme;
    const iconStyle = theme === 'bright' ? 'style="filter: none; fill: #00008B;"' : 'style="filter: none; fill: #FFD700;"';
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (type === 'info') {
        tooltipText.innerHTML = isMobile
            ? `
                <strong>Theme Toggle</strong> (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">): Switch between bright and dark themes.<br>
                <strong>Audio Toggle</strong> (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">): Enable or disable audio.<br>
                <strong>Info</strong> (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">): Show or hide this help message.<br>
                <strong>Shuffle</strong> (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">): Randomize the word order.<br>
                <strong>Reset</strong> (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">): Restore the original word order.<br>
                <strong>Donate</strong> (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">): Support VocabSwipe with a donation.<br>
                <strong>Swipe Left/Right</strong>: Navigate to the next or previous word card.<br>
                <strong>Swipe Up/Down</strong>: On the back of a card, cycle through definitions and examples.<br>
                <strong>Tap Once</strong>: Hear the word or sentence audio (if enabled).<br>
                <strong>Double-Tap</strong>: Flip between the front (word) and back (definition/example).<br>
                <strong>Slider</strong>: Jump to a specific word rank.
            `
            : `
                <strong>Theme Toggle</strong> (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">): Switch between bright and dark themes.<br>
                <strong>Audio Toggle</strong> (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">): Enable or disable audio.<br>
                <strong>Info</strong> (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">): Show or hide this help message.<br>
                <strong>Shuffle</strong> (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">): Randomize the word order.<br>
                <strong>Reset</strong> (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">): Restore the original word order.<br>
                <strong>Donate</strong> (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">): Support VocabSwipe with a donation.<br>
                <strong>Left/Right Arrow Keys</strong>: Navigate to the previous or next word card.<br>
                <strong>Up/Down Arrow Keys</strong>: On the back of a card, cycle through definitions and examples.<br>
                <strong>Spacebar</strong>: Play the word or sentence audio (if enabled).<br>
                <strong>Enter</strong>: Flip between the front (word) and back (definition/example).<br>
                <strong>Slider</strong>: Jump to a specific word rank.
            `;
    } else if (type === 'donate') {
        const qrCodeUrl = 'qr_code/VocabSwipe_qr_code.png';
        const promptPayLogoUrl = 'qr_code/PromptPay_logo.jpg';
        const img = new Image();
        img.src = qrCodeUrl;
        img.onload = () => {
            tooltipText.innerHTML = `
                <div style="text-align: center; margin-bottom: 16px;">
                    <strong>Donate to Supanut Suntikoon</strong><br>
                    <span>VocabSwipe Developer</span>
                </div>
                <p style="text-align: center; margin-bottom: 16px;">
                    Your support helps maintain and enhance this free vocabulary-learning tool for everyone.
                </p>
                <img src="${qrCodeUrl}" class="donation-qr" alt="PromptPay QR Code"><br>
                <img src="${promptPayLogoUrl}" class="promptpay-logo" alt="PromptPay Logo">
            `;
        };
        img.onerror = () => {
            tooltipText.innerHTML = `
                <div style="text-align: center; margin-bottom: 16px;">
                    <strong>Donate to Supanut Suntikoon</strong><br>
                    <span>VocabSwipe Developer</span>
                </div>
                <p style="text-align: center; margin-bottom: 16px;">
                    Your support helps maintain and enhance this free vocabulary-learning tool for everyone.
                </p>
                <p style="color: #ff0000;">Error: Unable to load PromptPay QR code. Please try again later or contact support.</p>
            `;
        };
    } else if (type === 'error') {
        tooltipText.innerHTML = `
            <strong>Error Loading Vocabulary Data</strong><br><br>
            ${errorMessage}<br><br>
            <p>Please check your internet connection or try again.</p>
        `;
    }
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Load vocabulary data
async function loadWords(retries = 3, delay = 1000) {
    if (elements.loadingOverlay) elements.loadingOverlay.hidden = false;
    try {
        const response = await fetch('data/vocab3000_database.yaml');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const yamlText = await response.text();
        if (!yamlText) throw new Error('Empty YAML response');
        words = jsyaml.load(yamlText) || [];
        if (!Array.isArray(words) || !words.length) throw new Error('No valid words found');

        words.forEach(word => {
            if (word.back_cards) word.back_cards = shuffleArray(word.back_cards);
        });
        originalWords = structuredClone(words);
        words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        maxFreq = words.find(word => word.rank === 1)?.freq || 1;
        minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
        totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);

        if (elements.cardSlider) {
            elements.cardSlider.max = words.length;
            elements.cardSlider.disabled = false;
        }
        elements.totalWords.textContent = words.length;
        elements.totalSentences.textContent = totalSentences;
        isContentLoaded = true;
        elements.statsContainer.style.opacity = '1';
        elements.loadingOverlay.hidden = true;
        displayWord();
        preloadAudio();
        if (audioUnlocked && audioEnabled && words[currentWordIndex]?.word_audio_file) {
            playAudioWithRetry(words[currentWordIndex].word_audio_file);
        }
    } catch (error) {
        if (retries > 0) {
            setTimeout(() => loadWords(retries - 1, delay), delay);
        } else {
            words = [fallbackWord];
            originalWords = [fallbackWord];
            maxFreq = minFreq = 1000;
            totalSentences = 1;
            if (elements.cardSlider) {
                elements.cardSlider.max = 1;
                elements.cardSlider.disabled = false;
            }
            elements.totalWords.textContent = '1';
            elements.totalSentences.textContent = '1';
            isContentLoaded = true;
            elements.statsContainer.style.opacity = '1';
            elements.loadingOverlay.hidden = true;
            displayWord();
            toggleTooltip('error', `Failed to load vocabulary data: ${error.message}. Using a sample word.`);
        }
    }
}

// Shuffle cards
function shuffleCards() {
    if (!isContentLoaded) return;
    words = shuffleArray(words);
    currentWordIndex = currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}

// Reset cards
function resetCards() {
    if (!isContentLoaded) return;
    words = structuredClone(originalWords).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    currentWordIndex = currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}

// Rate limiting for swipes
function checkRateLimit() {
    const now = Date.now();
    if (now - swipeWindowStart > SWIPE_WINDOW_MS) {
        swipeCount = 0;
        swipeWindowStart = now;
        elements.rateLimitWarning.hidden = true;
    }
    swipeCount++;
    if (swipeCount > MAX_SWIPES_PER_WINDOW) {
        elements.rateLimitWarning.hidden = false;
        return false;
    }
    return true;
}

// Event listeners for interactions
function setupEventListeners() {
    // Button events
    const addButtonListeners = (btn, handler) => {
        btn.addEventListener('click', handler);
        btn.addEventListener('touchend', e => { e.preventDefault(); handler(e); });
    };
    addButtonListeners(elements.themeToggle, toggleTheme);
    addButtonListeners(elements.audioBtn, toggleAudio);
    addButtonListeners(elements.infoBtn, () => toggleTooltip('info'));
    addButtonListeners(elements.shuffleBtn, shuffleCards);
    addButtonListeners(elements.resetBtn, resetCards);
    addButtonListeners(elements.donateBtn, () => toggleTooltip('donate'));
    addButtonListeners(elements.tooltipClose, () => toggleTooltip(null));
    addButtonListeners(elements.tooltipRetry, () => { toggleTooltip(null); loadWords(); });
    elements.tooltipOverlay.addEventListener('click', e => {
        if (e.target === elements.tooltipOverlay) toggleTooltip(null);
    });
    elements.tooltipOverlay.addEventListener('touchend', e => {
        if (e.target === elements.tooltipOverlay) {
            e.preventDefault();
            toggleTooltip(null);
        }
    });

    // Slider events
    elements.cardSlider.addEventListener('input', () => {
        if (!isContentLoaded) return;
        isSliding = true;
        currentWordIndex = parseInt(elements.cardSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
    });
    elements.cardSlider.addEventListener('change', () => {
        if (!isContentLoaded) return;
        isSliding = false;
        preloadAudio();
        playCurrentAudio();
    });

    // Touch and click events for flashcard
    if (elements.flashcard) {
        let tapCount = 0;
        let lastTapTime = 0;
        const doubleTapThreshold = 300;
        const handleTap = e => {
            e.preventDefault();
            if (!isContentLoaded) return;
            const currentTime = Date.now();
            tapCount++;
            if (tapCount === 1) {
                setTimeout(() => {
                    if (tapCount === 1) {
                        glowCard(1);
                        playCurrentAudio();
                    }
                    tapCount = 0;
                }, doubleTapThreshold);
            } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
                glowCard(2);
                flipCard();
                tapCount = 0;
            }
            lastTapTime = currentTime;
        };
        elements.flashcard.addEventListener('touchend', handleTap);
        elements.flashcard.addEventListener('click', e => {
            if ('ontouchstart' in window) return;
            handleTap(e);
        });

        // Swipe events
        const hammer = new Hammer(elements.flashcard);
        hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
        hammer.on('swipeleft', e => handleSwipe(e, 'left', () => {
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
        }));
        hammer.on('swiperight', e => handleSwipe(e, 'right', () => {
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
        }));
        hammer.on('swipeup', e => handleSwipe(e, 'up', () => {
            if (isFlipped && words[currentWordIndex]?.back_cards) {
                currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            }
        }));
        hammer.on('swipedown', e => handleSwipe(e, 'down', () => {
            if (isFlipped && words[currentWordIndex]?.back_cards) {
                currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            }
        }));
    }

    // Keyboard events
    let lastKeyPressTime = 0;
    const KEY_DEBOUNCE_MS = 300;
    document.addEventListener('keydown', e => {
        if (!isContentLoaded || !words.length) return;
        const now = Date.now();
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && now - lastKeyPressTime < KEY_DEBOUNCE_MS) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !checkRateLimit()) return;
        lastKeyPressTime = now;

        switch (e.key) {
            case 'ArrowLeft':
                animateSwipe('right', isFlipped);
                currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                preloadAudio();
                playCurrentAudio();
                break;
            case 'ArrowRight':
                animateSwipe('left', isFlipped);
                currentWordIndex = (currentWordIndex + 1) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                preloadAudio();
                playCurrentAudio();
                break;
            case 'ArrowUp':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('up', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    preloadAudio();
                    playCurrentAudio();
                }
                break;
            case 'ArrowDown':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('down', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    preloadAudio();
                    playCurrentAudio();
                }
                break;
            case ' ':
                glowCard(1);
                playCurrentAudio();
                break;
            case 'Enter':
                glowCard(2);
                flipCard();
                break;
        }
    });
}

// Handle swipe actions
function handleSwipe(e, direction, updateIndices) {
    e.preventDefault();
    if (!isContentLoaded || !checkRateLimit()) return;
    const now = Date.now();
    if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) return;
    lastSwipeTime = now;
    if (words.length) {
        animateSwipe(direction, isFlipped);
        updateIndices();
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }
}

// Play current audio based on card state
function playCurrentAudio() {
    if (!audioUnlocked || !audioEnabled) return;
    const audioFile = isFlipped
        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
        : words[currentWordIndex]?.word_audio_file;
    if (audioFile) playAudioWithRetry(audioFile);
}

// Glow animation for card
function glowCard(times) {
    if (!elements.flashcard) return;
    elements.flashcard.classList.remove('glow-once', 'glow-twice');
    void elements.flashcard.offsetWidth;
    elements.flashcard.classList.add(times === 1 ? 'glow-once' : 'glow-twice');
}

// Swipe animation
function animateSwipe(direction, isBackCard) {
    if (!elements.flashcard) return;
    const sideToClone = isBackCard ? '.back' : '.front';
    const clone = elements.flashcard.querySelector(sideToClone).cloneNode(true);
    clone.classList.add('swipe-clone', `swipe-${direction}`);
    elements.flashcard.parentElement.appendChild(clone);
    setTimeout(() => clone.remove(), 300);
}

// Preload audio files
function preloadAudio() {
    if (!words[currentWordIndex] || isSliding || !audioEnabled) return;
    const currentWord = words[currentWordIndex];
    const audioFiles = [
        currentWord?.word_audio_file,
        ...(currentWord?.back_cards?.slice(0, 1).map(card => card.audio_file) || [])
    ].filter(file => file && !audioCache.has(file));

    while (audioCache.size + audioFiles.length > MAX_CACHE_SIZE && audioCache.size > 0) {
        const oldestKey = audioCache.keys().next().value;
        const audio = audioCache.get(oldestKey);
        if (audio) {
            audio.pause();
            audio.src = '';
        }
        audioCache.delete(oldestKey);
    }

    audioFiles.forEach(audioFile => {
        const isWordAudio = audioFile === currentWord.word_audio_file;
        const audioPath = isWordAudio
            ? `data/audio/front/${audioFile}`
            : `data/audio/back/${currentWord.word.toLowerCase()}/${audioFile}`;
        const audio = new Audio(audioPath);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('error', () => audioCache.delete(audioFile), { once: true });
    });
}

// Stop audio playback
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// Play audio with retry
function playAudioWithRetry(audioFile, retries = 3, delay = 500) {
    if (!audioFile || !audioUnlocked || !audioEnabled) return;
    const now = Date.now();
    if (now - lastAudioPlayTime < AUDIO_DEBOUNCE_MS) return;
    lastAudioPlayTime = now;

    const isWordAudio = audioFile === words[currentWordIndex]?.word_audio_file;
    const audioPath = isWordAudio
        ? `data/audio/front/${audioFile}`
        : `data/audio/back/${words[currentWordIndex]?.word.toLowerCase()}/${audioFile}`;
    stopAudio();
    let audio = audioCache.get(audioFile) || new Audio(audioPath);
    audio.preload = 'auto';
    audio.load();
    audioCache.set(audioFile, audio);
    currentAudio = audio;

    async function attemptPlay(attempt = 1) {
        if (!audioEnabled || !audioUnlocked) return;
        try {
            await audio.play();
        } catch (error) {
            if (attempt < retries) {
                setTimeout(() => attemptPlay(attempt + 1), delay);
            }
        }
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        attemptPlay();
    } else {
        audio.addEventListener('canplaythrough', () => attemptPlay(), { once: true });
        audio.addEventListener('error', () => audioCache.delete(audioFile), { once: true });
    }
}

// Flip card
function flipCard() {
    if (!isContentLoaded || !elements.flashcard) return;
    isFlipped = !isFlipped;
    elements.flashcard.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    playCurrentAudio();
}

// Calculate frequency color
function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

// Display current word
function displayWord() {
    if (!words[currentWordIndex]) {
        elements.flashcardContainer.innerHTML = `
            <p class="error-message">No word data available. Please try again.</p>
            <button class="retry-button" aria-label="Retry loading">Retry</button>
        `;
        document.querySelector('.retry-button')?.addEventListener('click', () => loadWords());
        return;
    }

    const wordData = words[currentWordIndex] || {};
    const backCard = wordData.back_cards?.[currentBackCardIndex] || { definition_en: 'No definition available', example_en: 'No example available' };
    const logFreq = Math.log(wordData.freq || 1);
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const relativeFreq = 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0);
    const freqColor = getFrequencyColor(relativeFreq);

    if (elements.cardSlider) elements.cardSlider.value = currentWordIndex + 1;

    const front = document.querySelector('.front');
    const back = document.querySelector('.back');
    if (!front || !back) {
        elements.flashcardContainer.innerHTML = `
            <p class="error-message">Error rendering card. Please try again.</p>
            <button class="retry-button" aria-label="Retry loading">Retry</button>
        `;
        document.querySelector('.retry-button')?.addEventListener('click', () => loadWords());
        return;
    }

    front.innerHTML = `
        <div class="word-container">
            <h2>${wordData.word || 'N/A'}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank || 'N/A'}</span>
            <div class="frequency-container">
                <span class="frequency-label">Frequency</span>
                <div class="frequency-bar">
                    <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                </div>
            </div>
        </div>
    `;

    back.innerHTML = `
        <div class="word-container">
            <h2>${wordData.word || 'N/A'}</h2>
        </div>
        <div class="back-template">
            <div class="card-info">
                <p class="definition">${backCard.definition_en || 'No definition available'}</p>
                <p class="example">"${backCard.example_en || 'No example available'}"</p>
            </div>
            <div class="meta-info">
                <span class="rank">Rank: ${wordData.rank || 'N/A'}</span>
                <div class="frequency-container">
                    <span class="frequency-label">Frequency</span>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
