// Array to hold vocabulary entries
let vocabData = [];

// UNO-inspired colors
const colors = ['#ff5555', '#55ff55', '#5555ff', '#ffff55']; // Red, Green, Blue, Yellow

// Function to fetch and parse JSONL file
async function loadVocabData() {
    try {
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        vocabData = text.trim().split('\n').map(line => JSON.parse(line));
        displayRandomCard();
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Function to display a random card
function displayRandomCard() {
    if (vocabData.length === 0) return;

    // Select random entry
    const randomIndex = Math.floor(Math.random() * vocabData.length);
    const entry = vocabData[randomIndex];

    // Update card content
    document.getElementById('word').textContent = entry.word;
    document.getElementById('english').textContent = entry.english;
    document.getElementById('thai').textContent = entry.thai;

    // Update audio source
    const audioElement = document.getElementById('card-audio');
    audioElement.src = `data/${entry.audio}`;

    // Randomize card background color
    const card = document.getElementById('vocab-card');
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    card.style.backgroundColor = randomColor;
}

// Play audio on card click/tap
document.getElementById('vocab-card').addEventListener('click', () => {
    const audio = document.getElementById('card-audio');
    audio.play().catch(error => console.error('Error playing audio:', error));
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadVocabData);
