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
        document.getElementById('word-top-left').textContent = 'Error';
        document.getElementById('word-bottom-right').textContent = 'Error';
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
    const wordTopLeftElement = document.getElementById('word-top-left');
    const wordBottomRightElement = document.getElementById('word-bottom-right');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    // Update card content
    wordTopLeftElement.textContent = entry.word;
    wordBottomRightElement.textContent = entry.word;
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

// Touch handling for tap vs swipe
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;
const minSwipeDistance = 50; // Minimum distance for a swipe (pixels)
const maxTapDistance = 10; // Maximum distance for a tap (pixels)
const maxTapDuration = 300; // Maximum duration for a tap (milliseconds)

document.getElementById('vocab-card').addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { // Ensure single touch
        e.preventDefault(); // Prevent default behaviors
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        touchStartTime = Date.now();
    }
});

document.getElementById('vocab-card').addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const touchDuration = Date.now() - touchStartTime;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if it's a tap
    if (distance <= maxTapDistance && touchDuration <= maxTapDuration) {
        const audio = document.getElementById('card-audio');
        audio.play().catch(error => console.error('Error playing audio:', error));
    } else {
        // Handle swipe if distance exceeds swipe threshold
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
});

// Click event for desktop compatibility
document.getElementById('vocab-card').addEventListener('click', (e) => {
    e.preventDefault();
    const audio = document.getElementById('card-audio');
    audio.play().catch(error => console.error('Error playing audio:', error));
});

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
