// script.js
let currentWordIndex = 0;
let currentLetter = 'a';
let words = {};
let isFlipped = false;
let currentAudio = null; // Track currently playing audio

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
            }
            displayWord();
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
            // Single tap: Schedule audio playback
            setTimeout(() => {
                if (tapCount === 1) {
                    const audioFile = isFlipped ? 
                        words[currentLetter][currentWordIndex].sentence_audio_file : 
                        words[currentLetter][currentWordIndex].word_audio_file;
                    playAudioWithDelay(audioFile);
                }
                tapCount = 0; // Reset after processing
            }, doubleTapThreshold);
        } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
            // Double tap: Flip card and play appropriate audio
            flipCard();
            const audioFile = isFlipped ? 
                words[currentLetter][currentWordIndex].sentence_audio_file : 
                words[currentLetter][currentWordIndex].word_audio_file;
            playAudioWithDelay(audioFile);
            tapCount = 0; // Reset after double tap
        }

        lastTapTime = currentTime;
    });

    // Swipe gestures
    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    hammer.on('swipeleft', () => {
        nextWord();
        const audioFile = isFlipped ? 
            words[currentLetter][currentWordIndex].sentence_audio_file : 
            words[currentLetter][currentWordIndex].word_audio_file;
        playAudioWithDelay(audioFile);
    });
    hammer.on('swiperight', () => {
        prevWord();
        const audioFile = isFlipped ? 
            words[currentLetter][currentWordIndex].sentence_audio_file : 
            words[currentLetter][currentWordIndex].word_audio_file;
        playAudioWithDelay(audioFile);
    });

    // Letter selection
    document.getElementById('letter-select').addEventListener('change', (e) => {
        currentLetter = e.target.value;
        currentWordIndex = 0;
        isFlipped = false;
        displayWord();
    });
}

function playAudioWithDelay(audioFile) {
    if (!audioFile) {
        console.warn('No audio file available');
        return;
    }
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    setTimeout(() => {
        currentAudio = new Audio(`data/audio/${audioFile}`);
        currentAudio.play().catch(error => console.error('Audio playback error:', error));
    }, 200); // 0.2-second delay
}

function flipCard() {
    isFlipped = !isFlipped;
    const card = document.querySelector('.flashcard');
    card.classList.toggle('flipped', isFlipped);
    displayWord();
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
    displayWord();
}

function prevWord() {
    if (!words[currentLetter]) return;
    if (currentWordIndex > 0) {
        currentWordIndex--;
    } else {
        currentWordIndex = words[currentLetter].length - 1;
    }
    displayWord();
}
