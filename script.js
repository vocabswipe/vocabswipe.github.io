// Array to hold vocabulary entries
let vocabData = [];

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
        displayCards();
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

// Function to display the current and next card
function displayCards() {
    if (vocabData.length === 0) return;

    // Current card
    const currentCard = document.getElementById('vocab-card');
    const wordTopElement = document.getElementById('word-top');
    const wordBottomElement = document.getElementById('word-bottom');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    // Next card
    const nextCard = document.getElementById('next-card');
    const nextWordTopElement = document.getElementById('next-word-top');
    const nextWordBottomElement = document.getElementById('next-word-bottom');
    const nextEnglishElement = document.getElementById('next-english');
    const nextThaiElement = document.getElementById('next-thai');

    // Update current card content
    if (currentIndex < vocabData.length) {
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordBottomElement.textContent = entry.word;
        englishElement.textContent = entry.english;
        thaiElement.textContent = entry.thai;
        audioElement.src = `data/${entry.audio}`;

        // Set text color to black
        wordTopElement.style.color = '#000000';
        wordBottomElement.style.color = '#000000';
        englishElement.style.color = '#000000';
        thaiElement.style.color = '#000000';

        // Set card background to white
        currentCard.style.backgroundColor = '#ffffff';
        // Reset card position and opacity
        currentCard.style.transform = 'translate(0, 0) rotate(0deg)';
        currentCard.style.opacity = '1';
    }

    // Update next card content
    if (currentIndex + 1 < vocabData.length) {
        const nextEntry = vocabData[currentIndex + 1];
        nextWordTopElement.textContent = nextEntry.word;
        nextWordBottomElement.textContent = nextEntry.word;
        nextEnglishElement.textContent = nextEntry.english;
        nextThaiElement.textContent = nextEntry.thai;

        // Set text color to black for next card
        nextWordTopElement.style.color = '#000000';
        nextWordBottomElement.style.color = '#000000';
        nextEnglishElement.style.color = '#000000';
        nextThaiElement.style.color = '#000000';

        // Set next card background to white
        nextCard.style.backgroundColor = '#ffffff';
        // Position next card slightly offset
        nextCard.style.transform = 'translate(2px, 2px) rotate(0.5deg)';
        nextCard.style.opacity = '1';
        nextCard.style.zIndex = '9'; // Below top card but above stack
    } else {
        // Hide next card if no more cards
        nextCard.style.opacity = '0';
    }
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
        displayCards();
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

// Share icon functionality
document.getElementById('share-icon').addEventListener('click', () => {
    captureSnapshot();
});

// Function to capture snapshot of card deck
function captureSnapshot() {
    const cardContainer = document.getElementById('card-container');
    const canvas = document.getElementById('snapshot-canvas');
    const ctx = canvas.getContext('2d');

    // Instagram Reels aspect ratio (9:16, 1080x1920 for 1080p)
    canvas.width = 1080;
    canvas.height = 1920;

    // Fill background with poker table green
    ctx.fillStyle = '#35654d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling and positioning to center the card deck
    const cardWidth = cardContainer.offsetWidth;
    const cardHeight = cardContainer.offsetHeight;
    const scale = Math.min((canvas.width * 0.8) / cardWidth, (canvas.height * 0.6) / cardHeight); // Fit within 80% width, 60% height
    const scaledWidth = cardWidth * scale;
    const scaledHeight = cardHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    // Use html2canvas to capture the card container
    html2canvas(cardContainer, {
        backgroundColor: null, // Transparent background
        scale: scale
    }).then(cardCanvas => {
        // Draw card deck on canvas
        ctx.drawImage(cardCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

        // Add website URL and slogan
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VocabSwipe.com', canvas.width / 2, offsetY + scaledHeight + 60);
        ctx.font = 'bold 30px Arial';
        ctx.fillText('Master Words, Swipe by Swipe', canvas.width / 2, offsetY + scaledHeight + 100);

        // Convert canvas to PNG and trigger share
        canvas.toBlob(blob => {
            const file = new File([blob], 'vocabswipe-card.png', { type: 'image/png' });
            const shareData = {
                files: [file],
                title: 'Check out my VocabSwipe card!',
                text: 'Master words with VocabSwipe! Try it at VocabSwipe.com',
                url: 'https://VocabSwipe.com'
            };

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share(shareData).catch(error => console.error('Error sharing:', error));
            } else {
                // Fallback: Download the image
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'vocabswipe-card.png';
                link.click();
                URL.revokeObjectURL(link.href);
                alert('Sharing not supported. Image downloaded instead.');
            }
        }, 'image/png');
    });
}

// Load data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadVocabData();
    // Load html2canvas dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);
});
