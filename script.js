// Array to hold vocabulary entries
let vocabData = [];

// Poker card text colors
const textColors = ['#ff0000', '#000000']; // Red, Black

// Swipe counter
let swipeCount = 0;
let lastResetDate = localStorage.getItem('lastResetDate') || '';
const today = new Date().toISOString().split('T')[0]; // Current date (YYYY-MM-DD)

// Reset swipe count if it's a new day
if (lastResetDate !== today) {
    swipeCount = 0;
    localStorage.setItem('swipeCount', swipeCount);
    localStorage.setItem('lastResetDate', today);
} else {
    swipeCount = parseInt(localStorage.getItem('swipeCount') || '0');
}

// Update swipe counter display
function updateSwipeCounter() {
    document.getElementById('swipe-counter').textContent = `${swipeCount} cards swiped`;
}

// Function to fetch and parse JSONL file
async function loadVocabData() {
    try {
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        vocabData = text.trim().split('\n').map(line => JSON.parse(line));
        // Shuffle the array
        vocabData = vocabData.sort(() => Math.random() - 0.5);
        displayRandomCard();
        updateSwipeCounter();
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word-top').textContent = 'Error';
        document.getElementById('word-bottom').textContent = 'Error';
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
    const wordTopElement = document.getElementById('word-top');
    const wordBottomElement = document.getElementById('word-bottom');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    // Update card content
    wordTopElement.textContent = entry.word;
    wordBottomElement.textContent = entry.word;
    englishElement.textContent = entry.english;
    thaiElement.textContent = entry.thai;
    audioElement.src = `data/${entry.audio}`;

    // Randomize text color
    const randomColor = textColors[Math.floor(Math.random() * textColors.length)];
    wordTopElement.style.color = randomColor;
    wordBottomElement.style.color = randomColor;
    englishElement.style.color = randomColor;
    thaiElement.style.color = randomColor;

    // Set card background to white
    card.style.backgroundColor = '#ffffff';

    // Reset card position and opacity
    card.style.transform = 'translate(0, 0) rotate(0deg)';
    card.style.opacity = '1';
}

// Function to animate and move to next card
function moveToNextCard(translateX, translateY, rotate) {
    const card = document.getElementById('vocab-card');

    // Animate card out
    card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
    card.style.opacity = '0';

    // Increment swipe count and update storage
    swipeCount++;
    localStorage.setItem('swipeCount', swipeCount);
    updateSwipeCounter();

    // Move to next card after animation
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % vocabData.length;
        displayRandomCard();
        card.style.transition = 'none'; // Reset transition for next card
    }, 500);
}

// Touch handling for drag and swipe
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let touchStartTime = 0;
const minSwipeDistance = 50; // Minimum distance for a swipe (pixels)
const maxTapDistance = 10; // Maximum distance for a tap (pixels)
const maxTapDuration = 300; // Maximum duration for a tap (milliseconds)

const card = document.getElementById('vocab-card');

card.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { // Ensure single touch
        e.preventDefault(); // Prevent default behaviors
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        touchStartTime = Date.now();
        card.style.transition = 'none'; // Smooth drag
    }
});

card.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        e.preventDefault();
        touchCurrentX = e.changedTouches[0].screenX;
        touchCurrentY = e.changedTouches[0].screenY;
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;
        const rotate = (deltaX / window.innerWidth) * 30; // Rotate based on drag distance
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
    }
});

card.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const touchDuration = Date.now() - touchStartTime;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if it's a tap
    if (distance <= maxTapDistance && touchDuration <= maxTapDuration) {
        const audio = document.getElementById('card-audio');
        audio.play().catch(error => console.error('Error playing audio:', error));
        card.style.transform = 'translate(0, 0) rotate(0deg)'; // Reset position
    } else if (distance > minSwipeDistance) {
        // Calculate swipe direction and animate out
        const angle = Math.atan2(deltaY, deltaX); // Angle in radians
        const magnitude = distance * 5; // Amplify distance for animation
        const translateX = Math.cos(angle) * magnitude;
        const translateY = Math.sin(angle) * magnitude;
        const rotate = (deltaX / window.innerWidth) * 30; // Keep rotation consistent
        moveToNextCard(translateX, translateY, rotate);
    } else {
        // Not enough distance for swipe, reset position
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'translate(0, 0) rotate(0deg)';
    }
});

// Click event for desktop compatibility
card.addEventListener('click', (e) => {
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
            moveToNextCard(-window.innerWidth, 0, -15);
            break;
        case 'ArrowRight':
            moveToNextCard(window.innerWidth, 0, 15);
            break;
        case 'ArrowUp':
            moveToNextCard(0, -window.innerHeight, -10);
            break;
        case 'ArrowDown':
            moveToNextCard(0, window.innerHeight, 10);
            break;
    }
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadVocabData);
