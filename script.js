let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 12;
let audioUnlocked = false;
let audioEnabled = true;
let maxFreq = 0;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;
let totalSentences = 0;
let isContentLoaded = false;
let lastAudioPlayTime = 0;
const AUDIO_DEBOUNCE_MS = 500;
let lastSwipeTime = 0;
const SWIPE_DEBOUNCE_MS = 300;
let swipeCount = 0;
let swipeWindowStart = 0;
const MAX_SWIPES_PER_WINDOW = 10;
const SWIPE_WINDOW_MS = 5000;

const fallbackWord = {
    word: "example",
    rank: 1,
    freq: 1000,
    word_audio_file: null,
    back_cards: [{ definition_en: "A representative form or pattern", example_en: "This is an example sentence.", audio_file: null }]
};

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

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
        tooltipOverlay: document.querySelector('.tooltip-overlay')
    };

    const toggleTheme = () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    };

    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.themeToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTheme();
    });

    elements.audioBtn.addEventListener('click', toggleAudio);
    elements.audioBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleAudio();
    });

    elements.infoBtn.addEventListener('click', () => toggleTooltip('info'));
    elements.infoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip('info');
    });

    elements.shuffleBtn.addEventListener('click', shuffleCards);
    elements.resetBtn.addEventListener('click', resetCards);

    elements.donateBtn.addEventListener('click', () => toggleTooltip('donate'));
    elements.donateBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip('donate');
    });

    elements.tooltipClose.addEventListener('click', () => toggleTooltip(null));
    elements.tooltipClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip(null);
    });

    elements.tooltipRetry.addEventListener('click', () => {
        toggleTooltip(null);
        loadWords();
    });
    elements.tooltipRetry.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip(null);
        loadWords();
    });

    elements.tooltipOverlay.addEventListener('click', (e) => {
        if (e.target === elements.tooltipOverlay) toggleTooltip(null);
    });
    elements.tooltipOverlay.addEventListener('touchend', (e) => {
        if (e.target === elements.tooltipOverlay) {
            e.preventDefault();
            toggleTooltip(null);
        }
    });

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
        if (audioUnlocked && audioEnabled) {
            const audioFile = isFlipped
                ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                : words[currentWordIndex]?.word_audio_file;
            if (audioFile) playAudioWithRetry(audioFile);
        }
    });

    loadWords();
    setupEventListeners();
    setupKeyboardListeners();
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

function toggleAudio() {
    audioEnabled = !audioEnabled;
    updateIcons(document.body.getAttribute('data-theme'));
    if (!audioEnabled) stopAudio();
}

function toggleTooltip(type, errorMessage = '') {
    const overlay = document.querySelector('.tooltip-overlay');
    const tooltipText = document.querySelector('#tooltip-text');
    const retryButton = document.querySelector('.tooltip-retry');
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const theme = document.body.getAttribute('data-theme');
    const iconStyle = theme === 'bright' ? 'style="filter: none; fill: #00008B;"' : 'style="filter: none; fill: #FFD700;"';

    if (!overlay || !tooltipText) return;

    if (isTooltipVisible && type === null) {
        isTooltipVisible = false;
        overlay.style.display = 'none';
        retryButton.style.display = 'none';
        return;
    }

    isTooltipVisible = true;
    overlay.style.display = 'flex';
    retryButton.style.display = type === 'error' ? 'block' : 'none';

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
                <img src="${qrCodeUrl}" class="donation-qr" alt="PromptPay QR Code" width="200" height="200"><br>
                <img src="${promptPayLogoUrl}" class="promptpay-logo" alt="PromptPay Logo" width="100" height="40">
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadWords(retries = 5, delay = 1000) {
    const loadingOverlay = document.querySelector('.loading-overlay');
    const cardSlider = document.querySelector('#card-slider');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    fetch('data/vocab3000_database.yaml')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.text();
        })
        .then(yamlText => {
            if (!yamlText) throw new Error('Empty YAML response');
            words = jsyaml.load(yamlText) || [];
            if (!Array.isArray(words) || words.length === 0) throw new Error('No valid words found');
            words.forEach(word => {
                if (word.back_cards) word.back_cards = shuffleArray(word.back_cards);
            });
            originalWords = JSON.parse(JSON.stringify(words));
            words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
            totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);
            if (cardSlider) {
                cardSlider.max = words.length;
                cardSlider.disabled = false;
            }
            document.querySelector('#total-words').textContent = words.length;
            document.querySelector('#total-sentences').textContent = totalSentences;
            isContentLoaded = true;
            displayWord();
            document.querySelector('.stats-container').style.opacity = '1';
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            preloadAudio();
            if (audioUnlocked && audioEnabled && words[currentWordIndex]?.word_audio_file) {
                playAudioWithRetry(words[currentWordIndex].word_audio_file);
            }
        })
        .catch(error => {
            if (retries > 1) {
                setTimeout(() => loadWords(retries - 1, delay), delay);
            } else {
                words = [fallbackWord];
                originalWords = [fallbackWord];
                maxFreq = 1000;
                minFreq = 1000;
                totalSentences = 1;
                if (cardSlider) {
                    cardSlider.max = 1;
                    cardSlider.disabled = false;
                }
                document.querySelector('#total-words').textContent = 1;
                document.querySelector('#total-sentences').textContent = 1;
                isContentLoaded = true;
                displayWord();
                document.querySelector('.stats-container').style.opacity = '1';
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                toggleTooltip('error', `Failed to load vocabulary data: ${error.message}. Using a sample word.`);
            }
        });
}

function shuffleCards() {
    if (!isContentLoaded) return;
    words = shuffleArray(words);
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile);
    }
}

function resetCards() {
    if (!isContentLoaded) return;
    words = JSON.parse(JSON.stringify(originalWords)).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile);
    }
}

function checkRateLimit() {
    const now = Date.now();
    if (now - swipeWindowStart > SWIPE_WINDOW_MS) {
        swipeCount = 0;
        swipeWindowStart = now;
        document.querySelector('.rate-limit-warning').style.display = 'none';
    }
    swipeCount++;
    if (swipeCount > MAX_SWIPES_PER_WINDOW) {
        document.querySelector('.rate-limit-warning').style.display = 'block';
        return false;
    }
    return true;
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    if (!card) return;
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    const handleTap = (e) => {
        e.preventDefault();
        if (!isContentLoaded) return;
        const currentTime = Date.now();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    glowCard(1);
                    if (audioEnabled && audioUnlocked) {
                        const audioFile = isFlipped
                            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                            : words[currentWordIndex]?.word_audio_file;
                        if (audioFile) playAudioWithRetry(audioFile);
                    }
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

    card.addEventListener('touchend', handleTap);
    card.addEventListener('click', (e) => {
        if ('ontouchstart' in window) return;
        handleTap(e);
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', (e) => handleSwipe(e, 'left', () => {
        currentWordIndex = (currentWordIndex + 1) % words.length;
        currentBackCardIndex = 0;
    }));
    hammer.on('swiperight', (e) => handleSwipe(e, 'right', () => {
        currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
        currentBackCardIndex = 0;
    }));
    hammer.on('swipeup', (e) => handleSwipe(e, 'up', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
        }
    }));
    hammer.on('swipedown', (e) => handleSwipe(e, 'down', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
        }
    }));
}

function handleSwipe(e, direction, updateIndices) {
    e.preventDefault();
    if (!isContentLoaded) return;
    const now = Date.now();
    if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) return;
    if (!checkRateLimit()) return;
    lastSwipeTime = now;
    if (words.length) {
        animateSwipe(direction, isFlipped);
        updateIndices();
        stopAudio();
        displayWord();
        preloadAudio();
        if (audioUnlocked && audioEnabled) {
            const audioFile = isFlipped
                ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                : words[currentWordIndex]?.word_audio_file;
            if (audioFile) playAudioWithRetry(audioFile);
        }
    }
}

function setupKeyboardListeners() {
    let lastKeyPressTime = 0;
    const KEY_DEBOUNCE_MS = 300;
    document.addEventListener('keydown', (e) => {
        if (!words.length || !isContentLoaded) return;
        const now = Date.now();
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && now - lastKeyPressTime < KEY_DEBOUNCE_MS) {
            return;
        }
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
                if (audioUnlocked && audioEnabled) {
                    const audioFile = isFlipped
                        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                        : words[currentWordIndex]?.word_audio_file;
                    if (audioFile) playAudioWithRetry(audioFile);
                }
                break;
            case 'ArrowRight':
                animateSwipe('left', isFlipped);
                currentWordIndex = (currentWordIndex + 1) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                preloadAudio();
                if (audioUnlocked && audioEnabled) {
                    const audioFile = isFlipped
                        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                        : words[currentWordIndex]?.word_audio_file;
                    if (audioFile) playAudioWithRetry(audioFile);
                }
                break;
            case 'ArrowUp':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('up', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    preloadAudio();
                    if (audioUnlocked && audioEnabled) {
                        const audioFile = words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file ||
                                         words[currentWordIndex]?.word_audio_file;
                        if (audioFile) playAudioWithRetry(audioFile);
                    }
                }
                break;
            case 'ArrowDown':
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('down', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    preloadAudio();
                    if (audioUnlocked && audioEnabled) {
                        const audioFile = words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file ||
                                         words[currentWordIndex]?.word_audio_file;
                        if (audioFile) playAudioWithRetry(audioFile);
                    }
                }
                break;
            case ' ':
                glowCard(1);
                if (audioEnabled && audioUnlocked) {
                    const audioFile = isFlipped
                        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                        : words[currentWordIndex]?.word_audio_file;
                    if (audioFile) playAudioWithRetry(audioFile);
                }
                break;
            case 'Enter':
                glowCard(2);
                flipCard();
                break;
        }
    });
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
        ? `data/audio/front/${audioFile}`
        : `data/audio/back/${words[currentWordIndex]?.word.toLowerCase()}/${audioFile}`;

    stopAudio();
    let audio = audioCache.get(audioFile) || new Audio(audioPath);
    audio.preload = 'auto';
    audio.load();
    audioCache.set(audioFile, audio);
    currentAudio = audio;

    function attemptPlay(attempt = 1) {
        if (!audioEnabled || !audioUnlocked) return;
        const playPromise = audio.play();
        if (playPromise) {
            playPromise.catch(error => {
                if (attempt < retries) {
                    setTimeout(() => attemptPlay(attempt + 1), delay);
                }
            });
        }
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        attemptPlay();
    } else {
        audio.addEventListener('canplaythrough', () => attemptPlay(), { once: true });
        audio.addEventListener('error', () => audioCache.delete(audioFile), { once: true });
    }
}

function flipCard() {
    if (!isContentLoaded) return;
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    if (!card) return;
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile);
    }
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        document.querySelector('.flashcard-container').innerHTML = `
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

    const slider = document.querySelector('#card-slider');
    if (slider) slider.value = currentWordIndex + 1;

    const front = document.querySelector('.front');
    const back = document.querySelector('.back');
    if (!front || !back) {
        document.querySelector('.flashcard-container').innerHTML = `
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
