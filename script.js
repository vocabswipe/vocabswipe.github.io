// Initialize variables
let vocabData = [];
let currentCardIndex = 0;
let filteredVocab = [];

// DOM elements
const flashcard = document.getElementById('flashcard');
const wordEl = document.getElementById('word');
const partOfSpeechEl = document.getElementById('partOfSpeech');
const definitionEnEl = document.getElementById('definitionEn');
const definitionThEl = document.getElementById('definitionTh');
const exampleEnEl = document.getElementById('exampleEn');
const exampleThEl = document.getElementById('exampleTh');
const playAudioBtn = document.getElementById('playAudio');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const cardCountEl = document.getElementById('cardCount');
const searchInput = document.getElementById('searchInput');
const errorMessage = document.getElementById('errorMessage');

// Load YAML data
async function loadVocabData() {
    try {
        const response = await fetch('./vocab_database.yaml');
        if (!response.ok) throw new Error('Failed to load vocab_database.yaml');
        const yamlText = await response.text();
        vocabData = jsyaml.load(yamlText) || [];
        filteredVocab = vocabData;
        if (vocabData.length === 0) {
            showError('No vocabulary data found.');
            return;
        }
        displayCard(currentCardIndex);
    } catch (error) {
        showError(`Error loading vocabulary: ${error.message}`);
    }
}

// Display card at index
function displayCard(index) {
    if (filteredVocab.length === 0 || index < 0 || index >= filteredVocab.length) {
        showError('No cards available.');
        return;
    }
    const card = filteredVocab[index];
    wordEl.textContent = card.word;
    partOfSpeechEl.textContent = `Part of Speech: ${card.part_of_speech}`;
    definitionEnEl.textContent = `Definition (EN): ${card.definition_en}`;
    definitionThEl.textContent = `Definition (TH): ${card.definition_th}`;
    exampleEnEl.textContent = `Example (EN): ${card.example_en}`;
    exampleThEl.textContent = `Example (TH): ${card.example_th}`;
    cardCountEl.textContent = `Card ${index + 1} of ${filteredVocab.length}`;
    flashcard.classList.remove('flipped'); // Reset to front
    playAudioBtn.onclick = () => playAudio(card.audio_file);
    errorMessage.classList.add('hidden');
}

// Play audio
function playAudio(audioFile) {
    const audio = new Audio(`./audio/${audioFile}`);
    audio.play().catch(error => {
        showError(`Error playing audio: ${error.message}`);
    });
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Flip card on click
flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
});

// Navigation
prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        displayCard(currentCardIndex);
    }
});
nextBtn.addEventListener('click', () => {
    if (currentCardIndex < filteredVocab.length - 1) {
        currentCardIndex++;
        displayCard(currentCardIndex);
    }
});

// Search/filter
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    filteredVocab = vocabData.filter(card => 
        card.word.toLowerCase().includes(query) || 
        card.part_of_speech.toLowerCase().includes(query)
    );
    currentCardIndex = 0;
    if (filteredVocab.length === 0) {
        showError('No matching words found.');
        flashcard.style.display = 'none';
        cardCountEl.textContent = '';
    } else {
        flashcard.style.display = 'block';
        displayCard(currentCardIndex);
    }
});

// Load data on page load
loadVocabData();
