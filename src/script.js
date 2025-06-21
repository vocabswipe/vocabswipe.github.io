// script.js
let currentWordIndex = 0;
let currentLetter = 'a';
let words = {};
let isFlipped = false;

document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    setupEventListeners();
});

function loadWords() {
    fetch('../data/vocab_database.yaml')
        .then(response => response.text())
        .then(yamlText => {
            words = jsyaml.load(yamlText); // Requires js-yaml library
            displayWord();
        });
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    card.addEventListener('click', () => {
        if (!isFlipped) {
            playAudioWithDelay(isFlipped ? words[currentLetter][currentWordIndex].sentence_audio_file : words[currentLetter][currentWordIndex].word_audio_file);
        }
    });
    card.addEventListener('dblclick', () => {
        flipCard();
        playAudioWithDelay(words[currentLetter][currentWordIndex].sentence_audio_file);
    });

    // Swipe gestures (using Hammer.js or similar)
    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    hammer.on('swipeleft', () => {
        nextWord();
        playAudioWithDelay(words[currentLetter][currentWordIndex].word_audio_file);
    });
    hammer.on('swiperight', () => {
        prevWord();
        playAudioWithDelay(words[currentLetter][currentWordIndex].word_audio_file);
    });

    // Dropdown for A-Z selection
    document.getElementById('letter-select').addEventListener('change', (e) => {
        currentLetter = e.target.value;
        currentWordIndex = 0;
        isFlipped = false;
        displayWord();
    });
}

function playAudioWithDelay(audioFile) {
    setTimeout(() => {
        const audio = new Audio(`../data/audio/${audioFile}`);
        audio.play();
    }, 200); // 0.2-second delay
}

function flipCard() {
    const card = document.querySelector('.flashcard');
    isFlipped = !isFlipped;
    card.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    displayWord();
}

function displayWord() {
    const wordData = words[currentLetter][currentWordIndex];
    const card = document.querySelector('.flashcard');
    if (isFlipped) {
        card.innerHTML = `
            <div class="back">
                <h2>${wordData.word}</h2>
                <p>Part of Speech: ${wordData.part_of_speech}</p>
                <p>Thai: ${wordData.definition_th}</p>
                <p>Example: ${wordData.example_en}</p>
                <p>ตัวอย่าง: ${wordData.example_th}</p>
            </div>
        `;
    } else {
        card.innerHTML = `<h2>${wordData.word}</h2>`;
    }
}

function nextWord() {
    if (currentWordIndex < words[currentLetter].length - 1) {
        currentWordIndex++;
    } else {
        currentWordIndex = 0;
    }
    isFlipped = false;
    displayWord();
}

function prevWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
    } else {
        currentWordIndex = words[currentLetter].length - 1;
    }
    isFlipped = false;
    displayWord();
}
