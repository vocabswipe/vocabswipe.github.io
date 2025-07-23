document.addEventListener('DOMContentLoaded', () => {
    const deckSelection = document.getElementById('deck-selection');
    const cardView = document.getElementById('card-view');
    const cardContainer = document.getElementById('card-container');
    const cardElement = document.getElementById('card');
    const cardFront = document.querySelector('.card-front');
    const cardBack = document.querySelector('.card-back');
    const deckInfo = document.getElementById('deck-info');
    const deckSize = document.getElementById('deck-size');

    let decks = {};
    let currentDeck = [];
    let currentCardIndex = 0;

    // Fetch and parse the database.jsonl file
    fetch('data/database.jsonl')
        .then(response => response.text())
        .then(data => {
            const lines = data.trim().split('\n');
            lines.forEach(line => {
                const entry = JSON.parse(line);
                if (!decks[entry.word]) {
                    decks[entry.word] = [];
                }
                decks[entry.word].push(entry);
            });

            // Shuffle each deck
            Object.keys(decks).forEach(word => {
                decks[word] = shuffle(decks[word]);
            });

            // Display all decks
            displayDecks();
        })
        .catch(error => console.error('Error loading database:', error));

    // Shuffle array function
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Display all card decks
    function displayDecks() {
        deckSelection.innerHTML = '';
        Object.keys(decks).forEach(word => {
            const deckElement = document.createElement('div');
            deckElement.classList.add('deck');
            const cardCount = decks[word].length;
            const maxVisibleCards = Math.min(cardCount, 5); // Show up to 5 cards for thickness

            for (let i = 0; i < maxVisibleCards; i++) {
                const deckCard = document.createElement('div');
                deckCard.classList.add('deck-card');
                deckCard.textContent = word;
                deckElement.appendChild(deckCard);
            }

            deckElement.addEventListener('click', () => selectDeck(word));
            deckSelection.appendChild(deckElement);
        });
    }

    // Select a deck and transition to card view
    function selectDeck(word) {
        currentDeck = decks[word];
        currentCardIndex = 0;
        deckSelection.querySelectorAll('.deck').forEach(deck => {
            if (deck.firstChild.textContent !== word) {
                deck.style.opacity = '0';
            } else {
                deck.style.transform = 'scale(1.5) translate(-50%, -50%)';
                deck.style.position = 'fixed';
                deck.style.left = '50%';
                deck.style.top = '50%';
            }
        });

        setTimeout(() => {
            deckSelection.classList.add('hidden');
            cardView.classList.add('active');
            displayCard();
        }, 500);
    }

    // Display the current card
    function displayCard() {
        if (currentDeck.length === 0) return;
        const card = currentDeck[currentCardIndex];
        cardFront.textContent = card.word;
        cardBack.innerHTML = `
            <div>${card.word}</div>
            <div>${card.english}</div>
            <div>${card.thai}</div>
        `;
        deckSize.textContent = currentDeck.length;
        deckInfo.textContent = `Card ${currentCardIndex + 1} of ${currentDeck.length}`;
        cardElement.classList.remove('flipped');
    }

    // Handle card interactions
    let touchStartX, touchStartY;
    cardContainer.addEventListener('click', () => {
        // Play audio on single tap
        const card = currentDeck[currentCardIndex];
        const audio = new Audio(`audio/${card.audio.split('/')[1]}`);
        audio.play().catch(error => console.error('Error playing audio:', error));
    });

    cardContainer.addEventListener('dblclick', () => {
        // Flip card on double tap
        cardElement.classList.toggle('flipped');
    });

    cardContainer.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    cardContainer.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
            // Swipe detected
            if (currentCardIndex < currentDeck.length - 1) {
                currentCardIndex++;
            } else {
                currentCardIndex = 0; // Loop back to start
            }
            displayCard();
        }
    });
});
