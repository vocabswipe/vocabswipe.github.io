// Array to hold vocabulary entries
let vocabData = [];
let shuffledIndices = [];
let currentIndex = 0;

// UNO-inspired colors
const colors = ['#ff5555', '#55ff55', '#5555ff', '#ffff55']; // Red, Green, Blue, Yellow

// Function to shuffle array (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to fetch and parse JSONL file
async function loadVocabData() {
    try {
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        vocabData = text.trim().split('\n').map(line => JSON.parse(line));
        // Create and shuffle indices
        shuffledIndices = shuffleArray([...Array(vocabData.length).keys()]);
        currentIndex = 0;
        displayCard();
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Function to display the current card
function displayCard() {
    if (shuffledIndices.length === 0 || currentIndex >= shuffledIndices.length) {
        // Reshuffle when deck is empty
        shuffledIndices = shuffleArray([...Array(vocabData.length).keys()]);
        currentIndex = 0;
    }

    const entry = vocabData[shuffledIndices[currentIndex]];
    const card = document.getElementById('vocab-card');
    
    // Reset card position and opacity
    card.style.transform = 'translate(0, 0)';
    card.style.opacity = '1';
    
    // Update card content
    document.getElementById('word').textContent = entry.word;
    document.getElementById('english').textContent = entry.english;
    document.getElementById('thai').textContent = entry.thai;

    // Update audio source
    const audioElement = document.getElementById('card-audio');
    audioElement.src = `data/${entry.audio}`;

    // Randomize card background color
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    card.style.backgroundColor = randomColor;
}

// Play audio on card click/tap
document.getElementById('vocab-card').addEventListener('click', (e) => {
    // Prevent click from interfering with swipe
    if (e.detail === 0) return; // Ignore touch-related clicks
    const audio = document.getElementById('card-audio');
    audio.play().catch(error => console.error('Error playing audio:', error));
});

// Swipe handling
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const card = document.getElementById('vocab-card');

card.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

card.addEventListener('touchmove', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Move card with finger
    card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
});

card.addEventListener('touchend', () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    // Check if swipe distance is sufficient
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        // Determine swipe direction
        let direction;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        // Animate card out based on direction
        let transformValue;
        if (direction === 'left') transformValue = 'translateX(-100vw)';
        else if (direction === 'right') transformValue = 'translateX(100vw)';
        else if (direction === 'up') transformValue = 'translateY(-100vh)';
        else if (direction === 'down') transformValue = 'translateY(100vh)';

        card.style.transition = 'transform 0.3s ease-out';
        card.style.transform = transformValue;

        // After animation, load next card
        setTimeout(() => {
            card.style.transition = ''; // Reset transition
            currentIndex++;
            displayCard();
        }, 300);
    } else {
        // Reset position if not a swipe
        card.style.transition = 'transform 0.2s ease-out';
        card.style.transform = 'translate(0, 0)';
        setTimeout(() => {
            card.style.transition = ''; // Reset transition
        }, 200);
    }
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadVocabData);
