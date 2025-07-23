// Fetch and parse the database
async function loadDatabase() {
    try {
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        const lines = text.trim().split('\n');
        return lines.map(line => JSON.parse(line));
    } catch (error) {
        console.error('Error loading database:', error);
        return [];
    }
}

// Shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Random UNO card color
function getRandomUnoColor() {
    const colors = ['#ff4d4d', '#4d79ff', '#4dff4d', '#ffff4d']; // Red, Blue, Green, Yellow
    return colors[Math.floor(Math.random() * colors.length)];
}

// Create card HTML
function createCard(entry, isBack = false) {
    const card = document.createElement('div');
    card.classList.add('card');
    if (isBack) card.classList.add('back');
    card.style.backgroundColor = getRandomUnoColor();

    const content = document.createElement('div');
    content.classList.add('card-content');

    if (isBack) {
        const word = document.createElement('div');
        word.classList.add('word');
        word.textContent = entry.word;

        const english = document.createElement('div');
        english.classList.add('english');
        english.textContent = entry.english;

        const thai = document.createElement('div');
        thai.classList.add('thai');
        thai.textContent = entry.thai;

        content.appendChild(word);
        content.appendChild(english);
        content.appendChild(thai);

        card.dataset.audio = entry.audio;
    } else {
        content.textContent = entry.word;
    }

    card.appendChild(content);
    return card;
}

// Main application logic
async function init() {
    const data = await loadDatabase();
    const cardGrid = document.getElementById('card-grid');
    const cardStack = document.getElementById('card-stack');

    // Get unique words
    const uniqueWords = [...new Set(data.map(entry => entry.word))];
    const shuffledWords = shuffle(uniqueWords);

    // Display front cards
    shuffledWords.forEach(word => {
        const entry = data.find(e => e.word === word);
        const card = createCard(entry);
        card.dataset.word = word;
        cardGrid.appendChild(card);

        card.addEventListener('click', () => selectCard(word, data));
    });

    // Adjust grid layout
    adjustGridLayout();

    // Handle window resize
    window.addEventListener('resize', adjustGridLayout);
    // Handle keyboard events
    document.addEventListener('keydown', handleKeydown);
}

// Adjust grid layout based on viewport
function adjustGridLayout() {
    const cardGrid = document.getElementById('card-grid');
    const cards = cardGrid.querySelectorAll('.card');
    const vw = window.innerWidth;
    const cardWidth = window.innerWidth <= 600 ? 100 : 120;
    const cols = Math.floor(vw / (cardWidth + 10)); // Account for gap
    const rows = Math.ceil(cards.length / cols);

    cardGrid.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth}px)`;
    cardGrid.style.gridTemplateRows = `repeat(${rows}, ${cardWidth * 1.5 + 10}px)`;
    cardGrid.style.height = 'auto'; // Allow scrolling
}

// Handle card selection
function selectCard(word, data) {
    const cardGrid = document.getElementById('card-grid');
    const cardStack = document.getElementById('card-stack');
    const selectedCard = cardGrid.querySelector(`.card[data-word="${word}"]`);

    // Calculate target width (90% of viewport width for mobile, maintaining aspect ratio)
    const targetWidth = window.innerWidth <= 600 ? window.innerWidth * 0.9 : 240;
    const targetHeight = targetWidth * 1.5; // Maintain 2:3 aspect ratio

    // Fade out other cards
    cardGrid.querySelectorAll('.card').forEach(card => {
        if (card.dataset.word !== word) {
            card.style.opacity = '0';
        } else {
            // Animate selected card
            card.style.transition = 'transform 0.5s ease, width 0.5s ease, height 0.5s ease';
            card.style.width = `${targetWidth}px`;
            card.style.height = `${targetHeight}px`;
            card.style.transform = `translate(${window.innerWidth / 2 - selectedCard.offsetLeft - selectedCard.offsetWidth / 2}px, ${window.innerHeight / 2 - selectedCard.offsetTop - selectedCard.offsetHeight / 2}px)`;

            setTimeout(() => {
                cardGrid.classList.add('hidden');
                cardStack.classList.remove('hidden');
                document.body.style.overflow = window.innerWidth <= 600 ? 'hidden' : 'auto'; // Lock scroll on mobile
                displayCardStack(word, data);
            }, 500);
        }
    });
}

// Display card stack
function displayCardStack(word, data) {
    const cardStack = document.getElementById('card-stack');
    cardStack.innerHTML = '';

    // Filter and shuffle cards for the selected word
    const wordEntries = shuffle(data.filter(entry => entry.word === word));
    let currentIndex = 0;

    // Create stack
    wordEntries.forEach((entry, index) => {
        const card = createCard(entry, true);
        card.classList.add(index === 0 ? 'active' : 'next');
        cardStack.appendChild(card);

        // Handle tap to play audio
        card.addEventListener('click', () => {
            const audio = new Audio(`data/${entry.audio}`);
            audio.play();
        });

        // Handle swipe
        handleSwipe(card, index, wordEntries);
    });

    // Flip first card
    setTimeout(() => {
        cardStack.querySelector('.card.active').classList.add('flipped');
    }, 100);
}

// Handle swipe gestures
function handleSwipe(card, index, wordEntries) {
    let touchStartX = 0, touchStartY = 0;
    let touchEndX = 0, touchEndY = 0;

    card.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        e.preventDefault();
    });

    card.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();
        e.preventDefault();
    });

    function handleGesture() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            // Horizontal swipe
            card.classList.add(deltaX > 0 ? 'swiped-right' : 'swiped-left');
            swipeCard(index, wordEntries);
        } else if (Math.abs(deltaY) > minSwipeDistance) {
            // Vertical swipe
            card.classList.add(deltaY > 0 ? 'swiped-down' : 'swiped-up');
            swipeCard(index, wordEntries);
        }
    }
}

// Handle keyboard events
function handleKeydown(e) {
    const cardStack = document.getElementById('card-stack');
    if (cardStack.classList.contains('hidden')) return;

    const activeCard = cardStack.querySelector('.card.active');
    if (!activeCard) return;

    if (e.key === ' ') {
        const audio = new Audio(`data/${activeCard.dataset.audio}`);
        audio.play();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const index = Array.from(cardStack.children).indexOf(activeCard);
        activeCard.classList.add(`swiped-${e.key.toLowerCase().replace('arrow', '')}`);
        swipeCard(index, JSON.parse(JSON.stringify(Array.from(cardStack.children).map(c => ({
            word: c.querySelector('.word').textContent,
            english: c.querySelector('.english').textContent,
            thai: c.querySelector('.thai').textContent,
            audio: c.dataset.audio
        })))));
    }
}

// Swipe card logic
function swipeCard(index, wordEntries) {
    const cardStack = document.getElementById('card-stack');
    const activeCard = cardStack.querySelector('.card.active');
    activeCard.classList.remove('active');
    activeCard.classList.add('swiped');

    setTimeout(() => {
        activeCard.remove();
        const nextIndex = (index + 1) % wordEntries.length;
        const nextCard = createCard(wordEntries[nextIndex], true);
        nextCard.classList.add('active', 'flipped');
        cardStack.appendChild(nextCard);

        // Reattach swipe handlers
        handleSwipe(nextCard, nextIndex, wordEntries);

        // Add next card in stack
        const futureIndex = (nextIndex + 1) % wordEntries.length;
        const futureCard = createCard(wordEntries[futureIndex], true);
        futureCard.classList.add('next');
        cardStack.appendChild(futureCard);
        handleSwipe(futureCard, futureIndex, wordEntries);
    }, 300);
}

// Initialize the app
init();
