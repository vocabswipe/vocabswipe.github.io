// script.js
let currentWordIndex = 0;
let currentLetter = 'a';
let words = {};
let isFlipped = false;
let currentAudio = null; // Track currently playing audio
let audioCache = new Map(); // Cache for preloaded audio
const MAX_CACHE_SIZE = 10; // Limit cache to 10 audio files

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
            words = jsyaml.load(yamlText) || {};
            if (!words[currentLetter] || !words[currentLetter].length) {
                console.warn(`No words found for letter ${currentLetter}`);
                findFirstNonEmptyLetter();
            } else {
                displayWord();
                preloadAudio();
            }
        })
        .catch(error => {
            console.error('Error loading words:', error);
            alert('Failed to load vocabulary data.');
        });
}

function findFirstNonEmptyLetter() {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
                     'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'other'];
    for (let letter of letters) {
        if (words[letter] && words[letter].length > 0) {
            currentLetter = letter;
            currentWordIndex = 0;
            document.getElementById('letter-select').value = currentLetter;
            displayWord();
            preloadAudio();
            return;
        }
    }
    alert('No words available in the database.');
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300; // ms to distinguish single vs. double tap

    // Handle taps
    card.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        tapCount++;

        if (tapCount === 1) {
            // Single tap: Wait to confirm no double tap
            setTimeout(() => {
                if (tapCount === 1) {
                    const audioFile = isFlipped ? 
                        words[currentLetter][currentWordIndex].sentence_audio_file : 
                        words[currentLetter][currentWordIndex].word_audio_file;
                    playAudio(audioFile);
                }
                tapCount = 0; // Reset after processing
            }, doubleTapThreshold);
        } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
            // Double tap: Flip card and play appropriate audio
            flipCard();
            const audioFile = isFlipped ? 
                words[currentLetter][currentWordIndex].sentence_audio_file : 
                words[currentLetter][currentWordIndex].word_audio_file;
            playAudio(audioFile);
            tapCount = 0; // Reset after double tap
        }

        lastTapTime = currentTime;
    });

    // Swipe gestures
    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    hammer.on('swipeleft', () => {
        if (!words[currentLetter]) return;
        const nextIndex = currentWordIndex < words[currentLetter].length - 1 ? currentWordIndex + 1 : 0;
        const audioFile = isFlipped ? 
            words[currentLetter][nextIndex].sentence_audio_file : 
            words[currentLetter][nextIndex].word_audio_file;
        nextWord();
        playAudio(audioFile);
    });
    hammer.on('swiperight', () => {
        if (!words[currentLetter]) return;
        const prevIndex = currentWordIndex > 0 ? currentWordIndex - 1 : words[currentLetter].length - 1;
        const audioFile = isFlipped ? 
            words[currentLetter][prevIndex].sentence_audio_file : 
            words[currentLetter][prevIndex].word_audio_file;
        prevWord();
        playAudio(audioFile);
    });

    // Letter selection
    document.getElementById('letter-select').addEventListener('change', (e) => {
        currentLetter = e.target.value;
        currentWordIndex = 0;
        // Maintain isFlipped state
        stopAudio();
        audioCache.clear(); // Clear cache to avoid stale audio
        if (words[currentLetter] && words[currentLetter].length > 0) {
            displayWord();
            preloadAudio();
        } else {
            console.warn(`No words found for letter ${currentLetter}`);
            findFirstNonEmptyLetter();
        }
    });
}

function preloadAudio() {
    if (!words[currentLetter] || !words[currentLetter][currentWordIndex]) return;

    const currentWord = words[currentLetter][currentWordIndex];
    const nextIndex = currentWordIndex < words[currentLetter].length - 1 ? currentWordIndex + 1 : 0;
    const prevIndex = currentWordIndex > 0 ? currentWordIndex - 1 : words[currentLetter].length - 1;
    const nextWord = words[currentLetter][nextIndex];
    const prevWord = words[currentLetter][prevIndex];

    // Audio files to preload: current, next, and previous word
    const audioFiles = [
        currentWord.word_audio_file,
        currentWord.sentence_audio_file,
        nextWord ? nextWord.word_audio_file : null,
        nextWord ? nextWord.sentence_audio_file : null,
        prevWord ? prevWord.word_audio_file : null,
        prevWord ? prevWord.sentence_audio_file : null
    ].filter(file => file && !audioCache.has(file));

    // Clean up cache if it exceeds MAX_CACHE_SIZE
    while (audioCache.size + audioFiles.length > MAX_CACHE_SIZE && audioCache.size > 0) {
        const oldestKey = audioCache.keys().next().value;
        audioCache.delete(oldestKey);
    }

    // Preload new audio files
    audioFiles.forEach(audioFile => {
        const audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
        audio.addEventListener('canplaythrough', () => {
            console.log(`Preloaded: data/audio/${audioFile}`);
        }, { once: true });
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

    // Stop any currently playing audio
    stopAudio();

    // Get or create audio object
    let audio = audioCache.get(audioFile);
    if (!audio) {
        console.warn(`Audio not in cache: ${audioFile}, loading now`);
        audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
    }

    currentAudio = audio;

    // Attempt to play audio
    const attemptPlay = () => {
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error(`Playback error for ${audioFile}:`, error);
                // Retry after a short delay
                setTimeout(() => {
                    currentAudio.play().catch(err => console.error(`Retry failed for ${audioFile}:`, err));
                }, 100);
            });
        }
    };

    // Check if audio is ready
    if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
        console.log(`Playing cached audio: ${audioFile}`);
        attemptPlay();
    } else {
        console.log(`Waiting for ${audioFile} to load`);
        audio.addEventListener('canplaythrough', () => {
            console.log(`canplaythrough triggered for ${audioFile}`);
            attemptPlay();
        }, { once: true });
        audio.addEventListener('error', () => {
            console.error(`Error loading audio: data/audio/${audioFile}`);
            audioCache.delete(audioFile);
            currentAudio = null;
        }, { once: true });
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
    if (!words[currentLetter] || !words[currentLetter][currentWordIndex]) {
        console.warn('No word available to display');
        return;
    }
    const wordData = words[currentLetter][currentWordIndex];
    const front = document.querySelector('.front');
    const back = document.querySelector('.back');

    front.innerHTML = `<h2>${wordData.word}</h2>`;
    back.innerHTML = `
        <h2 class="english">${wordData.word}</h2>
        <p class="english part-of-speech">(${wordData.part_of_speech})</p>
        <p class="thai">${wordData.definition_th}</p>
        <p class="english">${wordData.example_en}</p>
        <p class="thai">${wordData.example_th}</p>
    `;
}

function nextWord() {
    if (!words[currentLetter]) return;
    if (currentWordIndex < words[currentLetter].length - 1) {
        currentWordIndex++;
    } else {
        currentWordIndex = 0;
    }
    stopAudio();
    displayWord();
    preloadAudio();
}

function prevWord() {
    if (!words[currentLetter]) return;
    if (currentWordIndex > 0) {
        currentWordIndex--;
    } else {
        currentWordIndex = words[currentLetter].length - 1;
    }
    stopAudio();
    displayWord();
    preloadAudio();
}
