let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    setupEventListeners();
});

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
            words.sort((a, b) => a.rank - b.rank); // Sort by rank ascending
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

    card.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    const audioFile = isFlipped ? 
                        words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || 
                        words[currentWordIndex].word_audio_file[0] : 
                        words[currentWordIndex].word_audio_file[0];
                    playAudio(audioFile);
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
            if (!isFlipped) {
                currentWordIndex = (currentWordIndex + 1) % words.length;
                playAudio(words[currentWordIndex].word_audio_file[0]);
            } else {
                currentWordIndex = (currentWordIndex + 1) % words.length;
                currentBackCardIndex = 0; // Reset to first back card when changing words
                playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            }
            stopAudio();
            displayWord();
            preloadAudio();
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            if (!isFlipped) {
                currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                playAudio(words[currentWordIndex].word_audio_file[0]);
            } else {
                currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                currentBackCardIndex = 0; // Reset to first back card when changing words
                playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            }
            stopAudio();
            displayWord();
            preloadAudio();
        }
    });
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex].back_cards) {
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            displayWord();
            playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex].back_cards) {
            currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
            displayWord();
            playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
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
        currentWord.word_audio_file[0],
        ...currentWord.sentence_audio_file,
        nextWord ? nextWord.word_audio_file[0] : null,
        ...nextWord ? nextWord.sentence_audio_file : [],
        prevWord ? prevWord.word_audio_file[0] : null,
        ...prevWord ? prevWord.sentence_audio_file : []
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
        console.warn('No audio file available');
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
        playPromise.catch(error => console.error(`Playback error for ${audioFile}:`, error));
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    card.classList.toggle('flipped', isFlipped);
    stopAudio();
    displayWord();
    const audioFile = isFlipped ? 
        words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || 
        words[currentWordIndex].word_audio_file[0] : 
        words[currentWordIndex].word_audio_file[0];
    playAudio(audioFile);
}

function displayWord() {
    if (!words[currentWordIndex]) {
        console.warn('No word available to display');
        return;
    }
    const wordData = words[currentWordIndex];
    const front = document.querySelector('.front');
    const back = document.querySelector('.back');
    const backCard = wordData.back_cards[currentBackCardIndex];
    const maxFreq = words[0]?.freq || 1;
    const relFreq = (wordData.freq / maxFreq) * 100;

    // Calculate color based on relative frequency (0% red, 100% green)
    const red = Math.round(255 * (1 - relFreq / 100)); // Red decreases from 255 to 0
    const green = Math.round(255 * (relFreq / 100));   // Green increases from 0 to 255
    const color = `rgb(${red}, ${green}, 0)`;          // No blue for simplicity

    front.innerHTML = `<h2>${wordData.word}</h2><div id="front-rank" class="rank">Rank: ${wordData.rank}</div><div id="front-freq" class="freq" style="color: ${color}">${relFreq.toFixed(1)}%</div>`;
    back.innerHTML = `
        <h2 class="english">${wordData.word}</h2>
        <div class="back-template">
            <div class="card-info">
                <p id="back-definition" class="definition">${backCard.definition_en}</p>
                <p id="back-example" class="example">${backCard.example_en}</p>
            </div>
            <div id="back-rank" class="rank">Rank: ${wordData.rank}</div>
            <div id="back-freq" class="freq" style="color: ${color}">${relFreq.toFixed(1)}%</div>
        </div>
    `;
}
