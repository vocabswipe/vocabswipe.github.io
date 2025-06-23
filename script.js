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
            if (!response.ok) throw new Error('Failed to load vocab_database.yaml');
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!words.length) {
                console.warn('No words found in vocab_database.yaml');
                return;
            }
            displayWord();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error);
            alert('Failed to load vocabulary data.');
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
            const audioFile = isFlipped ? 
                words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || 
                words[currentWordIndex].word_audio_file[0] : 
                words[currentWordIndex].word_audio_file[0];
            playAudio(audioFile);
            tapCount = 0;
        }
        lastTapTime = currentTime;
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', () => {
        if (words.length) {
            currentWordIndex = (currentWordIndex + 1) % words.length;
            if (isFlipped) {
                playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            } else {
                playAudio(words[currentWordIndex].word_audio_file[0]);
            }
            stopAudio();
            displayWord();
            preloadAudio();
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            if (isFlipped) {
                playAudio(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            } else {
                playAudio(words[currentWordIndex].word_audio_file[0]);
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
    preloadAudio();
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

    front.innerHTML = `<h2>${wordData.word}</h2>`;
    back.innerHTML = `
        <h2 class="english">${wordData.word}</h2>
        <p id="back-details" class="thai">${backCard.definition_th}</p>
        <p class="english">${backCard.example_en}</p>
        <p class="thai">${backCard.example_th}</p>
    `;
}
