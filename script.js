document.addEventListener('DOMContentLoaded', () => {
    const deckSelection = document.getElementById('deck-selection');
    const cardView = document.getElementById('card-view');
    const cardContainer = document.getElementById('card-container');
    const cardWord = document.getElementById('card-word');
    const cardWordBack = document.getElementById('card-word-back');
    const cardEnglish = document.getElementById('card-english');
    const cardThai = document.getElementById('card-thai');
    const cardAudio = document.getElementById('card-audio');
    let currentDeck = [];
    let currentIndex = 0;

    // Fetch and process database
    fetch('data/database.jsonl')
        .then(response => response.text())
        .then(data => {
            const entries = data.trim().split('\n').map(line => JSON.parse(line));
            const decks = groupByWord(entries);
            displayDecks(decks);
        })
        .catch(error => console.error('Error loading database:', error));

    function groupByWord(entries) {
        const decks = {};
        entries.forEach(entry => {
            if (!decks[entry.word]) {
                decks[entry.word] = [];
            }
            decks[entry.word].push(entry);
        });
        // Shuffle each deck
        Object.values(decks).forEach(deck => {
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
        });
        return decks;
    }

    function displayDecks(decks) {
        Object.keys(decks).forEach(word => {
            const deck = document.createElement('div');
            deck.className = 'deck';
            const cardCount = decks[word].length;
            const maxVisible = Math.min(cardCount, 3); // Show up to 3 cards for thickness

            for (let i = 0; i < maxVisible; i++) {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h2>${word}</h2>`;
                deck.appendChild(card);
            }

            deck.addEventListener('click', () => {
                currentDeck = decks[word];
                currentIndex = 0;
                deckSelection.querySelectorAll('.deck').forEach(d => {
                    if (d !== deck) d.classList.add('fade');
                });
                deck.style.transition = 'transform 0.5s, opacity 0.5s';
                deck.style.transform = 'scale(2) translate(-50%, -50%)';
                deck.style.position = 'fixed';
                deck.style.left = '50%';
                deck.style.top = '50%';
                setTimeout(() => {
                    deckSelection.style.display = 'none';
                    cardView.style.display = 'flex';
                    displayCard();
                }, 500);
            });
            deckSelection.appendChild(deck);
        });
    }

    function displayCard() {
        if (currentIndex >= currentDeck.length) currentIndex = 0;
        const entry = currentDeck[currentIndex];
        cardWord.textContent = entry.word;
        cardWordBack.textContent = entry.word;
        cardEnglish.textContent = entry.english;
        cardThai.textContent = entry.thai;
        cardAudio.src = `data/${entry.audio}`;
        cardContainer.querySelector('.card').classList.remove('flipped');
    }

    // Card interactions
    cardContainer.addEventListener('click', () => {
        cardAudio.play();
    });

    cardContainer.addEventListener('dblclick', () => {
        cardContainer.querySelector('.card').classList.toggle('flipped');
    });

    cardContainer.addEventListener('touchstart', handleTouchStart, false);
    cardContainer.addEventListener('touchmove', handleTouchMove, false);
    cardContainer.addEventListener('touchend', handleTouchEnd, false);

    let xDown = null;
    let yDown = null;

    function handleTouchStart(evt) {
        const firstTouch = evt.touches[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    }

    function handleTouchMove(evt) {
        if (!xDown || !yDown) return;
        const xUp = evt.touches[0].clientX;
        const yUp = evt.touches[0].clientY;
        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                // Swipe left
                currentIndex++;
                displayCard();
            } else {
                // Swipe right
                currentIndex++;
                displayCard();
            }
        } else {
            if (yDiff > 0) {
                // Swipe up
                currentIndex++;
                displayCard();
            } else {
                // Swipe down
                currentIndex++;
                displayCard();
            }
        }
        xDown = null;
        yDown = null;
    }

    function handleTouchEnd(evt) {
        xDown = null;
        yDown = null;
    }
});
