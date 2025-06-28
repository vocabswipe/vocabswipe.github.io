let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;
let audioUnlocked = false;
let maxFreq = 0;
let minFreq = 1;
let isShuffled = false;
let originalOrder = [];

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
    shuffleBtn.addEventListener('click', toggleShuffle);

    const cardSlider = document.querySelector('#card-slider');
    const cardInput = document.querySelector('#card-input');
    cardSlider.addEventListener('input', () => {
        const rank = parseInt(cardSlider.value);
        cardInput.value = rank;
        goToCard(rank);
    });
    cardInput.addEventListener('change', () => {
        let rank = parseInt(cardInput.value);
        if (isNaN(rank) || rank < 1) rank = 1;
        if (rank > words.length) rank = words.length;
        cardSlider.value = rank;
        cardInput.value = rank;
        goToCard(rank);
    });

    const infoBtn = document.querySelector('.info-btn');
    const tooltip = document.querySelector('.instructions-tooltip');
    infoBtn.addEventListener('click', () => {
        tooltip.toggleAttribute('hidden');
    });

    loadWords();
    setupEventListeners();
});

document.body.addEventListener('touchstart', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via touchstart');
}, { once: true });
document.body.addEventListener('click', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via click');
}, { once: true });

function loadWords() {
    fetch('data/vocab_database.yaml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!words.length) {
                console.warn('No words found in vocab_database.yaml');
                alert('No vocabulary data available.');
                return;
            }
            originalOrder = [...words];
            words.sort((a, b) => a.rank - b.rank);
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq).filter(freq => freq > 0)) || 1;
            updateSlider();
            displayWord();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert('Failed to load vocabulary data.');
        });
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    const shuffleBtn = document.querySelector('.shuffle-btn');
    shuffleBtn.textContent = isShuffled ? 'Unshuffle Deck' : 'Shuffle Deck';
    if (isShuffled) {
        words = [...originalOrder].sort(() => Math.random() - 0.5);
    } else {
        words = [...originalOrder].sort((a, b) => a.rank - b.rank);
    }
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    updateSlider();
    displayWord();
    preloadAudio();
}

function goToCard(rank) {
    if (isShuffled) {
        toggleShuffle(); // Unshuffle to ensure rank-based navigation
    }
    currentWordIndex = rank - 1;
    currentBackCardIndex = 0;
    stopAudio();
    updateSlider();
    displayWord();
    preloadAudio();
}

function updateSlider() {
    const cardSlider = document.querySelector('#card-slider');
    const cardInput = document.querySelector('#card-input');
    const currentCardDisplay = document.querySelector('#current-card');
    cardSlider.max = words.length;
    cardInput.max = words.length;
    const currentRank = isShuffled ? (currentWordIndex + 1) : words[currentWordIndex]?.rank || 1;
    cardSlider.value = currentRank;
    cardInput.value = currentRank;
    currentCardDisplay.textContent = currentRank;
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    card.addEventListener('click', (e) => {
        card.classList.add('tapped');
        setTimeout(() => card.classList.remove('tapped'), 200);
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    const audioFile = isFlipped ?
                        (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] ||
                         words[currentWordIndex]?.word_audio_file?.[0]) :
                        words[currentWordIndex]?.word_audio_file?.[0];
                    if (audioFile && audioUnlocked) {
                        playAudio(audioFile);
                    }
                }
                tapCount = 0;
            }, doubleTapThreshold);
        } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
            flipCard();
            tapCount = 0;
        }
        lastTapTime = currentTime;
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flipCard();
        }
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', () => navigateCard(1));
    hammer.on('swiperight', () => navigateCard(-1));
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            playCardAudio();
            preloadAudio();
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            playCardAudio();
            preloadAudio();
        }
    });
}

function navigateCard(direction) {
    if (words.length) {
        currentWordIndex = (currentWordIndex + direction + words.length) % words.length;
        currentBackCardIndex = 0;
        stopAudio();
        updateSlider();
        displayWord();
        playCardAudio();
        preloadAudio();
    }
}

function playCardAudio() {
    const audioFile = isFlipped ?
        (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] ||
         words[currentWordIndex]?.word_audio_file?.[0]) :
        words[currentWordIndex]?.word_audio_file?.[0];
    if (audioFile && audioUnlocked) {
        playAudio(audioFile);
    } else if (!audioFile) {
        console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
    }
}

function preloadAudio() {
    if (!words[currentWordIndex]) return;
    const currentWord = words[currentWordIndex];
    const nextIndex = (currentWordIndex + 1) % words.length;
    const prevIndex = (currentWordIndex - 1 + words.length) % words.length;
    const nextWord = words[nextIndex];
    const prevWord = words[prevIndex];

    const audioFiles = [
        currentWord.word_audio_file?.[0],
        ...(currentWord.sentence_audio_file || []),
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
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    playCardAudio();
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        console.warn('No word available to display');
        return;
    }
    const wordData = words[currentWordIndex];
    const backCard = wordData.back_cards?.[currentBackCardIndex] || { definition_en: 'No definition available', example_en: 'No example available' };

    const logFreq = Math.log(wordData.freq || 1);
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const relativeFreq = 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0);
    const freqColor = getFrequencyColor(relativeFreq);

    document.querySelector('.front').innerHTML = `
        <div class="word-container">
            <h2>${wordData.word || 'No word'}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank || 'N/A'}</span>
            <div class="frequency-container">
                <span class="frequency-label">Frequency:</span>
                <div class="frequency-bar">
                    <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('.back').innerHTML = `
        <div class="word-container">
            <h2>${wordData.word || 'No word'}</h2>
        </div>
        <div class="back-template">
            <div class="card-info">
                <p class="definition">${backCard.definition_en}</p>
                <p class="example">"${backCard.example_en}"</p>
            </div>
            <div class="meta-info">
                <span class="rank">Rank: ${wordData.rank || 'N/A'}</span>
                <div class="frequency-container">
                    <span class="frequency-label">Frequency:</span>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateSlider();
}
