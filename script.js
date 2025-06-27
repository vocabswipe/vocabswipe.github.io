let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;
let audioUnlocked = false;
let maxFreq = 0; // Maximum frequency (rank 1 word)
let minFreq = 1; // Minimum frequency, default to 1 to avoid log(0)

document.addEventListener('DOMContentLoaded', () => {
    // Load theme from localStorage, default to bright
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Setup theme toggle button
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    loadWords();
    setupEventListeners();
});

// Unlock audio on first user interaction
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
                throw new Error(`HTTP error! status: ${response.status} - Check if vocab_database.yaml exists in data/`);
            }
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!words.length) {
                console.warn('No words found in vocab_database.yaml');
                alert('No vocabulary data available. Please ensure vocab_database.yaml is populated.');
                return;
            }
            words.sort((a, b) => a.rank - b.rank);
            // Find max and min frequencies
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq).filter(freq => freq > 0)) || 1;
            displayWord();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert('Failed to load vocabulary data. Check the console for details.');
        });
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    // Create swipe overlay elements
    const swipeOverlays = {
        left: createSwipeOverlay('swipe-left'),
        right: createSwipeOverlay('swipe-right'),
        up: createSwipeOverlay('swipe-up'),
        down: createSwipeOverlay('swipe-down')
    };

    function createSwipeOverlay(className) {
        const overlay = document.createElement('div');
        overlay.className = `swipe-overlay ${className}`;
        card.appendChild(overlay);
        return overlay;
    }

    function showSwipeFeedback(direction) {
        const overlay = swipeOverlays[direction];
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 300);
    }

    function showRippleEffect(x, y) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x - rect.left - size / 2}px`;
        ripple.style.top = `${y - rect.top - size / 2}px`;
        card.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    card.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        tapCount++;
        showRippleEffect(e.clientX, e.clientY);
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    const audioFile = isFlipped ? 
                        (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                         words[currentWordIndex]?.word_audio_file?.[0]) : 
                        words[currentWordIndex]?.word_audio_file?.[0];
                    if (audioFile) {
                        playAudio(audioFile);
                    } else {
                        console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
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

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', () => {
        if (words.length) {
            showSwipeFeedback('left');
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe left: Playing audio for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            showSwipeFeedback('right');
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe right: Playing audio for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            showSwipeFeedback('up');
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe up: Playing audio for back card at index ${currentBackCardIndex} for word ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for back card at index ${currentBackCardIndex} for word at ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            showSwipeFeedback('down');
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe down: Playing audio for back card at index ${currentBackCardIndex} for word ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for back card at index ${currentBackCardIndex} for word at ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
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
    if (!audioFile) {
        console.warn('No audio file provided for playback');
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
    } else {
        console.log(`Playing audio: data/audio/${audioFile}`);
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
    if (audioFile) {
        console.log(`Flip card: Playing audio for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
        playAudio(audioFile);
    } else {
        console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
    }
}

function getFrequencyColor(relativeFreq) {
    // Color gradient: red (0%) -> orange (50%) -> green (100%)
    // Hue: 0 (red) to 120 (green)
    const hue = Math.min(relativeFreq * 1.2, 120); // Scale 0-100% to 0-120 degrees
    return `hsl(${hue}, 80%, 50%)`;
}

function displayWord() {
    if (!words[currentWordIndex]) {
        console.warn('No word available to display');
        return;
    }
    const wordData = words[currentWordIndex];
    const backCard = wordData.back_cards?.[currentBackCardIndex] || { definition_en: '', example_en: '' };
    
    // Calculate relative frequency using logarithmic scaling with minimum 5% width
    const logFreq = Math.log(wordData.freq || 1);
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const relativeFreq = 5 + 95 * ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
    const freqPercentage = Math.min(Math.max(relativeFreq, 5), 100).toFixed(0); // Ensure within 5-100%
    const freqColor = getFrequencyColor(relativeFreq);

    // Update front card
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

    // Update back card
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
