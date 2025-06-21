// script.js
let currentWordIndex = 0;
let currentLetter = 'a';
let words = {};
let isFlipped = false;
let currentAudio = null; // Track currently playing audio
let audioCache = new Map(); // Cache for preloaded audio

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
                preloadAudio(); // Preload audio for initial word
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
        stopAudio(); // Stop any playing audio
        if (words[currentLetter] && words[currentLetter].length > 0) {
            displayWord();
            preloadAudio();
            // Do not auto-play audio on letter change
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
    const nextWord = words[currentLetter][nextIndex];

    // Preload current word's audio
    const currentAudioFiles = [
        currentWord.word_audio_file,
        currentWord.sentence_audio_file
    ];

    // Preload next word's audio
    const nextAudioFiles = nextWord ? [
        nextWord.word_audio_file,
        nextWord.sentence_audio_file
    ] : [];

    // Combine and preload all audio files
    [...currentAudioFiles, ...nextAudioFiles].forEach(audioFile => {
        if (audioFile && !audioCache.has(audioFile)) {
            const audio = new Audio(`data/audio/${audioFile}`);
            audio.preload = 'auto';
            audio.load(); // Start loading
            audioCache.set(audioFile, audio);
            audio.addEventListener('error', () => {
                console.error(`Failed to preload audio: data/audio/${audioFile}`);
                audioCache.delete(audioFile); // Remove failed audio from cache
            }, { once: true });
        }
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

    // Check if audio is in cache
    let audio = audioCache.get(audioFile);
    if (!audio) {
        // Not in cache, create new audio object
        audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audioCache.set(audioFile, audio);
        audio.load(); // Start loading
    }

    currentAudio = audio;

    // Attempt to play audio
    const playAudioWhenReady = () => {
        currentAudio.play().catch(error => {
            console.error('Audio playback error:', error);
            // Retry playback after a short delay
            setTimeout(() => {
                currentAudio.play().catch(err => console.error('Retry failed:', err));
            }, 100);
        });
    };

    // Check if audio is ready to play
    if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
        // Audio is already loaded
        playAudioWhenReady();
    } else {
        // Wait for canplaythrough
        audio.addEventListener('canplaythrough', playAudioWhenReady, { once: true });
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
    preloadAudio(); // Preload audio for flipped state
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
