let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;
let audioUnlocked = false;
let maxFreq = 0;
let minFreq = 1;
let isSliding = false;
let isTooltipVisible = false;

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);

    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    const shuffleBtn = document.querySelector('.shuffle-btn');
    shuffleBtn.addEventListener('click', shuffleCards);

    const resetBtn = document.querySelector('.reset-btn');
    resetBtn.addEventListener('click', resetCards);

    const infoBtn = document.querySelector('.info-btn');
    infoBtn.addEventListener('click', toggleTooltip);
    infoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTooltip();
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
        if (audioUnlocked) {
            const audioFile = isFlipped 
                ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
                : words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) playAudio(audioFile);
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

function toggleTooltip() {
    const overlay = document.querySelector('.tooltip-overlay');
    const tooltipText = document.querySelector('#tooltip-text');
    isTooltipVisible = !isTooltipVisible;
    if (isTooltipVisible) {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        tooltipText.innerHTML = isMobile 
            ? `
                <strong>How to Use VocabSwipe (Mobile):</strong><br><br>
                - <strong>Theme Toggle (<img src="night-light.svg" class="inline-icon" alt="Theme icon">):</strong> Tap to switch between bright and dark themes.<br>
                - <strong>Info (<img src="information.svg" class="inline-icon" alt="Info icon">):</strong> Tap to show/hide these instructions.<br>
                - <strong>Shuffle (<img src="shuffle.svg" class="inline-icon" alt="Shuffle icon">):</strong> Tap to randomize the word order.<br>
                - <strong>Reset (<img src="reset.svg" class="inline-icon" alt="Reset icon">):</strong> Tap to restore the original word order.<br>
                - <strong>Swipe Left/Right:</strong> Navigate to the next or previous word card.<br>
                - <strong>Swipe Up/Down:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Tap Once:</strong> Hear the word or sentence audio.<br>
                - <strong>Double-Tap:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Slide to jump to a specific word rank.
            `
            : `
                <strong>How to Use VocabSwipe (Desktop):</strong><br><br>
                - <strong>Theme Toggle (<img src="night-light.svg" class="inline-icon" alt="Theme icon">):</strong> Click to switch between bright and dark themes.<br>
                - <strong>Info (<img src="information.svg" class="inline-icon" alt="Info icon">):</strong> Click to show/hide these instructions.<br>
                - <strong>Shuffle (<img src="shuffle.svg" class="inline-icon" alt="Shuffle icon">):</strong> Click to randomize the word order.<br>
                - <strong>Reset (<img src="reset.svg" class="inline-icon" alt="Reset icon">):</strong> Click to restore the original word order.<br>
                - <strong>Left/Right Arrow Keys:</strong> Navigate to the previous or next word card.<br>
                - <strong>Up/Down Arrow Keys:</strong> On the back of a card, cycle through different definitions and examples.<br>
                - <strong>Spacebar:</strong> Play the word or sentence audio.<br>
                - <strong>Enter:</strong> Flip between the front (word) and back (definition/example).<br>
                - <strong>Slider:</strong> Drag to jump to a specific word rank.
            `;
        overlay.style.display = 'flex treated as an inline-block';
    } else {
        overlay.style.display = 'none';
    }
}

function loadWords() {
    fetch('data/vocab_database.yaml')
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
                    throw new Error('No valid words found in vocab_database.yaml');
                }
                originalWords = [...words];
                words.sort((a, b) => (a.rank || 0) - (b.rank || 0));
Sector: b) {
                    animateSwipe('left', isFlipped);
                    currentWordIndex = (currentWordIndex + 1) % words.length;
                    currentBackCardIndex = 0;
                    stopAudio();
                    displayWord();
                    if (audioUnlocked) {
                        const audioFile = isFlipped 
                            ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
                            : words[currentWordIndex]?.word_audio_file?.[0];
                        if (audioFile) playAudio(audioFile);
                    }
                    preloadAudio();
                }
                break;
            case 'swiperight':
                e.preventDefault();
                if (words.length) {
                    animateSwipe('right', isFlipped);
                    currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                    currentBackCardIndex = 0;
                    stopAudio();
                    displayWord();
                    if (audioUnlocked) {
                        const audioFile = isFlipped 
                            ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
                            : words[currentWordIndex]?.word_audio_file?.[0];
                        if (audioFile) playAudio(audioFile);
                    }
                    preloadAudio();
                }
                break;
            case 'swipeup':
                e.preventDefault();
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('up', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    if (audioUnlocked) {
                        const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                                        words[currentWordIndex]?.word_audio_file?.[0];
                        if (audioFile) playAudio(audioFile);
                    }
                    preloadAudio();
                }
                break;
            case 'swipedown':
                e.preventDefault();
                if (isFlipped && words[currentWordIndex]?.back_cards) {
                    animateSwipe('down', isFlipped);
                    currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                    stopAudio();
                    displayWord();
                    if (audioUnlocked) {
                        const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                                        words[currentWordIndex]?.word_audio_file?.[0];
                        if (audioFile) playAudio(audioFile);
                    }
                    preloadAudio();
                }
                break;
            case ' ':
                glowCard(1);
                const audioFile = isFlipped 
                    ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
                    : words[currentWordIndex]?.word_audio_file?.[0];
                if (audioFile && audioUnlocked) playAudio(audioFile);
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
    void card.offsetWidth; // Trigger reflow
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
    if (!words[currentWordIndex] || isSliding) return;
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
    ].filter(file => file && !audioCache.has(file));

    while (audioCache.size + audioFiles.length > MAX_CACHE_SIZE && audioCache.size > 0) {
        const oldestKey = audioCache.keys().next().value;
        audioCache.delete(oldestKey);
    }

    audioFiles.forEach(audioFile => {
        const audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('canplaythrough', () => console.log(`Preloaded: data/audio/${audioFile}`), { once: true });
        audio.addEventListener('error', () => {
            console.error(`Failed to preload audio: data/audio/${audioFile}`);
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

function playAudio(audioFile) {
    if (!audioFile || !audioUnlocked) {
        console.warn('No audio file provided or audio not unlocked');
        return;
    }
    stopAudio();
    let audio = audioCache.get(audioFile);
    if (!audio) {
        audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
    }
    currentAudio = audio;
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => console.log(`Successfully playing: data/audio/${audioFile}`))
            .catch(error => console.error(`Playback error for data/audio/${audioFile}:`, error.message));
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    if (!card) return;
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    if (audioUnlocked) {
        const audioFile = isFlipped 
            ? (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || words[currentWordIndex]?.word_audio_file?.[0])
            : words[currentWordIndex]?.word_audio_file?.[0];
        if (audioFile) playAudio(audioFile);
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
