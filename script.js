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
let maxFreq = 1;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;
let totalSentences = 0;
let isContentLoaded = false;
let lastAudioPlayTime = 0;
const AUDIO_DEBOUNCE_MS = 300;

// Utility to escape HTML
const escapeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
};

// Debounce utility
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') ?? 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('Service Worker registered:', reg);
        }).catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    }

    // Event listeners
    document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
    document.querySelector('.audio-btn').addEventListener('click', toggleAudio);
    document.querySelector('.info-btn').addEventListener('click', toggleTooltip);
    document.querySelector('.shuffle-btn').addEventListener('click', shuffleCards);
    document.querySelector('.reset-btn').addEventListener('click', resetCards);
    document.querySelector('.store-btn').addEventListener('click', () => {
        window.location.href = '/store';
    });
    document.querySelector('.tooltip-close').addEventListener('click', toggleTooltip);

    const cardSlider = document.querySelector('#card-slider');
    cardSlider.addEventListener('input', () => {
        isSliding = true;
        currentWordIndex = parseInt(cardSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
    });
    cardSlider.addEventListener('change', () => {
        isSliding = false;
        preloadAudio();
        playCurrentAudio();
    });

    loadWords();
    setupEventListeners();
    setupKeyboardListeners();

    // Lazy load audio when flashcard is visible
    const flashcard = document.querySelector('.flashcard');
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && isContentLoaded) {
            preloadAudio();
        }
    }, { threshold: 0.1 });
    observer.observe(flashcard);
});

document.body.addEventListener('touchstart', () => {
    audioUnlocked = true;
}, { once: true });
document.body.addEventListener('click', () => {
    audioUnlocked = true;
}, { once: true });

function updateIcons(theme) {
    const icons = {
        theme: document.querySelector('.theme-icon'),
        audio: document.querySelector('.audio-icon'),
        info: document.querySelector('.info-icon'),
        shuffle: document.querySelector('.shuffle-icon'),
        reset: document.querySelector('.reset-icon'),
        store: document.querySelector('.store-icon'),
        loading: document.querySelector('.loading-icon')
    };
    icons.theme.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    icons.audio.src = theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg');
    icons.info.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    icons.shuffle.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    icons.reset.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    icons.store.src = theme === 'bright' ? 'bag-bright.svg' : 'bag-night.svg';
    if (icons.loading) {
        icons.loading.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcons(newTheme);
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    updateIcons(document.body.getAttribute('data-theme'));
    if (!audioEnabled) stopAudio();
}

function toggleTooltip() {
    const overlay = document.querySelector('.tooltip-overlay');
    const tooltipText = document.querySelector('#tooltip-text');
    isTooltipVisible = !isTooltipVisible;
    const theme = document.body.getAttribute('data-theme');
    const iconStyle = theme === 'bright' ? 'style="filter: none; fill: #00008B;"' : 'style="filter: none; fill: #FFD700;"';
    tooltipText.innerHTML = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ?
        `
            <strong>How to Use VocabSwipe:</strong><br><br>
            - <strong>Theme Toggle (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Tap to switch between bright and dark themes.<br>
            - <strong>Audio Toggle (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Tap to enable or disable audio.<br>
            - <strong>Info (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">):</strong> Tap to show or hide this help message.<br>
            - <strong>Shuffle (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Tap to randomize the word order.<br>
            - <strong>Reset (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Tap to restore the original word order.<br>
            - <strong>Store (<img src="${theme === 'bright' ? 'bag-bright.svg' : 'bag-night.svg'}" width="24" height="24" ${iconStyle} alt="Store">):</strong> Tap to explore digital products for English learning.<br>
            - <strong>Swipe Left/Right:</strong> Navigate to the next or previous word card.<br>
            - <strong>Swipe Up/Down:</strong> On the back of a card, cycle through different definitions and examples.<br>
            - <strong>Tap Once:</strong> Hear the word or sentence audio (if audio is enabled).<br>
            - <strong>Double-Tap:</strong> Flip between the front (word) and back (definition/example).<br>
            - <strong>Slider:</strong> Jump to a specific word rank.
        ` :
        `
            <strong>How to Use VocabSwipe:</strong><br><br>
            - <strong>Theme Toggle (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Click to switch between bright and dark themes.<br>
            - <strong>Audio Toggle (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Click to enable or disable audio.<br>
            - <strong>Info (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">):</strong> Click to show or hide this help message.<br>
            - <strong>Shuffle (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Click to randomize the word order.<br>
            - <strong>Reset (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Click to restore the original word order.<br>
            - <strong>Store (<img src="${theme === 'bright' ? 'bag-bright.svg' : 'bag-night.svg'}" width="24" height="24" ${iconStyle} alt="Store">):</strong> Click to explore digital products for English learning.<br>
            - <strong>Left/Right Arrow Keys:</strong> Navigate to the previous or next word card.<br>
            - <strong>Up/Down Arrow Keys:</strong> On the back of a card, cycle through different definitions and examples.<br>
            - <strong>Spacebar:</strong> Play the word or sentence audio (if audio is enabled).<br>
            - <strong>Enter:</strong> Flip between the front (word) and back (definition/example).<br>
            - <strong>Slider:</strong> Jump to a specific word rank.
        `;
    overlay.style.display = isTooltipVisible ? 'flex' : 'none';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadWords() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    fetch('data/vocab3000_database.yaml')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) ?? [];
            if (!Array.isArray(words) || !words.length) {
                throw new Error('No valid words found in vocab3000_database.yaml');
            }
            words.forEach(word => {
                word.back_cards = shuffleArray(word.back_cards ?? []);
            });
            originalWords = structuredClone(words);
            words.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
            maxFreq = words.find(word => word.rank === 1)?.freq ?? 1;
            minFreq = Math.min(...words.map(word => word.freq ?? 1).filter(freq => freq > 0)) || 1;
            totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length ?? 0), 0);
            document.querySelector('#card-slider').max = words.length;
            document.querySelector('#total-words').textContent = words.length;
            document.querySelector('#total-sentences').textContent = totalSentences;
            isContentLoaded = true;
            displayWord();
            document.querySelector('.stats-container').style.opacity = '1';
            loadingOverlay.style.display = 'none';
            preloadAudio();
            playCurrentAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error);
            document.querySelector('.flashcard-container').innerHTML = '<p>Failed to load vocabulary data. Please check your internet connection or try again later.</p>';
            loadingOverlay.style.display = 'none';
        });
}

const debouncedShuffleCards = debounce(() => {
    words = shuffleArray([...words]);
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}, 300);

const debouncedResetCards = debounce(() => {
    words = structuredClone(originalWords).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}, 300);

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    if (!card) {
        console.error('Flashcard element not found');
        return;
    }

    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    const handleTap = (e) => {
        if (!isContentLoaded) return;
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

    card.addEventListener('click', handleTap);
    card.addEventListener('touchend', handleTap);

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });

    const handleSwipe = debounce((direction, callback) => {
        if (!isContentLoaded) return;
        animateSwipe(direction, isFlipped);
        callback();
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }, 300);

    hammer.on('swipeleft', () => handleSwipe('left', () => {
        currentWordIndex = (currentWordIndex + 1) % words.length;
        currentBackCardIndex = 0;
    }));

    hammer.on('swiperight', () => handleSwipe('right', () => {
        currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
        currentBackCardIndex = 0;
    }));

    hammer.on('swipeup', () => {
        if (!isFlipped || !words[currentWordIndex]?.back_cards) return;
        handleSwipe('up', () => {
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
        });
    });

    hammer.on('swipedown', () => {
        if (!isFlipped || !words[currentWordIndex]?.back_cards) return;
        handleSwipe('down', () => {
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
        });
    });
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', debounce((e) => {
        if (!words.length || !isContentLoaded) return;
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
    }, 300));
}

function glowCard(times) {
    const card = document.querySelector('.flashcard');
    if (!card) return;
    card.classList.remove('glow-once', 'glow-twice');
    void card.offsetWidth;
    card.classList.add(times === 1 ? 'glow-once' : 'glow-twice');
}

function animateSwipe(direction, isBackCard) {
    const card = document.querySelector('.flashcard');
    if (!card) return;
    const sideToClone = isBackCard ? '.back' : '.front';
    const clone = card.querySelector(sideToClone).cloneNode(true);
    clone.classList.add('swipe-clone', `swipe-${direction}`);
    card.parentElement.appendChild(clone);
    setTimeout(() => clone.remove(), 300);
}

function preloadAudio() {
    if (!words[currentWordIndex] || isSliding || !audioEnabled) return;
    const currentWord = words[currentWordIndex];
    const nextIndex = (currentWordIndex + 1) % words.length;
    const prevIndex = (currentWordIndex - 1 + words.length) % words.length;
    const audioFiles = [
        currentWord?.word_audio_file,
        ...(currentWord?.back_cards?.map(card => card.audio_file) ?? []),
        words[nextIndex]?.word_audio_file,
        ...(words[nextIndex]?.back_cards?.map(card => card.audio_file) ?? []),
        words[prevIndex]?.word_audio_file,
        ...(words[prevIndex]?.back_cards?.map(card => card.audio_file) ?? [])
    ].filter(file => file && !audioCache.has(file));

    while (audioCache.size + audioFiles.length > MAX_CACHE_SIZE) {
        const oldestKey = audioCache.keys().next().value;
        const audio = audioCache.get(oldestKey);
        audio?.pause();
        audio.src = '';
        audioCache.delete(oldestKey);
    }

    audioFiles.forEach(audioFile => {
        const isWordAudio = audioFile === currentWord.word_audio_file ||
                            audioFile === words[nextIndex]?.word_audio_file ||
                            audioFile === words[prevIndex]?.word_audio_file;
        const audioPath = isWordAudio
            ? `data/audio/front/${audioFile}`
            : `data/audio/back/${currentWord.word.toLowerCase()}/${audioFile}`;
        const audio = new Audio(audioPath);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
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
    if (!audioUnlocked || !audioEnabled) return;
    const audioFile = isFlipped
        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file ?? words[currentWordIndex]?.word_audio_file)
        : words[currentWordIndex]?.word_audio_file;
    if (audioFile) playAudioWithRetry(audioFile, 3, 500);
}

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
    let audio = audioCache.get(audioFile) ?? new Audio(audioPath);
    audio.preload = 'auto';
    audio.load();
    audioCache.set(audioFile, audio);
    currentAudio = audio;

    const attemptPlay = (attempt = 1) => {
        if (!audioEnabled || !audioUnlocked) return;
        audio.play().then(() => {
            console.log(`Playing: ${audioPath} (Attempt ${attempt})`);
        }).catch(error => {
            console.error(`Playback error for ${audioPath} (Attempt ${attempt}): ${error.message}`);
            if (attempt < retries) {
                setTimeout(() => attemptPlay(attempt + 1), delay);
            } else {
                audioCache.delete(audioFile);
            }
        });
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        attemptPlay();
    } else {
        audio.addEventListener('canplaythrough', () => attemptPlay(), { once: true });
        audio.addEventListener('error', () => audioCache.delete(audioFile), { once: true });
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    if (!card) return;
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    playCurrentAudio();
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 120, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    const wordData = words[currentWordIndex] ?? {};
    const backCard = wordData.back_cards?.[currentBackCardIndex] ?? { definition_en: 'No definition available', example_en: 'No example available' };

    const logFreq = Math.log(wordData.freq ?? 1);
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq || 1);
    const relativeFreq = logMaxFreq === logMinFreq ? 50 : 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0);
    const freqColor = getFrequencyColor(relativeFreq);

    document.querySelector('#card-slider').value = currentWordIndex + 1;

    document.querySelector('.front').innerHTML = `
        <div class="word-container">
            <h2>${escapeHTML(wordData.word)}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank ?? 'N/A'}</span>
            <div class="frequency-container">
                <span class="frequency-label">Frequency</span>
                <div class="frequency-bar">
                    <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('.back').innerHTML = `
        <div class="word-container">
            <h2>${escapeHTML(wordData.word)}</h2>
        </div>
        <div class="back-template">
            <div class="card-info">
                <p class="definition">${escapeHTML(backCard.definition_en)}</p>
                <p class="example">"${escapeHTML(backCard.example_en)}"</p>
            </div>
            <div class="meta-info">
                <span class="rank">Rank: ${wordData.rank ?? 'N/A'}</span>
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
