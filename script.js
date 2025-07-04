let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 12; // Increased slightly to handle more back cards
let audioUnlocked = false;
let audioEnabled = true;
let maxFreq = 0;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;
let totalSentences = 0;
let isContentLoaded = false;
let lastAudioPlayTime = 0;
const AUDIO_DEBOUNCE_MS = 300; // Debounce audio playback to prevent rapid calls

document.addEventListener('DOMContentLoaded', () => {
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

    const audioBtn = document.querySelector('.audio-btn');
    audioBtn.addEventListener('click', toggleAudio);
    audioBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleAudio();
    });

    const infoBtn = document.querySelector('.info-btn');
    infoBtn.addEventListener('click', toggleTooltip);
    infoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip();
    });

    const shuffleBtn = document.querySelector('.shuffle-btn');
    shuffleBtn.addEventListener('click', shuffleCards);

    const resetBtn = document.querySelector('.reset-btn');
    resetBtn.addEventListener('click', resetCards);

    const donateBtn = document.querySelector('.donate-btn');
    donateBtn.addEventListener('click', () => {
        window.location.href = '/donate';
    });
    donateBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        window.location.href = '/donate';
    });

    const storeBtn = document.querySelector('.store-btn');
    storeBtn.addEventListener('click', () => {
        window.location.href = '/store';
    });
    storeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        window.location.href = '/store';
    });

    const tooltipClose = document.querySelector('.tooltip-close');
    tooltipClose.addEventListener('click', toggleTooltip);
    tooltipClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip();
    });

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
    const themeIcon = document.querySelector('.theme-icon');
    const audioIcon = document.querySelector('.audio-icon');
    const infoIcon = document.querySelector('.info-icon');
    const shuffleIcon = document.querySelector('.shuffle-icon');
    const resetIcon = document.querySelector('.reset-icon');
    const donateIcon = document.querySelector('.donate-icon');
    const storeIcon = document.querySelector('.store-icon');
    const loadingIcon = document.querySelector('.loading-icon');

    themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    audioIcon.src = theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg');
    infoIcon.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    shuffleIcon.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    resetIcon.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    donateIcon.src = theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg';
    storeIcon.src = theme === 'bright' ? 'bag-bright.svg' : 'bag-night.svg';
    if (loadingIcon) {
        loadingIcon.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
    }
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    const audioIcon = document.querySelector('.audio-icon');
    const theme = document.body.getAttribute('data-theme');
    audioIcon.src = audioEnabled 
        ? (theme === 'bright' ? 'unmute-bright.svg' : 'unmute-night.svg')
        : (theme === 'bright' ? 'mute-bright.svg' : 'mute-night.svg');
    if (!audioEnabled) stopAudio();
}

function toggleTooltip() {
    const overlay = document.querySelector('.tooltip-overlay');
    const tooltipText = document.querySelector('#tooltip-text');
    isTooltipVisible = !isTooltipVisible;
    const theme = document.body.getAttribute('data-theme');
    if (isTooltipVisible) {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const iconStyle = theme === 'bright' ? 
            'style="filter: none; fill: #00008B;"' : 'style="filter: none; fill: #FFD700;"';
        tooltipText.innerHTML = isMobile 
            ? `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Donate (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">):</strong> Tap to support VocabSwipe and keep it free.<br>
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
            `
            : `
                <strong>How to Use VocabSwipe:</strong><br><br>
                - <strong>Donate (<img src="${theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg'}" width="24" height="24" ${iconStyle} alt="Donate">):</strong> Click to support VocabSwipe and keep it free.<br>
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
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(yamlText => {
            try {
                words = jsyaml.load(yamlText) || [];
                if (!Array.isArray(words) || words.length === 0) {
                    throw new Error('No valid words found in vocab3000_database.yaml');
                }
                // Shuffle back_cards for each word
                words.forEach(word => {
                    if (word.back_cards) {
                        word.back_cards = shuffleArray(word.back_cards);
                    }
                });
                originalWords = JSON.parse(JSON.stringify(words)); // Deep copy
                words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
                maxFreq = words.find(word => word.rank === 1)?.freq || 1;
                minFreq = Math.min(...words.map(word => word.freq || 1).filter(freq => freq > 0)) || 1;
                totalSentences = words.reduce((sum, word) => sum + (word.back_cards?.length || 0), 0);
                document.querySelector('#card-slider').max = words.length;
                document.querySelector('#total-words').textContent = words.length;
                document.querySelector('#total-sentences').textContent = totalSentences;
                isContentLoaded = true;
                displayWord();
                // Animate stats container
                const statsContainer = document.querySelector('.stats-container');
                statsContainer.style.transition = 'opacity 1s ease-in';
                statsContainer.style.opacity = '1';
                // Hide loading overlay
                const loadingOverlay = document.querySelector('.loading-overlay');
                loadingOverlay.style.display = 'none';
                preloadAudio();
                // Trigger initial audio playback
                if (audioUnlocked && audioEnabled && words[currentWordIndex]?.word_audio_file) {
                    playAudioWithRetry(words[currentWordIndex].word_audio_file, 3, 500);
                }
            } catch (e) {
                throw new Error(`Failed to parse YAML: ${e.message}`);
            }
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert(`Failed to load vocabulary data: ${error.message}. Please check if 'data/vocab3000_database.yaml' exists and is valid.`);
            document.querySelector('.flashcard-container').innerHTML = '<p>Error loading flashcards. Please try again later.</p>';
            document.querySelector('.loading-overlay').style.display = 'none';
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
    if (audioUnlocked && audioEnabled) {
        const audioFile = isFlipped 
            ? (words[currentWordIndex]?.back_cards?.[currentBackCardIndex]?.audio_file || words[currentWordIndex]?.word_audio_file)
            : words[currentWordIndex]?.word_audio_file;
        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
    }
}

function resetCards() {
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
        if (!isContentLoaded) return;
        if ('ontouchstart' in window) return;
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
    document.addEventListener('keydown', (e) => {
        if (!words.length || !isContentLoaded) return;
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
    const nextWord = words[nextIndex];
    const prevWord = words[prevIndex];

    // Collect audio files to preload (current, next, previous cards)
    const audioFiles = [
        currentWord?.word_audio_file,
        ...(currentWord?.back_cards?.map(card => card.audio_file) || []),
        nextWord?.word_audio_file,
        ...(nextWord?.back_cards?.map(card => card.audio_file) || []),
        prevWord?.word_audio_file,
        ...(prevWord?.back_cards?.map(card => card.audio_file) || [])
    ].filter(file => file && !audioCache.has(file));

    // Clear cache if it exceeds MAX_CACHE_SIZE
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
        const isWordAudio = audioFile === currentWord.word_audio_file || 
                            audioFile === nextWord?.word_audio_file || 
                            audioFile === prevWord?.word_audio_file;
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

    // Debounce to prevent rapid calls
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

    // Wait for canplaythrough before attempting playback
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
        if (audioFile) playAudioWithRetry(audioFile, 3, 500);
    }
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        console.warn('No word available to display');
        document.querySelector('.flashcard-container').innerHTML = '<p>No word data available.</p>';
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

    document.querySelector('#card-slider').value = currentWordIndex + 1;

    document.querySelector('.front').innerHTML = `
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

    document.querySelector('.back').innerHTML = `
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
