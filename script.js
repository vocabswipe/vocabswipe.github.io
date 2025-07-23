document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('card');
    const cardFront = card.querySelector('.card-front');
    const cardBack = card.querySelector('.card-back');
    const audio = document.getElementById('card-audio');
    let isFlipped = false;
    let cardsData = [];
    let currentCard = null;

    // Fetch and parse database.jsonl
    async function loadCards() {
        try {
            const response = await fetch('data/database.jsonl');
            const text = await response.text();
            cardsData = text.trim().split('\n').map(line => JSON.parse(line));
            loadRandomCard();
        } catch (error) {
            console.error('Error loading database:', error);
        }
    }

    // Load a random card
    function loadRandomCard() {
        if (cardsData.length === 0) return;
        currentCard = cardsData[Math.floor(Math.random() * cardsData.length)];
        cardFront.querySelector('.word').textContent = currentCard.word;
        cardBack.querySelector('.word').textContent = currentCard.word;
        cardBack.querySelector('.english').textContent = currentCard.english;
        cardBack.querySelector('.thai').textContent = currentCard.thai;
        audio.src = `data/${currentCard.audio}`;
        card.classList.remove('flipped', 'swipe-left', 'swipe-right', 'swipe-up', 'swipe-down');
        isFlipped = false;
    }

    // Flip card on double tap/click
    function flipCard() {
        isFlipped = !isFlipped;
        card.classList.toggle('flipped', isFlipped);
    }

    // Play audio on single tap/click when flipped
    function playAudio() {
        if (isFlipped) {
            audio.play().catch(error => console.error('Error playing audio:', error));
        }
    }

    // Swipe card with animation
    function swipeCard(direction) {
        card.classList.add(`swipe-${direction}`);
        setTimeout(() => {
            loadRandomCard();
        }, 300);
    }

    // Handle touch events for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCount = 0;
    let touchTimer = null;

    card.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchCount++;
        if (touchCount === 1) {
            touchTimer = setTimeout(() => {
                playAudio();
                touchCount = 0;
            }, 300);
        } else if (touchCount === 2) {
            clearTimeout(touchTimer);
            flipCard();
            touchCount = 0;
        }
    });

    card.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                swipeCard(deltaX > 0 ? 'right' : 'left');
            } else {
                swipeCard(deltaY > 0 ? 'down' : 'up');
            }
            touchCount = 0;
            clearTimeout(touchTimer);
        }
    });

    // Handle keyboard events for PC
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (isFlipped) {
                playAudio();
            } else {
                flipCard();
            }
        } else if (e.key === 'ArrowLeft') {
            swipeCard('left');
        } else if (e.key === 'ArrowRight') {
            swipeCard('right');
        } else if (e.key === 'ArrowUp') {
            swipeCard('up');
        } else if (e.key === 'ArrowDown') {
            swipeCard('down');
        }
    });

    // Initialize
    loadCards();
});
