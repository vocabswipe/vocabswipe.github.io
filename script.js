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
    let sliderTimeout;
    cardSlider.addEventListener('input', () => {
        clearTimeout(sliderTimeout);
        sliderTimeout = setTimeout(() => {
            currentWordIndex = parseInt(cardSlider.value) - 1;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            preloadAudio();
        }, 300); // Debounce to prevent excessive loading
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
            displayWord();
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
    stopAudio();
    displayWord();
    preloadAudio();
}

function resetCards() {
    words = [...originalWords].sort((a, b) => a.rank - b.rank);
    currentWordIndex = 0;
    currentBackCardIndex = 0;
    stopAudio();
    displayWord();
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
            swipeAnimation('left');
            setTimeout(() => {
                currentWordIndex = (currentWordIndex + 1) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                const audioFile = isFlipped ? 
                    (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                     words[currentWordIndex]?.word_audio_file?.[0]) : 
                    words[currentWordIndex]?.word_audio_file?.[0];
                if (audioFile && audioUnlocked) {
                    playAudio(audioFile);
                }
                preloadAudio();
            }, 200);
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            swipeAnimation('right');
            setTimeout(() => {
                currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                currentBackCardIndex = 0;
                stopAudio();
                displayWord();
                const audioFile = isFlipped ? 
                    (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                     words[currentWordIndex]?.word_audio_file?.[0]) : 
                    words[currentWordIndex]?.word_audio_file?.[0];
                if (audioFile && audioUnlocked) {
                    playAudio(audioFile);
                }
                preloadAudio();
            }, 200);
        }
    });
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            swipeAnimation('up');
            setTimeout(() => {
                currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                stopAudio();
                displayWord();
                const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                                 words[currentWordIndex]?.word_audio_file?.[0];
                if (audioFile && audioUnlocked) {
                    playAudio(audioFile);
                }
                preloadAudio();
            }, 200);
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            swipeAnimation('down');
            setTimeout(() => {
                currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                stopAudio();
                displayWord();
                const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                                 words[currentWordIndex]?.word_audio_file?.[0];
                if (audioFile && audioUnlocked) {
                    playAudio(audioFile);
                }
                preloadAudio();
            }, 200);
        }
    });

    // Keyboard event listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
            hammer.emit('swiperight', { direction: Hammer.DIRECTION_RIGHT });
        } else if (e.key === 'ArrowRight') {
            hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
            hammer.emit('swipeleft', { direction: Hammer.DIRECTION_LEFT });
        } else if (e.key === 'ArrowUp' && isFlipped) {
            hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
            hammer.emit('swipeup', { direction: Hammer.DIRECTION_UP });
        } else if (e.key === 'ArrowDown' && isFlipped) {
            hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
            hammer.emit('swipedown', { direction: Hammer.DIRECTION_DOWN });
        } else if (e.key === 'Enter') {
            card.click();
        }
    });
}

function preloadAudio() {
    if (!words[currentWordIndex]) return;
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
    displayWord();
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
    card.classList.remove('glow');
    void card.offsetWidth; // Trigger reflow
    card.classList.add('glow');
    if (times === 2) {
        setTimeout(() => {
            card.classList.remove('glow');
            void card.offsetWidth;
            card.classList.add('glow');
        }, 300);
    }
}

function swipeAnimation(direction) {
    const card = document.querySelector('.flashcard');
    const clone = card.cloneNode(true);
    clone.classList.add('swipe-clone', `swipe-${direction}`);
    card.parentNode.appendChild(clone);
    setTimeout(() => clone.remove(), 200);
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

    document.querySelector('#card-slider').value = currentWordIndex + 1;

    document.querySelector('.front').innerHTML = `
        <div class="word-container">
            <h2>${wordData.word}</h2>
        </div>
        <div class="meta-info">
            <span class="rank">Rank: ${wordData.rank}</span>
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
                    <span class="frequency-label">Frequency</span>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${freqPercentage}%; background-color: ${freqColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
