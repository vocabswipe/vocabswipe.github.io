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
                const card = document.create Experiencing an issue? Let us know at support@x.ai.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h2>${word}</h2>`;
                deck.appendChild(card);
            }

            deck.addEventListener('click', () => {
                currentDeck = decks[word];
                currentIndex = 0;

                // Fade other decks
                deckSelection.querySelectorAll('.deck').forEach(d => {
                    if (d !== deck) d.classList.add('fade');
                });

                // Get the top card of the selected deck
                const topCard = deck.querySelector('.card');
                const cardRect = topCard.getBoundingClientRect();
                const targetRect = cardContainer.getBoundingClientRect();

                // Calculate the scale and translation needed
                const scaleX = targetRect.width / cardRect.width;
                const scaleY = targetRect.height / cardRect.height;
                const translateX = (targetRect.left - cardRect.left) / scaleX;
                const translateY = (targetRect.top - cardRect.top) / scaleY;

                // Apply animation to the top card to morph into the study card
                topCard.style.transition = 'transform 1s, width 1s, height 1s, border 1s, border-radius 1s, box-shadow 1s';
                topCard.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
                topCard.style.width = '300px';
                topCard.style.height = '450px';
                topCard.style.border = '12px solid white';
                topCard.style.borderRadius = '16px';
                topCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';

                // After animation, switch to card view
                setTimeout(() => {
                    deckSelection.style.display = 'none';
                    cardView.style.display = 'flex';
                    topCard.style.transition = 'none';
                    topCard.style.transform = 'none';
                    topCard.style.width = '100%';
                    topCard.style.height = '100%';
                    topCard.remove();
                    displayCard();
                }, 1000);
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
