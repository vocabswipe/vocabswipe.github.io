const AUDIO_BASE_PATH = 'data/audio/';
const MAX_CACHE_SIZE = 12;
const AUDIO_DEBOUNCE_MS = 300;
const SWIPE_DEBOUNCE_MS = 300;

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

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupControlListeners();
    loadWords();
    setupCardListeners();
    setupKeyboardListeners();
    unlockAudio();
});

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);
}

function unlockAudio() {
    document.body.addEventListener('touchstart', () => {
        audioUnlocked = true;
        console.log('Audio unlocked via touchstart');
    }, { once: true });
    document.body.addEventListener('click', () => {
        audioUnlocked = true;
        console.log('Audio unlocked via click');
    }, { once: true });
}

function updateIcons(theme) {
    const icons = {
        theme: document.querySelector('.theme-icon'),
        audio: document.querySelector('.audio-icon'),
        info: document.querySelector('.info-icon'),
        shuffle: document.querySelector('.shuffle-icon'),
        reset: document.querySelector('.reset-icon'),
        loading: document.querySelector('.loading-icon')
    };
    if (icons.theme) icons.theme.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    if (icons.audio) icons.audio.src = audioEnabled 
        ? (theme === 'bright' ? 'unmute-bright.svg' : 'unmute-night.svg')
        : (theme === 'bright' ? 'mute-bright.svg' : 'mute-night.svg');
    if (icons.info) icons.info.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    if (icons.shuffle) icons.shuffle.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    if (icons.reset) icons.reset.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    if (icons.loading) icons.loading.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
}

function setupControlListeners() {
    const themeToggle = document.querySelector('.theme-toggle');
    const audioBtn = document.querySelector('.audio-btn');
    const shuffleBtn = document.querySelector('.shuffle-btn');
    const resetBtn = document.querySelector('.reset-btn');
    const infoBtn = document.querySelector('.info-btn');
    const tooltipClose = document.querySelector('.tooltip-close');
    const cardSlider = document.querySelector('#card-slider');

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.addEventListener('touchend', e => { e.preventDefault(); toggleTheme(); });
    }
    if (audioBtn) {
        audioBtn.addEventListener('click', toggleAudio);
        audioBtn.addEventListener('touchend', e => { e.preventDefault(); toggleAudio(); });
    }
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleCards);
    if (resetBtn) resetBtn.addEventListener('click', resetCards);
    if (infoBtn) {
        infoBtn.addEventListener('click', toggleTooltip);
        infoBtn.addEventListener('touchend', e => { e.preventDefault(); toggleTooltip(); });
    }
    if (tooltipClose) {
        tooltipClose.addEventListener('click', toggleTooltip);
        tooltipClose.addEventListener('touchend', e => { e.preventDefault(); toggleTooltip(); });
    }
    if (cardSlider) {
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
    if (isTooltipVisible) {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        tooltipText.innerHTML = isMobile 
            ? getMobileTooltipContent(theme)
            : getDesktopTooltipContent(theme);
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

function getMobileTooltipContent(theme) {
    return `
        <strong>How to Use VocabSwipe:</strong><br><br>
        - <strong>Theme Toggle (<span class="tooltip-icon theme-icon"></span>):</strong> Tap to switch between bright and dark themes.<br>
        - <strong>Audio Toggle (<span class="tooltip-icon audio-icon"></span>):</strong> Tap to enable or disable audio.<br>
        - <strong>Info (<span class="tooltip-icon info-icon"></span>):</strong> Tap to show or hide this help message.<br>
        - <strong>Shuffle (<span class="tooltip-icon shuffle-icon"></span>):</strong> Tap to randomize the word order.<br>
        - <strong>Reset (<span class="tooltip-icon reset-icon"></span>):</strong> Tap to restore the original word order.<br>
        - <strong>Swipe Left/Right:</strong> Navigate to the next or previous word card.<br>
        - <strong>Swipe Up/Down:</strong> On the back of a card, cycle through different definitions and examples.<br>
        - <strong>Tap Once:</strong> Hear the word or sentence audio (if audio is enabled).<br>
        - <strong>Double-Tap:</strong> Flip between the front (word) and back (definition/example).<br>
        - <strong>Slider:</strong> Jump to a specific word rank.
    `;
}

function getDesktopTooltipContent(theme) {
    return `
        <strong>How to Use VocabSwipe:</strong><br><br>
        - <strong>Theme Toggle (<span class="tooltip-icon theme-icon"></span>):</strong> Click to switch between bright and dark themes.<br>
        - <strong>Audio Toggle (<span class="tooltip-icon audio-icon"></span>):</strong> Click to enable or disable audio.<br>
        - <strong>Info (<span class="tooltip-icon info-icon"></span>):</strong> Click to show or hide this help message.<br>
        - <strong>Shuffle (<span class="tooltip-icon shuffle-icon"></span>):</strong> Click to randomize the word order.<br>
        - <strong>Reset (<span class="tooltip-icon reset-icon"></span>):</strong> Click to restore the original word order.<br>
        - <strong>Left/Right Arrow Keys:</strong> Navigate to the previous or next word card.<br>
        - <strong>Up/Down Arrow Keys:</strong> On the back of a card, cycle through different definitions and examples.<br>
        - <strong>Spacebar:</strong> Play the word or sentence audio (if audio is enabled).<br>
        - <strong>Enter:</strong> Flip between the front (word) and back (definition/example).<br>
        - <strong>Slider:</strong> Jump to a specific word rank.
    `;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadWords() {
    fetch('data/vocab3000_database.yaml')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!Array.isArray(words) || words.length === 0) {
                throw new Error('No valid words found in vocab3000_database.yaml');
            }
            words.forEach(word => {
                if (word.back_cards) word.back_cards = shuffleArray(word.back_cards);
            });
            originalWords = JSON.parse(JSON.stringify(words));
            words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
            totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);
            updateStats();
            isContentLoaded = true;
            hideLoadingOverlay();
            displayWord();
            preloadAudio();
            playCurrentAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            showError(`Failed to load vocabulary data: ${error.message}. Please check if 'data/vocab3000_database.yaml' exists and is valid.`);
        });
}

function updateStats() {
    const cardSlider = document.querySelector('#card-slider');
    const totalWords = document.querySelector('#total-words');
    const totalSentencesEl = document.querySelector('#total-sentences');
    const statsContainer = document.querySelector('.stats-container');
    if (cardSlider) cardSlider.max = words.length;
    if (totalWords) totalWords.textContent = words.length;
    if (totalSentencesEl) totalSentencesEl.textContent = totalSentences;
    if (statsContainer) {
        statsContainer.style.transition = 'opacity 1s ease-in';
        statsContainer.style.opacity = '1';
    }
}

function hideLoadingOverlay() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function showError(message) {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    document.querySelector('.flashcard-container').innerHTML = '<p>Error loading flashcards. Please try again later.</p>';
    hideLoadingOverlay();
}

function shuffleCards() {
    if (!isContentLoaded) return;
    words = shuffleArray([...words]);
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}

function resetCards() {
    if (!isContentLoaded) return;
    words = JSON.parse(JSON.stringify(originalWords)).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    playCurrentAudio();
}

function setupCardListeners() {
    const card = document.querySelector('.flashcard');
    if (!card) {
        console.error('Flashcard element not found');
        return;
    }
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    const tapHandler = (e) => {
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

    card.removeEventListener('click', tapHandler);
    card.removeEventListener('touchend', tapHandler);
    card.addEventListener('click', tapHandler);
    card.addEventListener('touchend', tapHandler);

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.off('swipeleft swiperight swipeup swipedown');
    hammer.on('swipeleft', debounce((e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        animateSwipe('left', isFlipped);
        currentWordIndex = (currentWordIndex + 1) % words.length;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }, SWIPE_DEBOUNCE_MS));
    hammer.on('swiperight', debounce((e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        animateSwipe('right', isFlipped);
        currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }, SWIPE_DEBOUNCE_MS));
    hammer.on('swipeup', debounce((e) => {
        if (!isContentLoaded || !isFlipped || !words[currentWordIndex]?.back_cards) return;
        e.preventDefault();
        animateSwipe('up', isFlipped);
        currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }, SWIPE_DEBOUNCE_MS));
    hammer.on('swipedown', debounce((e) => {
        if (!isContentLoaded || !isFlipped || !words[currentWordIndex]?.back_cards) return;
        e.preventDefault();
        animateSwipe('down', isFlipped);
        currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
        stopAudio();
        displayWord();
        preloadAudio();
        playCurrentAudio();
    }, SWIPE_DEBOUNCE_MS));
}

function setupKeyboardListeners() {
    document.removeEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
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
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
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
        ...(currentWord?.back_cards?.map(card => card.audio_file) || []),
        words[nextIndex]?.word_audio_file,
        ...(words[nextIndex]?.back_cards?.map(card => card.audio_file) || []),
        words[prevIndex]?.word_audio_file,
        ...(words[prevIndex]?.back_cards?.map(card => card.audio_file) || [])
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
        const isWordAudio = audioFile === currentWord.word_audio_file || 
                            audioFile === words[nextIndex]?.word_audio_file || 
                            audioFile === words[prevIndex]?.word_audio_file;
        const audioPath = isWordAudio 
            ? `${AUDIO_BASE_PATH}front/${audioFile}`
            : `${AUDIO_BASE_PATH}back/${currentWord.word.toLowerCase()}/${audioFile}`;
        const audio = new Audio(audioPath);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('canplaythrough', () => {
            console.log(`Preloaded: ${audioPath}`);
        }, { once: true });
        audio.addEventListener('error', () => {
            console.error(`Failed to preload audio: ${audioPath}`);
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

function playAudioWithRetry(audioFile, retries = 3, delay = 500) {
    if (!audioFile || !audioUnlocked || !audioEnabled) return;
    const now = Date.now();
    if (now - lastAudioPlayTime < AUDIO_DEBOUNCE_MS) return;
    lastAudioPlayTime = now;

    const isWordAudio = audioFile === words[currentWordIndex]?.word_audio_file;
    const audioPath = isWordAudio 
        ? `${AUDIO_BASE_PATH}front/${audioFile}`
        : `${AUDIO_BASE_PATH}back/${words[currentWordIndex]?.word.toLowerCase()}/${audioFile}`;

    stopAudio();
    let audio = audioCache.get(audioFile);
    if (!audio || audio.error) {
        audio = new Audio(audioPath);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
    }
    currentAudio = audio;

    function attemptPlay(attempt = 1) {
        if (!audioEnabled || !audioUnlocked) return;
        const playPromise = audio.play();
        if (playPromise) {
            playPromise
                .then(() => {
                    console.log(`Playing: ${audioPath} (Attempt ${attempt})`);
                })
                .catch(error => {
                    console.error(`Playback error for ${audioPath} (Attempt ${attempt}): ${error.message}`);
                    if (attempt < retries) {
                        setTimeout(() => attemptPlay(attempt + 1), delay);
                    } else {
                        showError(`Failed to play audio for ${audioFile}`);
                    }
                });
        }
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        attemptPlay();
    } else {
        audio.addEventListener('canplaythrough', () => attemptPlay(), { once: true });
        audio.addEventListener('error', () => {
            console.error(`Cannot load ${audioPath}`);
            audioCache.delete(audioFile);
        }, { once: true });
    }
}

function playCurrentAudio() {
    if (!audioUnlocked || !audioEnabled) return;
    const audioFile = isFlipped 
        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
        : words[currentWordIndex]?.word_audio_file;
    if (audioFile) playAudioWithRetry(audioFile, 3, 500);
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
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        showError('No word data available.');
        return;
    }
    const wordData = words[currentWordIndex];
    const backCard = wordData.back_cards?.[currentBackCardIndex] || { definition_en: '', example_en: '' };
    
    const logFreq = Math.log(wordData.freq || 1);
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const relativeFreq = 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0);
    const freqColor = getFrequencyColor(relativeFreq);

    const cardSlider = document.querySelector('#card-slider');
    if (cardSlider) cardSlider.value = currentWordIndex + 1;

    const frontWord = document.querySelector('.front .word-container h2');
    const frontRank = document.querySelector('.front .rank');
    const frontFreqFill = document.querySelector('.front .frequency-fill');
    const backWord = document.querySelector('.back .word-container h2');
    const backDefinition = document.querySelector('.back .definition');
    const backExample = document.querySelector('.back .example');
    const backRank = document.querySelector('.back .rank');
    const backFreqFill = document.querySelector('.back .frequency-fill');

    if (frontWord) frontWord.textContent = wordData.word || 'N/A';
    if (frontRank) frontRank.textContent = `Rank: ${wordData.rank || 'N/A'}`;
    if (frontFreqFill) {
        frontFreqFill.style.width = `${freqPercentage}%`;
        frontFreqFill.style.backgroundColor = freqColor;
    }
    if (backWord) backWord.textContent = wordData.word || 'N/A';
    if (backDefinition) backDefinition.textContent = backCard.definition_en || 'No definition available';
    if (backExample) backExample.textContent = `"${backCard.example_en || 'No example available'}"`;
    if (backRank) backRank.textContent = `Rank: ${wordData.rank || 'N/A'}`;
    if (backFreqFill) {
        backFreqFill.style.width = `${freqPercentage}%`;
        backFreqFill.style.backgroundColor = freqColor;
    }
}
