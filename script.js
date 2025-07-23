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
        // Shuffle the array
        vocabData = vocabData.sort(() => Math.random() - 0.5);
        displayRandomCard();
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Current card index
let currentIndex = 0;

// Function to display the current card
function displayRandomCard() {
    if (vocabData.length === 0 || currentIndex >= vocabData.length) return;

    const entry = vocabData[currentIndex];
    const card = document.getElementById('vocab-card');
    const wordElement = document.getElementById('word');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    // Update card content
    wordElement.textContent = entry.word;
    englishElement.textContent = entry.english;
    thaiElement.textContent = entry.thai;
    audioElement.src = `data/${entry.audio}`;

    // Randomize card background color
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    card.style.backgroundColor = randomColor;

    // Reset card position and opacity
    card.style.transform = 'translate(0, 0) rotate(0deg)';
    card.style.opacity = '1';
}

// Function to animate and move to next card
function moveToNextCard(direction) {
    const card = document.getElementById('vocab-card');
    let translateX = 0;
    let translateY = 0;
    let rotate = 0;

    // Determine animation based on swipe direction
    switch (direction) {
        case 'left':
            translateX = '-100vw';
            rotate = -15;
            break;
        case 'right':
            translateX = '100vw';
            rotate = 15;
            break;
        case 'up':
            translateY = '-100vh';
            rotate = -10;
            break;
        case 'down':
            translateY = '100vh';
            rotate = 10;
            break;
    }

    // Animate card out
    card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    card.style.transform = `translate(${translateX}, ${translateY}) rotate(${rotate}deg)`;
    card.style.opacity = '0';

    // Move to next card after animation
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % vocabData.length;
        displayRandomCard();
        card.style.transition = 'none'; // Reset transition for next card
    }, 500);
}

// Play audio on card click/tap
document.getElementById('vocab-card').addEventListener('click', (e) => {
    e.preventDefault();
    const audio = document.getElementById('card-audio');
    audio.play().catch(error => console.error('Error playing audio:', error));
});

// Swipe detection
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 50;

document.getElementById('vocab-card').addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent browser refresh on swipe down
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.getElementById('vocab-card').addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > minSwipeDistance || absDeltaY > minSwipeDistance) {
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
                moveToNextCard('right');
            } else {
                moveToNextCard('left');
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                moveToNextCard('down');
            } else {
                moveToNextCard('up');
            }
        }
    }
}

// Keyboard controls for PC
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case ' ':
            e.preventDefault();
            const audio = document.getElementById('card-audio');
            audio.play().catch(error => console.error('Error playing audio:', error));
            break;
        case 'ArrowLeft':
            moveToNextCard('left');
            break;
        case 'ArrowRight':
            moveToNextCard('right');
            break;
        case 'ArrowUp':
            moveToNextCard('up');
            break;
        case 'ArrowDown':
            moveToNextCard('down');
            break;
    }
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadVocabData);
