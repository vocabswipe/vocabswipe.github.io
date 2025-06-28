let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let originalWords = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 5; // Reduced cache size
let audioUnlocked = false;
let maxFreq = 0;
let minFreq = 1;
let lastInteractedIndex = 0;

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

    const cardSlider = document.querySelector('#card-slider');
    let isSliding = false;
    cardSlider.addEventListener('input', () => {
        isSliding = true;
        currentWordIndex = parseInt(cardSlider.value) - 1;
        currentBackCardIndex = 0;
        stopAudio();
        displayWord(false); // Don't autoplay during sliding
    });
    cardSlider.addEventListener('change', () => {
        isSliding = false;
        lastInteractedIndex = currentWordIndex;
        displayWord(true); // Autoplay only on final card
        preloadAudio();
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
            originalWords = [...words];
            words.sort((a, b) => a.rank - b.rank);
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq).filter(freq => freq > 0)) || 1;
            document.querySelector('#card-slider').max = words.length;
            lastInteractedIndex = 0;
            displayWord(true);
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert('Failed to load vocabulary data.');
        });
}

function shuffleCards() {
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    lastInteractedIndex = 0;
    stopAudio();
    displayWord(true);
    preloadAudio();
}

function resetCards() {
    words = [...originalWords].sort((a, b) => a.rank - b.rank);
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    lastInteractedIndex = 0;
    stopAudio();
    displayWord(true);
    preloadAudio();
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
                    glowCard(1);
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
            glowCard(2);
            flipCard();
            tapCount = 0;
        }
        lastTapTime = currentTime;
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', () => {
        if (words.length) {
            animateSwipe('left');
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
            lastInteractedIndex = currentWordIndex;
            stopAudio();
            displayWord(true);
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            animateSwipe('right');
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
            lastInteractedIndex = currentWordIndex;
            stopAudio();
            displayWord(true);
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        }
    });
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('up');
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord(true);
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('down');
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord(true);
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            animateSwipe('right');
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
            lastInteractedIndex = currentWordIndex;
            stopAudio();
            displayWord(true);
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        } else if (e.key === 'ArrowRight') {
            animateSwipe('left');
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
            lastInteractedIndex = currentWordIndex;
            stopAudio();
            displayWord(true);
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        } else if (e.key === 'ArrowUp' && isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('up');
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord(true);
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        } else if (e.key === 'ArrowDown' && isFlipped && words[currentWordIndex]?.back_cards) {
            animateSwipe('down');
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord(true);
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile && audioUnlocked) {
                playAudio(audioFile);
            }
            preloadAudio();
        } else if (e.key === ' ') {
            e.preventDefault();
            glowCard(2);
            flipCard();
        }
    });
}

function preloadAudio() {
    if (!words[currentWordIndex] || Math.abs(currentWordIndex - lastInteractedIndex) > 2) return;
    const currentWord = words[currentWordIndex];
    const audioFiles = [
        currentWord.word_audio_file?.[0],
        ...(currentWord.sentence_audio_file || [])
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
    displayWord(true);
    const audioFile = isFlipped ? 
        (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
         words[currentWordIndex]?.word_audio_file?.[0]) : 
        words[currentWordIndex]?.word_audio_file?.[0];
    if (audioFile && audioUnlocked) {
        playAudio(audioFile);
    }
}

function glowCard(times) {
    const card = document.querySelector('.flashcard');
    card.classList.remove('glow-once', 'glow-twice');
    void card.offsetWidth; // Trigger reflow
    card.classList.add(times === 1 ? 'glow-once' : 'glow-twice');
}

function animateSwipe(direction) {
    const card = document.querySelector('.flashcard');
    card.classList.remove('swipe-left', 'swipe-right', 'swipe-up', 'swipe-down');
    void card.offsetWidth; // Trigger reflow
    card.classList.add(`swipe-${direction}`);
}

function getFrequencyColor(relativeFreq) {
    const hue = Math.min(relativeFreq * 1.2, 120);
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord(autoplay = false) {
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

    document.querySelector('#card-slider').value = currentWordIndex + 1;

    document.querySelector('.front').innerHTML = `
        <div class="word-container">
            <h2>${wordData.word}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank}</span>
            <div class="frequency-label">Frequency</div>
            <div class="frequency-container">
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
                <div class="frequency-label">Frequency</div>
                <div class="frequency-container">
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (autoplay && audioUnlocked && Math.abs(currentWordIndex - lastInteractedIndex) <= 2) {
        const audioFile = isFlipped ? 
            (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
             words[currentWordIndex]?.word_audio_file?.[0]) : 
            words[currentWordIndex]?.word_audio_file?.[0];
        if (audioFile) {
            playAudio(audioFile);
        }
    }
}
