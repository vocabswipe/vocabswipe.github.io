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

    const shuffleButton = document.querySelector('.shuffle-button');
    shuffleButton.addEventListener('click', toggleShuffle);

    const wordSlider = document.querySelector('#word-slider');
    wordSlider.addEventListener('input', () => {
        currentWordIndex = parseInt(wordSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
        updateSliderLabel();
        playCurrentAudio();
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
            document.querySelector('#word-slider').max = words.length;
            document.querySelector('#progress-total').textContent = words.length;
            displayWord();
            updateSliderLabel();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert('Failed to load vocabulary data.');
        });
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    const shuffleButton = document.querySelector('.shuffle-button');
    shuffleButton.textContent = isShuffled ? 'Sort by Rank' : 'Shuffle Deck';
    if (isShuffled) {
        words = [...originalOrder].sort(() => Math.random() - 0.5);
    } else {
        words = [...originalOrder].sort((a, b) => a.rank - b.rank);
    }
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
    updateSliderLabel();
    preloadAudio();
}

function updateSliderLabel() {
    const slider = document.querySelector('#word-slider');
    const currentRank = document.querySelector('#current-rank');
    const progressCurrent = document.querySelector('#progress-current');
    slider.value = currentWordIndex + 1;
    currentRank.textContent = words[currentWordIndex]?.rank || currentWordIndex + 1;
    progressCurrent.textContent = currentWordIndex + 1;
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    card.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    playCurrentAudio();
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
            flipCard();
            e.preventDefault();
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
            playCurrentAudio();
            preloadAudio();
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            playCurrentAudio();
            preloadAudio();
        }
    });
}

function navigateCard(direction) {
    if (words.length) {
        currentWordIndex = (currentWordIndex + direction + words.length) % words.length;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord();
        updateSliderLabel();
        playCurrentAudio();
        preloadAudio();
    }
}

function playCurrentAudio() {
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
    const audioFiles = [
        currentWord.word_audio_file?.[0],
        ...(currentWord.sentence_audio_file || []),
        words[nextIndex]?.word_audio_file?.[0],
        ...(words[nextIndex]?.sentence_audio_file || []),
        words[prevIndex]?.word_audio_file?.[0],
        ...(words[prevIndex]?.sentence_audio_file || [])
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
        console.warn('Audio playback blocked: No file or audio not unlocked');
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
            .then(() => console.log(`Playing: data/audio/${audioFile}`))
            .catch(error => console.error(`Playback error for data/audio/${audioFile}:`, error.message));
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
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
        console.warn('No word available to display');
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

    document.querySelector('.front').innerHTML = `
        <div class="word-container">
            <h2>${wordData.word}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank}</span>
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
            <h2>${wordData.word}</h2>
        </div>
        <div class="back-template">
            <div class="card-info">
                <p class="definition">${backCard.definition_en}</p>
                <p class="example">"${backCard.example_en}"</p>
            </div>
            <div class="meta-info">
                <span class="rank">Rank: ${wordData.rank}</span>
                <div class="frequency-container">
                    <span class="frequency-label">Frequency:</span>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
