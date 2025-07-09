const AUDIO_BASE_PATH = 'data/audio/';
let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;
let audioUnlocked = false;
let audioEnabled = true;
let maxFreq = 0;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;

// Cached DOM elements
const dom = {
    body: document.body,
    themeToggle: document.querySelector('.theme-toggle'),
    audioBtn: document.querySelector('.audio-btn'),
    shuffleBtn: document.querySelector('.shuffle-btn'),
    resetBtn: document.querySelector('.reset-btn'),
    infoBtn: document.querySelector('.info-btn'),
    tooltipOverlay: document.querySelector('.tooltip-overlay'),
    tooltipClose: document.querySelector('.tooltip-close'),
    cardSlider: document.querySelector('#card-slider'),
    flashcard: document.querySelector('.flashcard'),
    flashcardContainer: document.querySelector('.flashcard-container'),
    totalWords: document.querySelector('#total-words'),
    totalSentences: document.querySelector('#total-sentences'),
    themeIcon: document.querySelector('.theme-icon'),
    audioIcon: document.querySelector('.audio-icon'),
    infoIcon: document.querySelector('.info-icon'),
    shuffleIcon: document.querySelector('.shuffle-icon'),
    resetIcon: document.querySelector('.reset-icon'),
    tooltipText: document.querySelector('#tooltip-text')
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    dom.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.audioBtn.addEventListener('click', toggleAudio);
    dom.audioBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleAudio();
    });
    dom.shuffleBtn.addEventListener('click', shuffleCards);
    dom.resetBtn.addEventListener('click', resetCards);
    dom.infoBtn.addEventListener('click', toggleTooltip);
    dom.infoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip();
    });
    dom.tooltipClose.addEventListener('click', toggleTooltip);
    dom.tooltipClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip();
    });
    dom.tooltipOverlay.addEventListener('click', (e) => {
        if (e.target === dom.tooltipOverlay) toggleTooltip();
    });

    dom.cardSlider.addEventListener('input', debounce(() => {
        isSliding = true;
        currentWordIndex = parseInt(dom.cardSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
    }, 100));
    dom.cardSlider.addEventListener('change', () => {
        isSliding = false;
        preloadAudio();
        playCurrentAudio();
    });

    loadWords();
    setupEventListeners();
    setupKeyboardListeners();
});

document.body.addEventListener('touchstart', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via touchstart');
}, { once: true });
document.body.addEventListener('click', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via click');
}, { once: true });

function toggleTheme() {
    const currentTheme = dom.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
    dom.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcons(newTheme);
}

function updateIcons(theme) {
    dom.themeIcon.src = `${theme}-theme.svg`;
    dom.audioIcon.src = audioEnabled ? `${theme}-unmute.svg` : `${theme}-mute.svg`;
    dom.infoIcon.src = `${theme}-information.svg`;
    dom.shuffleIcon.src = `${theme}-shuffle.svg`;
    dom.resetIcon.src = `${theme}-reset.svg`;
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    updateIcons(dom.body.getAttribute('data-theme'));
    if (!audioEnabled) stopAudio();
}

function toggleTooltip() {
    isTooltipVisible = !isTooltipVisible;
    const theme = dom.body.getAttribute('data-theme');
    const iconStyle = theme === 'dark' ? 'style="filter: none; fill: #FFD700;"' : 'style="filter: none; fill: #00008B;"';
    if (isTooltipVisible) {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        dom.tooltipText.innerHTML = isMobile
            ? `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Theme Toggle (<img src="${theme}-theme.svg" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Tap to switch between bright and dark themes.<br>
                - <strong>Audio Toggle (<img src="${theme}-${audioEnabled ? 'unmute' : 'mute'}.svg" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Tap to enable or disable audio.<br>
                - <strong>Info (<img src="${theme}-information.svg" width="24" height="24" ${iconStyle} alt="Info">):</strong> Tap to show or hide this help message.<br>
                - <strong>Shuffle (<img src="${theme}-shuffle.svg" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Tap to randomize the word order.<br>
                - <strong>Reset (<img src="${theme}-reset.svg" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Tap to restore the original word order.<br>
                - <strong>Swipe Left/Right:</strong> Navigate to the next or previous word card.<br>
                - <strong>Swipe Up/Down:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Tap Once:</strong> Hear the word or sentence audio (if audio is enabled).<br>
                - <strong>Double-Tap:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Jump to a specific word rank.
            `
            : `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Theme Toggle (<img src="${theme}-theme.svg" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Click to switch between bright and dark themes.<br>
                - <strong>Audio Toggle (<img src="${theme}-${audioEnabled ? 'unmute' : 'mute'}.svg" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Click to enable or disable audio.<br>
                - <strong>Info (<img src="${theme}-information.svg" width="24" height="24" ${iconStyle} alt="Info">):</strong> Click to show or hide this help message.<br>
                - <strong>Shuffle (<img src="${theme}-shuffle.svg" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Click to randomize the word order.<br>
                - <strong>Reset (<img src="${theme}-reset.svg" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Click to restore the original word order.<br>
                - <strong>Left/Right Arrow Keys:</strong> Navigate to the previous or next word card.<br>
                - <strong>Up/Down Arrow Keys:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Spacebar:</strong> Play the word or sentence audio (if audio is enabled).<br>
                - <strong>Enter:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Jump to a specific word rank.
            `;
        dom.tooltipOverlay.style.display = 'flex';
    } else {
        dom.tooltipOverlay.style.display = 'none';
    }
}

function loadWords() {
    fetch('data/vocab_database.yaml')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!Array.isArray(words) || words.length === 0) {
                throw new Error('No valid words found in vocab_database.yaml');
            }
            originalWords = [...words];
            words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
            dom.cardSlider.max = words.length;
            dom.totalWords.textContent = words.length;
            dom.totalSentences.textContent = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);
            displayWord();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            dom.flashcardContainer.innerHTML = '<p class="error-message">Failed to load vocabulary data. Please try again later.</p>';
        });
}

function shuffleCards() {
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
}

function resetCards() {
    words = [...originalWords].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
}

function setupEventListeners() {
    if (!dom.flashcard) {
        console.error('Flashcard element not found');
        return;
    }
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    const handleTap = (e) => {
        if (e.type === 'click' && 'ontouchstart' in window) return;
        e.preventDefault();
        const currentTime = new Date().getTime();
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

    dom.flashcard.addEventListener('touchend', handleTap);
    dom.flashcard.addEventListener('click', handleTap);

    const hammer = new Hammer(dom.flashcard);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', (e) => {
        e.preventDefault();
        if (words.length) {
            animateSwipe('left');
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            playCurrentAudio();
            preloadAudio();
        }
    });
    hammer.on('swiperight', (e) => {
        e.preventDefault();
        if (words.length) {
            animateSwipe('right');
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            playCurrentAudio();
            preloadAudio();
        }
    });
    hammer.on('swipeup', (e) => {
        e.preventDefault();
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('up');
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            playCurrentAudio();
            preloadAudio();
        }
    });
    hammer.on('swipedown', (e) => {
        e.preventDefault();
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('down');
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            playCurrentAudio();
            preloadAudio();
        }
    });
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        if (!words.length) return;
        switch (e.key) {
            case 'ArrowLeft':
                animateSwipe('right');
                currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                playCurrentAudio();
                preloadAudio();
                break;
            case 'ArrowRight':
                animateSwipe('left');
                currentWordIndex = (currentWordIndex + 1) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                playCurrentAudio();
                preloadAudio();
                break;
            case 'ArrowUp':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('up');
                    currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    playCurrentAudio();
                    preloadAudio();
                }
                break;
            case 'ArrowDown':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('down');
                    currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    playCurrentAudio();
                    preloadAudio();
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

function glowCard(times) {
    if (!dom.flashcard) return;
    dom.flashcard.classList.remove('glow-once', 'glow-twice');
    void dom.flashcard.offsetWidth; // Trigger reflow
    dom.flashcard.classList.add(times === 1 ? 'glow-once' : 'glow-twice');
}

function animateSwipe(direction) {
    if (!dom.flashcard) return;
    const sideToClone = isFlipped ? '.back' : '.front';
    const clone = dom.flashcard.querySelector(sideToClone).cloneNode(true);
    clone.classList.add('swipe-clone', `swipe-${direction}`);
    dom.flashcardContainer.appendChild(clone);
    setTimeout(() => clone.remove(), 300);
}

function preloadAudio() {
    if (!words[currentWordIndex] || isSliding || !audioEnabled) return;
    const currentWord = words[currentWordIndex];
    const nextIndex = (currentWordIndex + 1) % words.length;
    const prevIndex = (currentWordIndex - 1 + words.length) % words.length;
    const nextWord = words[nextIndex];
    const prevWord = words[prevIndex];

    const audioFiles = [
        currentWord?.word_audio_file?.[0],
        ...(currentWord?.sentence_audio_file || []),
        nextWord?.word_audio_file?.[0],
        ...(nextWord?.sentence_audio_file || []),
        prevWord?.word_audio_file?.[0],
        ...(prevWord?.sentence_audio_file || [])
    ].filter(file => file && !audioCache.has(file) && file !== currentAudio?.src.split('/').pop());

    while (audioCache.size + audioFiles.length > MAX_CACHE_SIZE && audioCache.size > 0) {
        const oldestKey = audioCache.keys().next().value;
        if (currentAudio?.src.includes(oldestKey)) continue;
        audioCache.delete(oldestKey);
    }

    audioFiles.forEach(audioFile => {
        const audio = new Audio(`${AUDIO_BASE_PATH}${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('canplaythrough', () => console.log(`Preloaded: ${AUDIO_BASE_PATH}${audioFile}`), { once: true });
        audio.addEventListener('error', () => {
            console.error(`Failed to preload audio: ${AUDIO_BASE_PATH}${audioFile}`);
            audioCache.delete(audioFile);
        }, { once: true });
    });
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

function playCurrentAudio() {
    if (!audioUnlocked || !audioEnabled || !words[currentWordIndex]) return;
    const audioFile = isFlipped
        ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
        : words[currentWordIndex]?.word_audio_file?.[0];
    if (audioFile) playAudio(audioFile);
}

function playAudio(audioFile) {
    if (!audioFile) {
        console.warn('No audio file provided');
        return;
    }
    stopAudio();
    let audio = audioCache.get(audioFile);
    if (!audio) {
        audio = new Audio(`${AUDIO_BASE_PATH}${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
    }
    currentAudio = audio;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => console.log(`Successfully playing: ${AUDIO_BASE_PATH}${audioFile}`))
            .catch(error => console.error(`Playback error for ${AUDIO_BASE_PATH}${audioFile}:`, error.message));
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    dom.flashcard.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    playCurrentAudio();
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        dom.flashcardContainer.innerHTML = '<p class="error-message">No word data available.</p>';
        return;
    }
    const wordData = words[currentWordIndex];
    const backCard = wordData.back_cards?.[currentBackCardIndex] || { definition_en: '', example_en: '' };

    const freq = wordData.freq || 1;
    const logFreq = Math.log(freq > 0 ? freq : 1);
    const logMinFreq = Math.log(minFreq > 0 ? minFreq : 1);
    const logMaxFreq = Math.log(maxFreq > 0 ? maxFreq : 1);
    const relativeFreq = logMaxFreq === logMinFreq ? 50 : 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0);
    const freqColor = getFrequencyColor(relativeFreq);

    dom.cardSlider.value = currentWordIndex + 1;
    dom.cardSlider.setAttribute('aria-valuetext', `Word ${currentWordIndex + 1}: ${wordData.word || 'N/A'}`);

    dom.flashcard.querySelector('.front').innerHTML = `
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

    dom.flashcard.querySelector('.back').innerHTML = `
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
