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

// Fallback word if YAML loading fails
const fallbackWord = {
    word: "example",
    rank: 1,
    freq: 1000,
    word_audio_file: null,
    back_cards: [{ definition_en: "A representative form or pattern", example_en: "This is an example sentence.", audio_file: null }]
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing VocabSwipe');
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });
    themeToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });

    const audioBtn = document.querySelector('.audio-btn');
    audioBtn.addEventListener('click', toggleAudio);
    audioBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleAudio();
    });

    const infoBtn = document.querySelector('.info-btn');
    infoBtn.addEventListener('click', () => {
        console.log('Info button clicked');
        toggleTooltip('info');
    });
    infoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Info button tapped');
        toggleTooltip('info');
    });

    const shuffleBtn = document.querySelector('.shuffle-btn');
    shuffleBtn.addEventListener('click', shuffleCards);

    const resetBtn = document.querySelector('.reset-btn');
    resetBtn.addEventListener('click', resetCards);

    const donateBtn = document.querySelector('.donate-btn');
    donateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Donation button clicked');
        toggleTooltip('donate');
    });
    donateBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Donation button tapped');
        toggleTooltip('donate');
    });

    const tooltipClose = document.querySelector('.tooltip-close');
    tooltipClose.addEventListener('click', () => toggleTooltip(null));
    tooltipClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip(null);
    });

    const tooltipRetry = document.querySelector('.tooltip-retry');
    tooltipRetry.addEventListener('click', () => {
        console.log('Retry button clicked');
        toggleTooltip(null);
        loadWords();
    });
    tooltipRetry.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Retry button tapped');
        toggleTooltip(null);
        loadWords();
    });

    const cardSlider = document.querySelector('#card-slider');
    cardSlider.addEventListener('input', () => {
        if (!isContentLoaded) return;
        isSliding = true;
        currentWordIndex = parseInt(cardSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
    });
    cardSlider.addEventListener('change', () => {
        if (!isContentLoaded) return;
        isSliding = false;
        preloadAudio();
        if (audioUnlocked && audioEnabled) {
            const audioFile = isFlipped 
                ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                : words[currentWordIndex]?.word_audio_file;
            if (audioFile) playAudioWithRetry(audioFile, 3, 500);
        }
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

function updateIcons(theme) {
    console.log(`Updating icons for theme: ${theme}`);
    const themeIcon = document.querySelector('.theme-icon');
    const audioIcon = document.querySelector('.audio-icon');
    const infoIcon = document.querySelector('.info-icon');
    const shuffleIcon = document.querySelector('.shuffle-icon');
    const resetIcon = document.querySelector('.reset-icon');
    const donateIcon = document.querySelector('.donate-icon');
    const loadingIcon = document.querySelector('.loading-icon');

    if (themeIcon) themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    if (audioIcon) audioIcon.src = theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg');
    if (infoIcon) infoIcon.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    if (shuffleIcon) shuffleIcon.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    if (resetIcon) resetIcon.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    if (donateIcon) donateIcon.src = theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg';
    if (loadingIcon) loadingIcon.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    console.log(`Audio ${audioEnabled ? 'enabled' : 'disabled'}`);
    const audioIcon = document.querySelector('.audio-icon');
    const theme = document.body.getAttribute('data-theme');
    if (audioIcon) {
        audioIcon.src = audioEnabled 
            ? (theme === 'bright' ? 'unmute-bright.svg' : 'unmute-night.svg')
            : (theme === 'bright' ? 'mute-bright.svg' : 'mute-night.svg');
    }
    if (!audioEnabled) stopAudio();
}

function toggleTooltip(type, errorMessage = '') {
    console.log(`toggleTooltip called with type: ${type}, errorMessage: ${errorMessage}`);
    const overlay = document.querySelector('.tooltip-overlay');
    const tooltipText = document.querySelector('#tooltip-text');
    const retryButton = document.querySelector('.tooltip-retry');
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const theme = document.body.getAttribute('data-theme');
    const iconStyle = theme === 'bright' ? 
        'style="filter: none; fill: #00008B;"' : 'style="filter: none; fill: #FFD700;"';

    if (!overlay || !tooltipText) {
        console.error('Tooltip elements not found');
        return;
    }

    if (isTooltipVisible && type === null) {
        isTooltipVisible = false;
        overlay.style.display = 'none';
        retryButton.style.display = 'none';
        console.log('Tooltip hidden');
        return;
    }

    isTooltipVisible = true;
    overlay.style.display = 'flex';
    retryButton.style.display = type === 'error' ? 'block' : 'none';

    if (type === 'info') {
        console.log('Displaying info tooltip');
        tooltipText.innerHTML = isMobile 
            ? `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Theme Toggle (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Tap to switch between bright and dark themes.<br>
                - <strong>Audio Toggle (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Tap to enable or disable audio.<br>
                - <strong>Info (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">):</strong> Tap to show or hide this help message.<br>
                - <strong>Shuffle (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Tap to randomize the word order.<br>
                - <strong>Reset (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Tap to restore the original word order.<br>
                - <strong>Donate (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">):</strong> Tap to support VocabSwipe with a donation.<br>
                - <strong>Swipe Left/Right:</strong> Navigate to the next or previous word card.<br>
                - <strong>Swipe Up/Down:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Tap Once:</strong> Hear the word or sentence audio (if audio is enabled).<br>
                - <strong>Double-Tap:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Jump to a specific word rank.<br>
                - <strong>Note:</strong> Swipe slowly to avoid rate limits.
            `
            : `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Theme Toggle (<img src="${theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg'}" width="24" height="24" ${iconStyle} alt="Theme Toggle">):</strong> Click to switch between bright and dark themes.<br>
                - <strong>Audio Toggle (<img src="${theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg')}" width="24" height="24" ${iconStyle} alt="Audio Toggle">):</strong> Click to enable or disable audio.<br>
                - <strong>Info (<img src="${theme === 'bright' ? 'information-bright.svg' : 'information-night.svg'}" width="19.2" height="19.2" ${iconStyle} alt="Info">):</strong> Click to show or hide this help message.<br>
                - <strong>Shuffle (<img src="${theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg'}" width="24" height="24" ${iconStyle} alt="Shuffle">):</strong> Click to randomize the word order.<br>
                - <strong>Reset (<img src="${theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg'}" width="24" height="24" ${iconStyle} alt="Reset">):</strong> Click to restore the original word order.<br>
                - <strong>Donate (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">):</strong> Click to support VocabSwipe with a donation.<br>
                - <strong>Left/Right Arrow Keys:</strong> Navigate to the previous or next word card.<br>
                - <strong>Up/Down Arrow Keys:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Spacebar:</strong> Play the word or sentence audio (if audio is enabled).<br>
                - <strong>Enter:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Jump to a specific word rank.<br>
                - <strong>Note:</strong> Press arrow keys slowly to avoid rate limits.
            `;
    } else if (type === 'donate') {
        console.log('Displaying donation tooltip');
        const qrCodeUrl = 'qr_code/VocabSwipe_qr_code.png';
        const img = new Image();
        img.src = qrCodeUrl;
        img.onload = () => {
            tooltipText.innerHTML = `
                <strong>Donate to Supanut Suntikoon, VocabSwipe Developer</strong><br><br>
                Your support helps maintain and improve this free vocabulary learning tool for everyone.<br><br>
                <img src="${qrCodeUrl}" class="donation-qr" alt="PromptPay QR Code" width="200" height="200">
            `;
            console.log(`QR code loaded successfully: ${qrCodeUrl}`);
        };
        img.onerror = () => {
            console.error(`Failed to load QR code: ${qrCodeUrl}`);
            tooltipText.innerHTML = `
                <strong>Donate to Supanut Suntikoon, VocabSwipe Developer</strong><br><br>
                Your support helps maintain and improve this free vocabulary learning tool for everyone.<br><br>
                <p style="color: #ff0000;">Error: Unable to load PromptPay QR code. Please try again later or contact support.</p>
            `;
        };
    } else if (type === 'error') {
        console.log('Displaying error tooltip');
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
    console.log(`Attempting to fetch vocab3000_database.yaml (Attempt ${6 - retries})`);
    const loadingOverlay = document.querySelector('.loading-overlay');
    const cardSlider = document.querySelector('#card-slider');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    fetch('data/vocab3000_database.yaml')
        .then(response => {
            console.log(`Fetch response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
            }
            return response.text();
        })
        .then(yamlText => {
            console.log('Parsing YAML data');
            if (!yamlText) throw new Error('Empty YAML response');
            try {
                words = jsyaml.load(yamlText) || [];
                if (!Array.isArray(words) || words.length === 0) {
                    throw new Error('No valid words found in vocab3000_database.yaml');
                }
                console.log(`Loaded ${words.length} words from YAML`);
                words.forEach(word => {
                    if (word.back_cards) {
                        word.back_cards = shuffleArray(word.back_cards);
                        console.log(`Shuffled back cards for word: ${word.word}`);
                    }
                });
                originalWords = JSON.parse(JSON.stringify(words));
                words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
                maxFreq = words.find(word => word.rank === 1)?.freq || 1;
                minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
                totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);
                console.log(`Max frequency: ${maxFreq}, Min frequency: ${minFreq}, Total sentences: ${totalSentences}`);
                if (cardSlider) {
                    cardSlider.max = words.length;
                    cardSlider.disabled = false;
                }
                document.querySelector('#total-words').textContent = words.length;
                document.querySelector('#total-sentences').textContent = totalSentences;
                isContentLoaded = true;
                console.log('Calling displayWord to render first card');
                displayWord();
                const statsContainer = document.querySelector('.stats-container');
                statsContainer.style.transition = 'opacity 1s ease-in';
                statsContainer.style.opacity = '1';
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                preloadAudio();
                if (audioUnlocked && audioEnabled && words[currentWordIndex]?.word_audio_file) {
                    console.log(`Playing initial audio: ${words[currentWordIndex].word_audio_file}`);
                    playAudioWithRetry(words[currentWordIndex].word_audio_file, 3, 500);
                }
            } catch (e) {
                throw new Error(`Failed to parse YAML: ${e.message}`);
            }
        })
        .catch(error => {
            console.error(`Error loading words: ${error.message}`);
            if (retries > 1) {
                console.log(`Retrying fetch in ${delay}ms... (${retries - 1} retries left)`);
                setTimeout(() => loadWords(retries - 1, delay), delay);
            } else {
                console.error('All retries failed. Using fallback word.');
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
                const statsContainer = document.querySelector('.stats-container');
                statsContainer.style.opacity = '1';
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                toggleTooltip('error', `Failed to load vocabulary data: ${error.message}. Using a sample word.`);
            }
        });
}

function shuffleCards() {
    if (!isContentLoaded) return;
    console.log('Shuffling cards');
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    preloadAudio();
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped 
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
    }
}

function resetCards() {
    if (!isContentLoaded) return;
    console.log('Resetting cards to original order');
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
        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
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
        console.warn('Rate limit warning: too many swipes');
        document.querySelector('.rate-limit-warning').style.display = 'block';
        return false;
    }
    return true;
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    if (!card) {
        console.error('Flashcard element not found');
        return;
    }
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    card.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!isContentLoaded) return;
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    glowCard(1);
                    if (audioEnabled) {
                        const audioFile = isFlipped 
                            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                            : words[currentWordIndex]?.word_audio_file;
                        if (audioFile && audioUnlocked) {
                            playAudioWithRetry(audioFile, 3, 500);
                        }
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
    });

    card.addEventListener('click', (e) => {
        if (!isContentLoaded || 'ontouchstart' in window) return;
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    glowCard(1);
                    if (audioEnabled) {
                        const audioFile = isFlipped 
                            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                            : words[currentWordIndex]?.word_audio_file;
                        if (audioFile && audioUnlocked) {
                            playAudioWithRetry(audioFile, 3, 500);
                        }
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
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', (e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) {
            console.log('Debouncing swipe left');
            return;
        }
        if (!checkRateLimit()) return;
        lastSwipeTime = now;
        if (words.length) {
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
                if (audioFile) playAudioWithRetry(audioFile, 3, 500);
            }
        }
    });
    hammer.on('swiperight', (e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) {
            console.log('Debouncing swipe right');
            return;
        }
        if (!checkRateLimit()) return;
        lastSwipeTime = now;
        if (words.length) {
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
                if (audioFile) playAudioWithRetry(audioFile, 3, 500);
            }
        }
    });
    hammer.on('swipeup', (e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) {
            console.log('Debouncing swipe up');
            return;
        }
        if (!checkRateLimit()) return;
        lastSwipeTime = now;
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('up', isFlipped);
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            preloadAudio();
            if (audioUnlocked && audioEnabled) {
                const audioFile = words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || 
                                 words[currentWordIndex]?.word_audio_file;
                if (audioFile) playAudioWithRetry(audioFile, 3, 500);
            }
        } else {
            console.log('Swipe up ignored: not flipped or no back cards');
        }
    });
    hammer.on('swipedown', (e) => {
        if (!isContentLoaded) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastSwipeTime < SWIPE_DEBOUNCE_MS) {
            console.log('Debouncing swipe down');
            return;
        }
        if (!checkRateLimit()) return;
        lastSwipeTime = now;
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('down', isFlipped);
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            preloadAudio();
            if (audioUnlocked && audioEnabled) {
                const audioFile = words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || 
                                 words[currentWordIndex]?.word_audio_file;
                if (audioFile) playAudioWithRetry(audioFile, 3, 500);
            }
        } else {
            console.log('Swipe down ignored: not flipped or no back cards');
        }
    });
}

function setupKeyboardListeners() {
    let lastKeyPressTime = 0;
    const KEY_DEBOUNCE_MS = 300;
    document.addEventListener('keydown', (e) => {
        if (!words.length || !isContentLoaded) return;
        const now = Date.now();
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && now - lastKeyPressTime < KEY_DEBOUNCE_MS) {
            console.log(`Debouncing keypress: ${e.key}`);
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
                    if (audioFile) playAudioWithRetry(audioFile, 3, 500);
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
                    if (audioFile) playAudioWithRetry(audioFile, 3, 500);
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
                        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
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
                        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
                    }
                }
                break;
            case ' ':
                glowCard(1);
                if (audioEnabled) {
                    const audioFile = isFlipped 
                        ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
                        : words[currentWordIndex]?.word_audio_file;
                    if (audioFile && audioUnlocked) playAudioWithRetry(audioFile, 3, 500);
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
    if (!card) {
        console.error('Flashcard element not found in glowCard');
        return;
    }
    card.classList.remove('glow-once', 'glow-twice');
    void card.offsetWidth;
    card.classList.add(times === 1 ? 'glow-once' : 'glow-twice');
}

function animateSwipe(direction, isBackCard) {
    const card = document.querySelector('.flashcard');
    if (!card) {
        console.error('Flashcard element not found in animateSwipe');
        return;
    }
    const sideToClone = isBackCard ? '.back' : '.front';
    const clone = card.querySelector(sideToClone).cloneNode(true);
    clone.classList.add('swipe-clone', `swipe-${direction}`);
    card.parentElement.appendChild(clone);
    setTimeout(() => clone.remove(), 300);
}

function preloadAudio() {
    if (!words[currentWordIndex] || isSliding || !audioEnabled) {
        console.log('Skipping preloadAudio: no word data, sliding, or audio disabled');
        return;
    }
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
        console.log(`Cleared audio cache for: ${oldestKey}`);
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
        console.log('Audio stopped');
    }
}

function playAudioWithRetry(audioFile, retries = 3, delay = 500) {
    if (!audioFile || !audioUnlocked || !audioEnabled) {
        console.warn(`Cannot play audio: ${audioFile}. AudioUnlocked: ${audioUnlocked}, AudioEnabled: ${audioEnabled}`);
        return;
    }

    const now = Date.now();
    if (now - lastAudioPlayTime < AUDIO_DEBOUNCE_MS) {
        console.log(`Debouncing audio playback for ${audioFile}`);
        return;
    }
    lastAudioPlayTime = now;

    const isWordAudio = audioFile === words[currentWordIndex]?.word_audio_file;
    const audioPath = isWordAudio 
        ? `data/audio/front/${audioFile}`
        : `data/audio/back/${words[currentWordIndex]?.word.toLowerCase()}/${audioFile}`;

    stopAudio();
    let audio = audioCache.get(audioFile);

    if (!audio || audio.error) {
        audio = new Audio(audioPath);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('canplaythrough', () => {
            console.log(`Loaded and ready: ${audioPath}`);
        }, { once: true });
        audio.addEventListener('error', () => {
            console.error(`Failed to load audio: ${audioPath}`);
            audioCache.delete(audioFile);
        }, { once: true });
    }

    currentAudio = audio;

    function attemptPlay(attempt = 1) {
        if (!audioEnabled || !audioUnlocked) {
            console.warn(`Playback aborted for ${audioPath}: audio disabled or not unlocked`);
            return;
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`Successfully playing: ${audioPath} (Attempt ${attempt})`);
                })
                .catch(error => {
                    console.error(`Playback error for ${audioPath} (Attempt ${attempt}): ${error.message}`);
                    if (attempt < retries) {
                        console.log(`Retrying playback for ${audioPath} in ${delay}ms...`);
                        setTimeout(() => attemptPlay(attempt + 1), delay);
                    } else {
                        console.error(`Failed to play ${audioPath} after ${retries} attempts`);
                    }
                });
        }
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        attemptPlay();
    } else {
        audio.addEventListener('canplaythrough', () => attemptPlay(), { once: true });
        audio.addEventListener('error', () => {
            console.error(`Cannot play ${audioPath}: audio failed to load`);
            audioCache.delete(audioFile);
        }, { once: true });
    }
}

function flipCard() {
    if (!isContentLoaded) return;
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    if (!card) {
        console.error('Flashcard element not found in flipCard');
        return;
    }
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped 
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
    }
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    console.log(`Displaying word at index ${currentWordIndex}, back card index ${currentBackCardIndex}`);
    if (!words[currentWordIndex]) {
        console.warn('No word available to display at index:', currentWordIndex);
        document.querySelector('.flashcard-container').innerHTML = `
            <p class="error-message">No word data available. Please try again.</p>
            <button class="retry-button" aria-label="Retry loading">Retry</button>
        `;
        const retryButton = document.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                console.log('Flashcard retry button clicked');
                loadWords();
            });
        }
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
    if (slider) {
        slider.value = currentWordIndex + 1;
    } else {
        console.error('Card slider not found');
    }

    const front = document.querySelector('.front');
    const back = document.querySelector('.back');
    if (!front || !back) {
        console.error('Front or back element not found');
        document.querySelector('.flashcard-container').innerHTML = `
            <p class="error-message">Error rendering card. Please try again.</p>
            <button class="retry-button" aria-label="Retry loading">Retry</button>
        `;
        const retryButton = document.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                console.log('Flashcard retry button clicked');
                loadWords();
            });
        }
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
    console.log(`Rendered card: word=${wordData.word}, rank=${wordData.rank}, freqPercentage=${freqPercentage}%`);
}
